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
