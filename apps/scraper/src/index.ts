import axios from "axios";
import * as cheerio from "cheerio";
import { config } from "dotenv";

// Load environment variables
config();

interface ScrapedData {
  title: string;
  description: string;
  url: string;
  timestamp: Date;
}

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

async function main() {
  const scraper = new WebScraper("https://example.com");

  // Example usage
  const urlsToScrape = ["https://example.com", "https://httpbin.org/html"];

  console.log("Starting scraper...");
  const results = await scraper.scrapeMultiple(urlsToScrape);

  console.log("\nScraping results:");
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

export { WebScraper };
export type { ScrapedData };
