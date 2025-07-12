import {
  HtmlParsingResult,
  MarketplaceItem,
  MarketplaceSearchParams,
  ParsedAd,
  ScrapingConfig,
} from "@repo/types";
import { writeFileSync } from "fs";
import { join } from "path";
import puppeteer, { Browser, Page } from "puppeteer";
import { HtmlParser } from "./html-parser.js";

export class MarketplaceScraper {
  private browser: Browser | null = null;
  private baseUrl: string;
  private htmlParser: HtmlParser;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.htmlParser = new HtmlParser(baseUrl);
  }

  async init(headless: boolean = true): Promise<void> {
    this.browser = await puppeteer.launch({
      headless,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  buildSearchUrl(params: MarketplaceSearchParams): string {
    const url = new URL(
      `${this.baseUrl}/konzole-i-igrice/sony-playstation-igrice/pretraga`
    );

    url.searchParams.set("keywords", params.keywords);
    if (params.categoryId)
      url.searchParams.set("categoryId", params.categoryId);
    if (params.groupId) url.searchParams.set("groupId", params.groupId);
    if (params.hasPrice) url.searchParams.set("hasPrice", "yes");
    if (params.order) url.searchParams.set("order", params.order);
    if (params.location) url.searchParams.set("location", params.location);
    if (params.minPrice)
      url.searchParams.set("minPrice", params.minPrice.toString());
    if (params.maxPrice)
      url.searchParams.set("maxPrice", params.maxPrice.toString());

    url.searchParams.set("ignoreUserId", "no");

    return url.toString();
  }

  async downloadMarketplaceHTML(
    searchParams: MarketplaceSearchParams,
    config?: Partial<ScrapingConfig>
  ): Promise<{
    filePaths: string[];
    totalPages: number;
    baseTimestamp: string;
  }> {
    if (!this.browser) {
      throw new Error("Browser not initialized. Call init() first.");
    }

    const page = await this.browser.newPage();
    const filePaths: string[] = [];
    let totalPages = 1;
    const baseTimestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const keywords = searchParams.keywords.replace(/[^a-zA-Z0-9]/g, "_");

    try {
      // Set user agent to avoid detection
      await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      );

      // First, visit page 1 to detect total page count
      const baseUrl = this.buildSearchUrl(searchParams);
      console.log(`Detecting page count from: ${baseUrl}`);

      await page.goto(baseUrl, { waitUntil: "networkidle2" });
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Extract total page count from pagination
      totalPages = await page.evaluate(() => {
        // Look for pagination elements
        const paginationLinks = document.querySelectorAll('a[href*="page="]');
        let maxPage = 1;

        paginationLinks.forEach((link) => {
          const href = link.getAttribute("href");
          if (href) {
            const pageMatch = href.match(/page=(\d+)/);
            if (pageMatch && pageMatch[1]) {
              const pageNum = parseInt(pageMatch[1]);
              if (pageNum > maxPage) {
                maxPage = pageNum;
              }
            }
          }
        });

        // Also check for pagination buttons or text
        const paginationText = document.querySelector(
          '.pagination, [class*="pagination"], [class*="page"]'
        );
        if (paginationText) {
          const text = paginationText.textContent || "";
          const pageMatches = text.match(/(\d+)/g);
          if (pageMatches) {
            const numbers = pageMatches
              .map((n) => parseInt(n))
              .filter((n) => n > 0);
            const potentialMaxPage = Math.max(...numbers);
            if (potentialMaxPage > maxPage && potentialMaxPage <= 100) {
              // reasonable limit
              maxPage = potentialMaxPage;
            }
          }
        }

        return maxPage;
      });

      // Apply page limit from config or environment variable
      const maxPagesToScrape =
        config?.maxPages || parseInt(process.env.MAX_PAGES || "5");
      const originalTotalPages = totalPages;
      totalPages = Math.min(totalPages, maxPagesToScrape);

      console.log(`Found ${originalTotalPages} pages total`);
      if (originalTotalPages > maxPagesToScrape) {
        console.log(
          `Limiting to ${totalPages} pages (MAX_PAGES=${maxPagesToScrape})`
        );
      } else {
        console.log(`Will scrape all ${totalPages} pages`);
      }

      console.log(`Found ${totalPages} pages to scrape`);

      // Download each page
      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        console.log(`Downloading page ${pageNum}/${totalPages}...`);

        // Build URL with page parameter
        const pageUrl = `${baseUrl}&page=${pageNum}`;

        await page.goto(pageUrl, { waitUntil: "networkidle2" });
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Scroll to load more results if needed
        if (config?.puppeteerOptions?.scrollToBottom) {
          await this.scrollToBottom(page);
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }

        // Get the full HTML content
        const htmlContent = await page.content();

        // Generate filename with page number
        const filename = `${baseTimestamp}_marketplace_${keywords}_page_${pageNum}.html`;
        const filepath = join(process.cwd(), "data", filename);

        // Save HTML to file
        writeFileSync(filepath, htmlContent, "utf8");
        filePaths.push(filepath);

        console.log(`Page ${pageNum} saved: ${filepath}`);
        console.log(`File size: ${(htmlContent.length / 1024).toFixed(2)} KB`);

        // Add delay between pages to avoid rate limiting
        if (pageNum < totalPages) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
    } catch (error) {
      console.error("Error downloading marketplace HTML pages:", error);
      throw error;
    } finally {
      await page.close();
    }

    console.log(`Successfully downloaded ${filePaths.length} pages`);
    return { filePaths, totalPages, baseTimestamp };
  }

  async downloadAndParseMarketplace(
    searchParams: MarketplaceSearchParams,
    config?: Partial<ScrapingConfig>
  ): Promise<HtmlParsingResult> {
    const scrapingStartTime = new Date();

    // Download all HTML pages and get the file paths
    const downloadResult = await this.downloadMarketplaceHTML(
      searchParams,
      config
    );
    const { filePaths, totalPages, baseTimestamp } = downloadResult;

    const scrapingEndTime = new Date();

    // Parse all HTML files and combine ads
    console.log(`Parsing ${filePaths.length} HTML files...`);
    let allAds: ParsedAd[] = [];
    let totalAdsFound = 0;
    let totalParsingTime = 0;
    let totalHtmlSize = 0;
    const pageResults: { page: number; ads: number; fileName: string }[] = [];

    for (let i = 0; i < filePaths.length; i++) {
      const filePath = filePaths[i];
      if (!filePath) {
        console.warn(`Skipping undefined file path at index ${i}`);
        continue;
      }

      const pageNum = i + 1;

      console.log(`Parsing page ${pageNum}/${filePaths.length}: ${filePath}`);

      // Get HTML file size
      const fs = await import("fs");
      const htmlStats = fs.statSync(filePath);
      totalHtmlSize += htmlStats.size;

      // Parse this page
      const pageParsingResult = await this.htmlParser.parseHtmlFile(filePath);

      allAds = allAds.concat(pageParsingResult.extractedAds);
      totalAdsFound += pageParsingResult.stats.totalAdsFound;
      totalParsingTime += pageParsingResult.stats.parsingTimeMs;

      pageResults.push({
        page: pageNum,
        ads: pageParsingResult.stats.successfullyParsed,
        fileName: filePath.split("/").pop() || filePath,
      });

      console.log(
        `Page ${pageNum}: Found ${pageParsingResult.stats.successfullyParsed} ads`
      );
    }

    // Build the search URL for metadata
    const searchUrl = this.buildSearchUrl(searchParams);

    // Create combined parsing result
    const combinedResult: HtmlParsingResult = {
      success: true,
      extractedAds: allAds,
      errors: [],
      warnings: [],
      stats: {
        totalAdsFound,
        successfullyParsed: allAds.length,
        failedToParse: totalAdsFound - allAds.length,
        parsingTimeMs: totalParsingTime,
        htmlSizeKb: Math.round(totalHtmlSize / 1024),
      },
    };

    // Save the combined ads to JSON with comprehensive metadata
    if (allAds.length > 0) {
      // Create JSON filename using the base timestamp
      const keywords = searchParams.keywords.replace(/[^a-zA-Z0-9]/g, "_");
      const jsonFilePath = join(
        process.cwd(),
        "data",
        `${baseTimestamp}_marketplace_${keywords}_combined.json`
      );

      const scrapingMetadata = {
        searchParams,
        searchUrl,
        htmlFilePaths: filePaths,
        totalPages,
        pageResults,
        totalHtmlSize,
        scrapingStartTime,
        scrapingEndTime,
      };

      await this.htmlParser.saveAdsToJson(
        allAds,
        jsonFilePath,
        scrapingMetadata
      );
      console.log(
        `Saved ${allAds.length} ads from ${totalPages} pages to JSON with comprehensive metadata`
      );
    }

    return combinedResult;
  }

  private async scrollToBottom(page: Page): Promise<void> {
    await page.evaluate(async () => {
      await new Promise<void>((resolve) => {
        let totalHeight = 0;
        const distance = 100;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;

          if (totalHeight >= scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 100);
      });
    });
  }

  async scrapeItemDetails(itemUrl: string): Promise<Partial<MarketplaceItem>> {
    if (!this.browser) {
      throw new Error("Browser not initialized. Call init() first.");
    }

    const page = await this.browser.newPage();
    const details: Partial<MarketplaceItem> = {};

    try {
      await page.goto(itemUrl, { waitUntil: "networkidle2" });

      // Extract detailed information
      const itemDetails = await page.evaluate(() => {
        const description = document
          .querySelector(".AdDetails-description")
          ?.textContent?.trim();
        const images = Array.from(
          document.querySelectorAll(".AdDetails-image img")
        )
          .map((img) => img.getAttribute("src"))
          .filter(Boolean);

        return {
          description,
          images: images as string[],
        };
      });

      details.description = itemDetails.description;
      details.images = itemDetails.images;
    } catch (error) {
      console.error("Error scraping item details:", error);
    } finally {
      await page.close();
    }

    return details;
  }
}

// Helper function to create search parameters for PlayStation games
export function createPlayStationSearchParams(
  keywords: string,
  options: Partial<MarketplaceSearchParams> = {}
): MarketplaceSearchParams {
  return {
    keywords,
    categoryId: "1036", // PlayStation games category
    groupId: "1039", // PlayStation group
    hasPrice: true,
    order: "price",
    ...options,
  };
}
