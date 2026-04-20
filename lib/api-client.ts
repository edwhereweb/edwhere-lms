import axios, { AxiosError } from 'axios';
import type { ErrorCode } from '@/types/api';

export class ApiError extends Error {
  code: ErrorCode;
  details?: unknown;
  httpStatus: number;

  constructor(code: ErrorCode, message: string, httpStatus: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.httpStatus = httpStatus;
    this.details = details;
  }
}

export const api = axios.create({
  baseURL: '/api/v1'
});

api.interceptors.response.use(
  (response) => {
    response.data = response.data?.data;
    return response;
  },
  (error: AxiosError<{ error?: { code?: ErrorCode; message?: string; details?: unknown } }>) => {
    const body = error.response?.data;
    const status = error.response?.status ?? 500;

    if (body?.error) {
      throw new ApiError(
        body.error.code ?? 'INTERNAL',
        body.error.message ?? 'Something went wrong',
        status,
        body.error.details
      );
    }

    throw new ApiError('INTERNAL', error.message || 'Network error', status);
  }
);
