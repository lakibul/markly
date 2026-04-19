// LEARN: A response helper standardizes your API response shape.
// Without this, different routes might return { data: ... } or { result: ... }
// or { user: ... } — inconsistent APIs are painful for frontend devs.
// With this, every response follows: { success, message, data?, meta? }

import { Response } from "express";

export const sendSuccess = <T>(
  res: Response,
  data: T,
  message = "Success",
  statusCode = 200,
  meta?: object
) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    ...(meta && { meta }),
  });
};

export const sendError = (
  res: Response,
  message: string,
  statusCode = 400,
  error?: string
) => {
  return res.status(statusCode).json({
    success: false,
    message,
    ...(error && { error }),
  });
};

export const sendPaginated = <T>(
  res: Response,
  data: T[],
  total: number,
  page: number,
  limit: number,
  message = "Success"
) => {
  return res.status(200).json({
    success: true,
    message,
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
};
