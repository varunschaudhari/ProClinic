import logger from "../config/logger.js";

// Request logging middleware
export const requestLogger = (req, res, next) => {
  const start = Date.now();

  // Log request start
  logger.info("Incoming Request", {
    method: req.method,
    url: req.originalUrl || req.url,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get("user-agent"),
    userId: req.user?.id || null,
  });

  // Log response when finished
  res.on("finish", () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.originalUrl || req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.connection.remoteAddress,
      userId: req.user?.id || null,
    };

    if (res.statusCode >= 400) {
      logger.warn("HTTP Response", logData);
    } else {
      logger.info("HTTP Response", logData);
    }
  });

  next();
};

// Error logging middleware
export const errorLogger = (err, req, res, next) => {
  logger.error("Error occurred", {
    error: {
      message: err.message,
      stack: err.stack,
      name: err.name,
    },
    request: {
      method: req.method,
      url: req.originalUrl || req.url,
      ip: req.ip || req.connection.remoteAddress,
      userId: req.user?.id || null,
    },
  });

  next(err);
};
