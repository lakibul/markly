// LEARN: Augmenting Express types.
// Express's `req` object knows nothing about our user by default.
// By extending the `Request` interface, we tell TypeScript: "after auth middleware
// runs, req.user will exist and have this shape." Without this, `req.user` would
// be a type error everywhere.

import { Request } from "express";

export interface AuthPayload {
  userId: string;
  email: string;
}

// Extend Express's Request to include our auth payload
declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
