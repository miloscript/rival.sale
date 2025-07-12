import {
  MarketplaceItem,
  MarketplaceSearchParams,
  ScrapingConfig,
} from "@repo/types";
import { writeFileSync } from "fs";
import { join } from "path";
import puppeteer, { Browser, Page } from "puppeteer";

export class MarketplaceScraper {
  private browser: Browser | null = null;
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
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
  ): Promise<string> {
    if (!this.browser) {
      throw new Error("Browser not initialized. Call init() first.");
    }

    const page = await this.browser.newPage();
    let htmlContent = "";

    try {
      // Set user agent to avoid detection
      await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
      );

      const searchUrl = this.buildSearchUrl(searchParams);
      console.log(`Downloading HTML from: ${searchUrl}`);

      // Navigate to the search page
      await page.goto(searchUrl, { waitUntil: "networkidle2" });

      // Wait a bit for dynamic content to load
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Scroll to load more results if needed
      if (config?.puppeteerOptions?.scrollToBottom) {
        await this.scrollToBottom(page);
        // Wait a bit more after scrolling
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      // Get the full HTML content
      htmlContent = await page.content();

      // Generate filename with timestamp and search params
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const keywords = searchParams.keywords.replace(/[^a-zA-Z0-9]/g, "_");
      const filename = `marketplace_${keywords}_${timestamp}.html`;
      const filepath = join(process.cwd(), "data", filename);

      // Save HTML to file
      writeFileSync(filepath, htmlContent, "utf8");

      console.log(`HTML content saved to: ${filepath}`);
      console.log(`File size: ${(htmlContent.length / 1024).toFixed(2)} KB`);
    } catch (error) {
      console.error("Error downloading marketplace HTML:", error);
      throw error;
    } finally {
      await page.close();
    }

    return htmlContent;
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
