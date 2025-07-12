# @repo/types

Shared TypeScript types and interfaces for the entire monorepo.

## Usage

```typescript
import { User, ScrapedData, ApiResponse } from "@repo/types";

// Use the shared types
const user: User = {
  id: "1",
  email: "user@example.com",
  name: "John Doe",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const scraped: ScrapedData = {
  title: "Example",
  description: "A scraped page",
  url: "https://example.com",
  timestamp: new Date(),
};
```

## Available Types

### API Types

- `ApiResponse<T>` - Standard API response wrapper
- `ApiError` - Error response structure
- `PaginatedResponse<T>` - Paginated data response
- `SearchParams` - Common search parameters

### User Types

- `User` - Basic user information
- `UserProfile` - Extended user profile
- `UserPreferences` - User preferences and settings

### Scraping Types

- `ScrapedData` - Data structure for scraped content
- `ScrapingJob` - Job tracking for scraping operations
- `ScrapingConfig` - Configuration for scraping tasks

### Utility Types

- `Status` - Common status states
- `AppConfig` - Application configuration

## Development

- `pnpm build` - Build the types package
- `pnpm dev` - Watch mode for development
- `pnpm lint` - Run ESLint
- `pnpm check-types` - Type check without emitting files

## Adding New Types

1. Add your types to `src/index.ts`
2. Export them properly
3. Update this README with documentation
4. Run `pnpm build` to generate declaration files
