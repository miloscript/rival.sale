import { config } from "dotenv";
import {
  MarketplaceScraper,
  createPlayStationSearchParams,
} from "./marketplace-scraper.js";

// Load environment variables
config();

const SEARCH_KEYWORDS = process.env.SEARCH_KEYWORDS || "collectors edition";

async function main() {
  console.log("=== Marketplace HTML Downloader & Parser ===");
  console.log(`Search keywords: ${SEARCH_KEYWORDS}`);
  console.log(
    `Target URL: https://www.kupujemprodajem.com/konzole-i-igrice/sony-playstation-igrice/pretraga`
  );
  console.log("====================================\n");

  const scraper = new MarketplaceScraper("https://www.kupujemprodajem.com");

  try {
    console.log("Initializing browser...");
    await scraper.init();

    console.log(
      `Downloading and parsing HTML for search: "${SEARCH_KEYWORDS}" in PlayStation games...`
    );

    const searchParams = createPlayStationSearchParams(SEARCH_KEYWORDS);
    const parsingResult = await scraper.downloadAndParseMarketplace(
      searchParams,
      {
        maxPages: parseInt(process.env.MAX_PAGES || "5"),
        puppeteerOptions: {
          scrollToBottom: true,
        },
      }
    );

    console.log("\n=== MULTI-PAGE SCRAPING RESULTS ===");
    console.log(`Total ads found: ${parsingResult.stats.totalAdsFound}`);
    console.log(
      `Successfully parsed: ${parsingResult.stats.successfullyParsed}`
    );
    console.log(`Failed to parse: ${parsingResult.stats.failedToParse}`);
    console.log(`Total parsing time: ${parsingResult.stats.parsingTimeMs}ms`);
    console.log(`Total HTML file size: ${parsingResult.stats.htmlSizeKb}KB`);

    if (parsingResult.errors.length > 0) {
      console.log("\n=== PARSING ERRORS ===");
      parsingResult.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.message}`);
      });
    }

    if (parsingResult.warnings.length > 0) {
      console.log("\n=== PARSING WARNINGS ===");
      parsingResult.warnings.forEach((warning, index) => {
        console.log(`${index + 1}. ${warning.message}`);
      });
    }

    // Show sample of parsed ads
    if (parsingResult.extractedAds.length > 0) {
      console.log("\n=== SAMPLE PARSED ADS ===");
      parsingResult.extractedAds.slice(0, 3).forEach((ad, index) => {
        console.log(`\n${index + 1}. ${ad.raw.title}`);
        console.log(`   Price: ${ad.raw.price.formatted}`);
        console.log(`   Location: ${ad.raw.location.name}`);
        console.log(
          `   Views: ${ad.raw.metrics.views}, Favorites: ${ad.raw.metrics.favorites}`
        );
        console.log(`   Posted: ${ad.raw.metrics.postedAgo}`);
        console.log(`   URL: ${ad.raw.url}`);
      });
    }

    console.log("\n=== SCRAPING COMPLETED ===");
  } catch (error) {
    console.error("Error during scraping:", error);
  } finally {
    await scraper.close();
  }
}

main().catch(console.error);
