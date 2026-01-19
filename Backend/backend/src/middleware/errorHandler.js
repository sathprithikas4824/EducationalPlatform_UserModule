import logger from "../config/logger.js";

export const errorHandler = (err, req, res, next) => {
  // Suppress logging for expected "No refresh token" error (user not logged in)
  const isExpectedAuthError =
    err.statusCode === 401 &&
    err.message === "No refresh token provided" &&
    req.path === "/auth/refresh";

  if (!isExpectedAuthError) {
    // Enhanced console logging for all errors
    console.error('\n========================================');
    console.error('❌ ERROR CAUGHT BY GLOBAL HANDLER');
    console.error('========================================');
    console.error('Timestamp:', new Date().toISOString());
    console.error('Method:', req.method);
    console.error('Path:', req.originalUrl);
    console.error('Status:', err.statusCode || err.status || 500);
    console.error('Message:', err.message);
    console.error('Request Body:', JSON.stringify(req.body, null, 2));
    console.error('Request Params:', JSON.stringify(req.params, null, 2));
    console.error('Request Query:', JSON.stringify(req.query, null, 2));
    console.error('Stack:', err.stack);
    console.error('========================================\n');

    logger.error(err);
  }

  if (err.code === "EBADCSRFTOKEN") {
    logger.warn(`Invalid CSRF token at ${req.method} ${req.originalUrl}`);
    return res.status(403).json({ error: "Invalid CSRF token" });
  }

  const status = err.statusCode || err.status || 500;
  res.status(status).json({
    error: err.message || "Internal Server Error",
  });
};
