# Scraper App

A web scraper application built with Node.js, TypeScript, and Puppeteer for downloading HTML content from dynamic websites.

## Features

- **HTML Downloading**: Downloads complete HTML content from marketplace pages using Puppeteer
- **Dynamic Content Support**: Handles JavaScript-rendered content with full browser automation
- **Configurable Search Parameters**: Easy configuration of search terms and filters for marketplace scraping
- **File Management**: Automatically saves HTML files with timestamps and organized naming
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

### HTML Downloading (kupujemprodajem.com)

The scraper downloads complete HTML content from the Serbian marketplace kupujemprodajem.com for PlayStation games:

```bash
# Default search for "collectors edition"
pnpm start

# Custom search keywords
SEARCH_KEYWORDS="ps5 games" pnpm start
```

The downloaded HTML files are saved in the `data/` folder with timestamps and search parameters in the filename:

```
data/marketplace_collectors_edition_2025-07-12T21-43-29-391Z.html
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

const htmlContent = await scraper.downloadMarketplaceHTML(searchParams);
console.log(`Downloaded ${htmlContent.length} characters of HTML`);

await scraper.close();
```

## Available Scripts

- `pnpm dev` - Run in development mode with hot reloading
- `pnpm build` - Build for production
- `pnpm start` - Run production build and download HTML
- `pnpm lint` - Run ESLint
- `pnpm check-types` - Type check without emitting files

## File Structure

```
apps/scraper/
├── data/                     # Downloaded HTML files (gitignored)
│   └── marketplace_*.html    # Timestamped HTML files
├── src/
│   ├── index.ts             # Main application entry point
│   └── marketplace-scraper.ts # Puppeteer-based HTML downloader
├── package.json             # Dependencies and scripts
├── .gitignore              # Ignores data files and build output
└── README.md               # This file
```

## Environment Variables

```bash
# Search configuration
SEARCH_KEYWORDS=collectors edition

# Puppeteer configuration
PUPPETEER_HEADLESS=true
PUPPETEER_TIMEOUT=15000
SCRAPE_DELAY_MS=1000
```

## Features

### Smart HTML Downloading

- Waits for dynamic content to load completely
- Handles JavaScript-rendered pages
- Optional scrolling to load more content
- Automatic file naming with timestamps

### Search Configuration

- PlayStation games category targeting
- Price filtering options
- Multiple sorting options (price, date, popularity)
- Location and seller filtering

### File Management

- Organized file naming: `marketplace_{keywords}_{timestamp}.html`
- Automatic data folder creation
- File size reporting
- UTF-8 encoding for proper character support

## Architecture

The scraper is built with:

- **TypeScript**: Full type safety with shared types
- **Puppeteer**: For dynamic content handling and HTML downloading
- **Node.js**: File system operations for saving HTML content
- **Environment Variables**: For flexible configuration

## Supported Sites

- **kupujemprodajem.com**: Serbian marketplace (PlayStation games category)
  - Category ID: 1036 (PlayStation games)
  - Group ID: 1039 (PlayStation group)
  - Configurable search parameters

## Rate Limiting

The scraper includes built-in rate limiting to be respectful to target servers:

- 3-second wait for initial page load
- 2-second wait after scrolling
- Configurable delays through environment variables
- Respectful user agent headers

## Downloaded Files

HTML files are saved with the following naming convention:

```
marketplace_{search_keywords}_{ISO_timestamp}.html
```

Example:

```
marketplace_collectors_edition_2025-07-12T21-43-29-391Z.html
```

The files contain the complete HTML source of the search results page, including all dynamically loaded content.
