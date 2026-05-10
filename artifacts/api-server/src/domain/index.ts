// ── Domain Types ────────────────────────────────────────────────────────────────
// Shared business entity types used across engines, services, and routes.

export interface Money {
  amount: number;
  currency: string;
}

export interface DateRange {
  from: string; // ISO date
  to: string;   // ISO date
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface OperationResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  warnings?: string[];
}
