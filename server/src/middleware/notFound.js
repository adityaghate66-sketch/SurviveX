import { AppError } from "../errors/AppError.js";

// Runs when no route matched the request. It turns "nothing handled this"
// into a normal 404 error so it travels through the same error handler as
// every other failure.
export function notFoundHandler(req, _res, next) {
  next(
    new AppError(`Route ${req.method} ${req.originalUrl} does not exist.`, {
      statusCode: 404,
      code: "ROUTE_NOT_FOUND",
    })
  );
}
