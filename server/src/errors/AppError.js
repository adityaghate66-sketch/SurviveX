// An error we deliberately throw when a request is bad (404, 400, 409...).
//
// Distinguishing "expected" errors from unexpected crashes lets the error
// handler decide what the client is allowed to see: our own messages are safe,
// while a raw database or programming error must never leak to the browser.

export class AppError extends Error {
  constructor(message, { statusCode = 500, code = "APP_ERROR", details } = {}) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true; // expected, safe to show the message
    Error.captureStackTrace?.(this, AppError);
  }
}
