import { config } from "../config/env.js";

// Central error handler. Express recognises it as an error handler because it
// takes four arguments, and it must be registered LAST, after every route.
//
// Every failure leaves the API in the same shape:
//   { success: false, error: { code, message, details? } }
export function errorHandler(error, _req, res, next) {
  // If the response already started we cannot send JSON any more; hand the
  // error back to Express so it can close the connection properly.
  if (res.headersSent) return next(error);

  let statusCode = error.statusCode ?? 500;
  let code = error.code ?? "INTERNAL_ERROR";
  let message = error.message;
  let details = error.details;

  // express.json() rejects malformed request bodies with its own error type.
  if (error.type === "entity.parse.failed") {
    statusCode = 400;
    code = "INVALID_JSON";
    message = "Request body is not valid JSON.";
  }

  // Anything thrown by our own code is safe to expose. Anything else is a bug
  // or infrastructure failure: log it, but return a generic message.
  const isOperational = error instanceof Error && error.isOperational === true;
  if (!isOperational && statusCode >= 500) {
    console.error("[error]", error);
    code = "INTERNAL_ERROR";
    message = "An unexpected error occurred.";
    details = undefined;
  }

  if (!config.isProduction && error.stack) {
    console.error("[error]", error.stack);
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
  });
}
