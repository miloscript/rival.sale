import {
  MarketplaceItem,
  MarketplaceSearchParams,
  ScrapingConfig,
} from "@repo/types";
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

  async scrapeMarketplace(
    searchParams: MarketplaceSearchParams,
    config?: Partial<ScrapingConfig>
  ): Promise<MarketplaceItem[]> {
    if (!this.browser) {
      throw new Error("Browser not initialized. Call init() first.");
    }

    const page = await this.browser.newPage();
    const items: MarketplaceItem[] = [];

    try {
      // Set user agent to avoid detection
      await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
      );

      const searchUrl = this.buildSearchUrl(searchParams);
      console.log(`Scraping marketplace: ${searchUrl}`);

      // Navigate to the search page
      await page.goto(searchUrl, { waitUntil: "networkidle2" });

      // Wait for the search results to load
      await page
        .waitForSelector(".AdItem", { timeout: config?.timeout || 10000 })
        .catch(() => {
          console.log("No search results found or page structure changed");
        });

      // Scroll to load more results if needed
      if (config?.puppeteerOptions?.scrollToBottom) {
        await this.scrollToBottom(page);
      }

      // Extract items from the page
      const scrapedItems = await page.evaluate(() => {
        const itemElements = document.querySelectorAll(".AdItem");
        const items: any[] = [];

        itemElements.forEach((element) => {
          try {
            const titleElement = element.querySelector(".AdItem-title a");
            const priceElement = element.querySelector(".AdItem-price");
            const locationElement = element.querySelector(".AdItem-location");
            const sellerElement = element.querySelector(".AdItem-seller");
            const linkElement = element.querySelector(".AdItem-title a");

            if (titleElement && priceElement) {
              const item = {
                title: titleElement.textContent?.trim() || "",
                price: priceElement.textContent?.trim() || "",
                location: locationElement?.textContent?.trim() || "",
                seller: sellerElement?.textContent?.trim() || "",
                url: linkElement?.getAttribute("href") || "",
                timestamp: new Date(),
              };

              items.push(item);
            }
          } catch (error) {
            console.error("Error extracting item:", error);
          }
        });

        return items;
      });

      // Convert to MarketplaceItem objects with full URLs
      items.push(
        ...scrapedItems.map((item) => ({
          ...item,
          url: item.url.startsWith("http")
            ? item.url
            : `${this.baseUrl}${item.url}`,
          timestamp: new Date(),
        }))
      );

      console.log(`Successfully scraped ${items.length} items`);
    } catch (error) {
      console.error("Error scraping marketplace:", error);
      throw error;
    } finally {
      await page.close();
    }

    return items;
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
