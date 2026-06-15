export type MobileErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'INTERNAL';

export interface MobileSuccessResponse<T, M = null> {
  data: T;
  meta: M | null;
}

export interface MobileErrorDetail {
  code: MobileErrorCode;
  message: string;
  details: unknown | null;
}

export interface MobileErrorResponse {
  error: MobileErrorDetail;
}

export interface PaginationMeta {
  nextCursor: string | null;
  hasMore: boolean;
}
