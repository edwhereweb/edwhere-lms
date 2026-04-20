export type ErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'INTERNAL';

export interface PageMeta {
  cursor?: string;
  hasMore?: boolean;
  total?: number;
}

export interface ApiSuccessResponse<T> {
  data: T;
  meta?: PageMeta;
}

export interface ApiErrorBody {
  code: ErrorCode;
  message: string;
  details?: unknown;
}

export interface ApiErrorResponse {
  error: ApiErrorBody;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
