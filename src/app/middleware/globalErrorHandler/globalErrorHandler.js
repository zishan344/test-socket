const envConfig = require("../../config/env.config");

module.exports.globalErrorHandler = (err, req, res, next) => {
  return res.status(500).json({
    success: false,
    message: err?.sqlMessage,
    error: {
      code: err?.code,
      errno: err?.errno,
      sqlState: err?.sqlState,
      sql: envConfig.NODE_ENV === "development" ? err?.sql : null,
    },
  });
};
