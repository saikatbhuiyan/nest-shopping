export interface ApiResponse<T = unknown> {
  /** Was the request successful */
  success: boolean;

  version: string;

  /** HTTP status code */
  statusCode: number;

  /** Human-readable message (e.g. “Request successful”, “Validation failed”) */
  message: string;

  /** The actual data payload (can be null for errors) */
  data: T | null;

  /** ISO 8601 timestamp of when the response was generated */
  timestamp: string;

  /** Extra metadata (pagination, debug info, etc.) */
  meta?: Record<string, unknown>;

  /** Request path for easier debugging */
  path?: string;

  /** Validation / domain / system errors */
  errors?: Array<Record<string, unknown> | string>;

  /** Correlation ID for tracing across logs and responses */
  correlationId?: string;
}

export interface FilterOptions {
  search?: string;
  isActive?: boolean;
  createdAfter?: Date;
  createdBefore?: Date;
}

export interface NoWrapResponseOptions {
  /**
   * Whether to skip wrapping completely
   * @default true
   */
  skipWrap?: boolean;

  /**
   * Reason for skipping (for logging/documentation)
   */
  reason?: string;
}
