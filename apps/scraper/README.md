# Scraper App

A web scraper application built with Node.js, TypeScript, and Puppeteer for dynamic content scraping.

## Features

- **Basic Web Scraping**: Using Axios and Cheerio for static content
- **Advanced Marketplace Scraping**: Using Puppeteer for dynamic content (kupujemprodajem.com)
- **Configurable Search Parameters**: Easy configuration of search terms and filters
- **TypeScript Support**: Full type safety with shared types from `@repo/types`
- **Rate Limiting**: Respectful scraping with configurable delays
- **Error Handling**: Comprehensive error handling and logging
- **Environment Variables**: Configurable through environment variables

## Getting Started

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Copy the environment file and configure:

   ```bash
   cp .env.example .env
   ```

3. Run in development mode:

   ```bash
   pnpm dev
   ```

4. Build for production:

   ```bash
   pnpm build
   ```

5. Run production build:
   ```bash
   pnpm start
   ```

## Usage

### Basic Web Scraping

The scraper includes basic functionality for scraping static content using Axios and Cheerio.

### Marketplace Scraping (kupujemprodajem.com)

The scraper can scrape the Serbian marketplace kupujemprodajem.com for PlayStation games:

```bash
# Default search for "collectors edition"
pnpm start

# Custom search keywords
SEARCH_KEYWORDS="ps5 games" pnpm start
```

### Configuration

Configure the scraper through environment variables:

```bash
# Search keywords for marketplace scraping
SEARCH_KEYWORDS="collectors edition"

# Puppeteer settings
PUPPETEER_HEADLESS=true
PUPPETEER_TIMEOUT=15000
```

### Programmatic Usage

```typescript
import {
  MarketplaceScraper,
  createPlayStationSearchParams,
} from "./marketplace-scraper";

const scraper = new MarketplaceScraper("https://www.kupujemprodajem.com");
await scraper.init();

const searchParams = createPlayStationSearchParams("collectors edition", {
  order: "price",
  hasPrice: true,
});

const items = await scraper.scrapeMarketplace(searchParams);
console.log(items);

await scraper.close();
```

## Available Scripts

- `pnpm dev` - Run in development mode with hot reloading
- `pnpm build` - Build for production
- `pnpm start` - Run production build
- `pnpm lint` - Run ESLint
- `pnpm check-types` - Type check without emitting files

## Debug Mode

For debugging marketplace scraping, you can run the debug scraper:

```bash
# Run the debug scraper (opens browser in non-headless mode)
node dist/debug-scraper.js
```

This will:

- Open a visible browser window
- Navigate to the search page
- Take a screenshot for debugging
- Log page structure information
- Keep the browser open for manual inspection

## Environment Variables

```bash
# Search configuration
SEARCH_KEYWORDS=collectors edition

# Puppeteer configuration
PUPPETEER_HEADLESS=true
PUPPETEER_TIMEOUT=15000
SCRAPE_DELAY_MS=1000

# Output configuration
OUTPUT_FORMAT=json
OUTPUT_FILE=scraped_data.json
```

## Architecture

The scraper is built with:

- **TypeScript**: Full type safety
- **Puppeteer**: For dynamic content scraping
- **Axios + Cheerio**: For static content scraping
- **Shared Types**: Using `@repo/types` for consistent interfaces
- **Error Handling**: Comprehensive error handling and logging

## Supported Sites

- **kupujemprodajem.com**: Serbian marketplace (PlayStation games category)
- **Generic websites**: Basic scraping with Axios and Cheerio

## Rate Limiting

The scraper includes built-in rate limiting to be respectful to target servers:

- 1-second delay between requests by default
- Configurable through environment variables
- Respectful user agent headers
