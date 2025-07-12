import { MarketplaceItem, ScrapedData } from "@repo/types";
import axios from "axios";
import * as cheerio from "cheerio";
import { config } from "dotenv";
import {
  MarketplaceScraper,
  createPlayStationSearchParams,
} from "./marketplace-scraper.js";

// Load environment variables
config();

class WebScraper {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async scrape(url: string): Promise<ScrapedData | null> {
    try {
      console.log(`Scraping: ${url}`);

      const response = await axios.get(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        },
        timeout: 10000,
      });

      const $ = cheerio.load(response.data);

      const title = $("title").text().trim() || "No title found";
      const description =
        $('meta[name="description"]').attr("content") ||
        $('meta[property="og:description"]').attr("content") ||
        "No description found";

      return {
        title,
        description,
        url,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error(`Error scraping ${url}:`, error);
      return null;
    }
  }

  async scrapeMultiple(urls: string[]): Promise<ScrapedData[]> {
    const results: ScrapedData[] = [];

    for (const url of urls) {
      const data = await this.scrape(url);
      if (data) {
        results.push(data);
      }

      // Add a small delay to be respectful to the server
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return results;
  }
}

async function scrapeKupujemProdajem(
  searchKeywords: string = "collectors edition"
) {
  const marketplaceScraper = new MarketplaceScraper(
    "https://www.kupujemprodajem.com"
  );

  try {
    console.log("Initializing browser...");
    await marketplaceScraper.init(true); // headless mode

    // Create search parameters for PlayStation games
    const searchParams = createPlayStationSearchParams(searchKeywords, {
      order: "price",
      hasPrice: true,
    });

    console.log(`Searching for: "${searchKeywords}" in PlayStation games...`);

    const items = await marketplaceScraper.scrapeMarketplace(searchParams, {
      timeout: 15000,
      puppeteerOptions: {
        scrollToBottom: true,
        waitForTimeout: 2000,
      },
    });

    console.log(`\nFound ${items.length} items:`);
    items.forEach((item: MarketplaceItem, index: number) => {
      console.log(`\n${index + 1}. ${item.title}`);
      console.log(`   Price: ${item.price}`);
      console.log(`   Location: ${item.location}`);
      console.log(`   Seller: ${item.seller}`);
      console.log(`   URL: ${item.url}`);
    });

    return items;
  } catch (error) {
    console.error("Error scraping marketplace:", error);
    throw error;
  } finally {
    await marketplaceScraper.close();
  }
}

async function main() {
  // Get search keywords from environment or use default
  const searchKeywords = process.env.SEARCH_KEYWORDS || "collectors edition";

  console.log("=== Marketplace Scraper Demo ===");
  console.log(`Search keywords: ${searchKeywords}`);
  console.log("================================\n");

  try {
    await scrapeKupujemProdajem(searchKeywords);
  } catch (error) {
    console.error("Scraping failed:", error);
  }

  console.log("\n=== Basic Web Scraper Demo ===");
  const basicScraper = new WebScraper("https://example.com");

  const urlsToScrape = ["https://example.com", "https://httpbin.org/html"];

  console.log("Starting basic scraper...");
  const results = await basicScraper.scrapeMultiple(urlsToScrape);

  console.log("\nBasic scraping results:");
  results.forEach((result, index) => {
    console.log(`\n${index + 1}. ${result.title}`);
    console.log(`   Description: ${result.description}`);
    console.log(`   URL: ${result.url}`);
    console.log(`   Scraped at: ${result.timestamp.toISOString()}`);
  });
}

// Run the scraper if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { MarketplaceScraper, WebScraper };
