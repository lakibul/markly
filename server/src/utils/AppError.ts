// LEARN: Custom error class.
// Instead of: res.status(404).json({ message: 'Not found' }) everywhere,
// we throw: throw new AppError('Not found', 404)
// The central error handler catches it and sends the proper response.
// This keeps controllers clean and error handling consistent.

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;  // operational = expected errors (404, 401, etc.)
    Error.captureStackTrace(this, this.constructor);
  }
}
