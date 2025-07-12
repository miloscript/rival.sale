import { config } from "dotenv";
import {
  MarketplaceScraper,
  createPlayStationSearchParams,
} from "./marketplace-scraper.js";

// Load environment variables
config();

async function downloadKupujemProdajemHTML(
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

    console.log(
      `Downloading HTML for search: "${searchKeywords}" in PlayStation games...`
    );

    const htmlContent = await marketplaceScraper.downloadMarketplaceHTML(
      searchParams,
      {
        timeout: 15000,
        puppeteerOptions: {
          scrollToBottom: true,
          waitForTimeout: 2000,
        },
      }
    );

    console.log(`\nSuccessfully downloaded HTML content!`);
    console.log(`Content length: ${htmlContent.length} characters`);
    console.log(`Check the data/ folder for the saved HTML file.`);

    return htmlContent;
  } catch (error) {
    console.error("Error downloading marketplace HTML:", error);
    throw error;
  } finally {
    await marketplaceScraper.close();
  }
}

async function main() {
  // Get search keywords from environment or use default
  const searchKeywords = process.env.SEARCH_KEYWORDS || "collectors edition";

  console.log("=== Marketplace HTML Downloader ===");
  console.log(`Search keywords: ${searchKeywords}`);
  console.log(
    `Target URL: https://www.kupujemprodajem.com/konzole-i-igrice/sony-playstation-igrice/pretraga`
  );
  console.log("====================================\n");

  try {
    await downloadKupujemProdajemHTML(searchKeywords);
  } catch (error) {
    console.error("HTML download failed:", error);
  }
}

// Run the scraper if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { MarketplaceScraper };
