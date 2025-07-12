// Common types for the entire monorepo

// API Response types
export interface ApiResponse<T = unknown> {
  data: T;
  success: boolean;
  message?: string;
  timestamp: Date;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// User types
export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile extends User {
  avatar?: string;
  bio?: string;
  preferences: UserPreferences;
}

export interface UserPreferences {
  theme: "light" | "dark" | "system";
  notifications: boolean;
  language: string;
}

// Scraping types
export interface ScrapedData {
  title: string;
  description: string;
  url: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface ScrapingJob {
  id: string;
  url: string;
  status: "pending" | "running" | "completed" | "failed";
  createdAt: Date;
  completedAt?: Date;
  result?: ScrapedData;
  error?: string;
}

export interface ScrapingConfig {
  url: string;
  selectors: Record<string, string>;
  delay: number;
  timeout: number;
  retries: number;
  maxPages?: number;
  usePuppeteer?: boolean;
  puppeteerOptions?: {
    headless?: boolean;
    waitForSelector?: string;
    waitForTimeout?: number;
    scrollToBottom?: boolean;
  };
}

export interface MarketplaceSearchParams {
  keywords: string;
  categoryId?: string;
  groupId?: string;
  hasPrice?: boolean;
  order?: "price" | "date" | "popularity";
  location?: string;
  minPrice?: number;
  maxPrice?: number;
}

export interface MarketplaceItem {
  title: string;
  price: string;
  location: string;
  seller: string;
  description?: string;
  images?: string[];
  url: string;
  timestamp: Date;
}

// Detailed KupujemProdajem ad types based on scraped HTML structure
export interface KupujemProdajemAd {
  id: string;
  title: string;
  price: AdPrice;
  location: AdLocation;
  description: string;
  images: AdImage[];
  url: string;
  seller: AdSeller;
  metrics: AdMetrics;
  status: AdStatus;
  metadata: AdMetadata;
}

export interface AdPrice {
  amount: number;
  currency: string;
  formatted: string; // e.g., "690 din"
}

export interface AdLocation {
  name: string; // e.g., "Leskovac"
  hasDelivery?: boolean;
  icon?: string;
}

export interface AdImage {
  url: string;
  alt: string;
  width: string;
  height: string;
  loading?: "eager" | "lazy";
}

export interface AdSeller {
  name?: string;
  hasKpStore: boolean;
  storeUrl?: string;
  storeId?: string;
}

export interface AdMetrics {
  views: number;
  favorites: number;
  postedAgo: string; // e.g., "pre 6 dana"
  postedDate?: Date;
}

export interface AdStatus {
  isActive: boolean;
  isPromoted: boolean;
  hasPromotion: boolean;
}

export interface AdMetadata {
  sectionId: string;
  classes: string[];
  filterId?: string;
  scrolled: boolean;
  category: string;
  subcategory: string;
}

// Parsed ad result from HTML scraping
export interface ParsedAd {
  raw: KupujemProdajemAd;
  parsed: {
    priceNumeric: number;
    postedDaysAgo: number;
    imageUrls: string[];
    isValidAd: boolean;
  };
  scrapingMetadata: {
    scrapedAt: Date;
    sourceUrl: string;
    parsingSuccess: boolean;
    parsingErrors?: string[];
  };
}

// Collection of ads from a search result
export interface AdSearchResult {
  ads: ParsedAd[];
  searchParams: MarketplaceSearchParams;
  totalFound: number;
  scrapingStats: {
    totalRequested: number;
    successfullyParsed: number;
    failedToParse: number;
    averageParsingTime: number;
  };
  metadata: {
    scrapedAt: Date;
    sourceUrl: string;
    htmlFileSize: number;
    htmlFilePath: string;
  };
}

// HTML parsing configuration
export interface HtmlParsingConfig {
  selectors: KupujemProdajemSelectors;
  fallbackSelectors?: Partial<KupujemProdajemSelectors>;
  textExtractionOptions: TextExtractionOptions;
  validation: ValidationRules;
}

export interface KupujemProdajemSelectors {
  adContainer: string;
  adId: string;
  title: string;
  price: string;
  location: string;
  description: string;
  image: string;
  imageAlt: string;
  adUrl: string;
  viewCount: string;
  favoriteCount: string;
  postedTime: string;
  kpStoreLink: string;
  kpStoreName: string;
  promotionButton: string;
}

export interface TextExtractionOptions {
  trim: boolean;
  removeExtraWhitespace: boolean;
  convertToLowercase: boolean;
  extractNumbers: boolean;
  extractCurrency: boolean;
}

export interface ValidationRules {
  requiredFields: (keyof KupujemProdajemAd)[];
  priceValidation: {
    minPrice: number;
    maxPrice: number;
    allowedCurrencies: string[];
  };
  titleValidation: {
    minLength: number;
    maxLength: number;
  };
  urlValidation: {
    mustStartWith: string;
    mustContain: string[];
  };
}

// HTML parsing result
export interface HtmlParsingResult {
  success: boolean;
  extractedAds: ParsedAd[];
  errors: ParsingError[];
  warnings: ParsingWarning[];
  stats: {
    totalAdsFound: number;
    successfullyParsed: number;
    failedToParse: number;
    parsingTimeMs: number;
    htmlSizeKb: number;
  };
}

export interface ParsingError {
  type: "MISSING_SELECTOR" | "INVALID_DATA" | "EXTRACTION_FAILED";
  message: string;
  adIndex?: number;
  fieldName?: string;
  selector?: string;
}

export interface ParsingWarning {
  type: "FALLBACK_USED" | "INCOMPLETE_DATA" | "SUSPICIOUS_VALUE";
  message: string;
  adIndex?: number;
  fieldName?: string;
  value?: string;
}

// Utility types
export type Status = "idle" | "loading" | "success" | "error";

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SearchParams {
  query?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

// Environment types
export interface AppConfig {
  apiUrl: string;
  environment: "development" | "production" | "test";
  logLevel: "debug" | "info" | "warn" | "error";
}

// Export all types as a namespace for convenience
export * as Types from "./index.js";
