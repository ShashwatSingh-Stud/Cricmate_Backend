import { Response } from 'express';

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function sendSuccess(
  res: Response,
  data: unknown,
  message?: string,
  statusCode: number = 200
): void {
  res.status(statusCode).json({
    success: true,
    data,
    ...(message && { message }),
  });
}

export function sendCreated(
  res: Response,
  data: unknown,
  message?: string
): void {
  sendSuccess(res, data, message, 201);
}

export function sendPaginated(
  res: Response,
  data: unknown[],
  pagination: PaginationMeta,
  message?: string
): void {
  res.status(200).json({
    success: true,
    data,
    pagination,
    ...(message && { message }),
  });
}

export function sendError(
  res: Response,
  error: string,
  message: string,
  statusCode: number = 400
): void {
  res.status(statusCode).json({
    success: false,
    error,
    message,
  });
}

export function buildPagination(
  page: number,
  limit: number,
  total: number
): PaginationMeta {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}
