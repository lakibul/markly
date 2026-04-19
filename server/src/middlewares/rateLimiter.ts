// LEARN: Rate limiting prevents abuse — e.g., brute-force login attempts.
// express-rate-limit tracks requests per IP in memory (or Redis for production).
// If a client exceeds the limit, it gets 429 Too Many Requests.

import rateLimit from "express-rate-limit";

// Strict limiter for auth routes — 10 attempts per 15 minutes per IP
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes in ms
  max: 10,
  message: {
    success: false,
    message: "Too many attempts. Please try again in 15 minutes.",
  },
  standardHeaders: true,  // sends RateLimit-* headers so clients know their quota
  legacyHeaders: false,
});

// General API limiter — 100 requests per minute per IP
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: "Too many requests. Please slow down.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
