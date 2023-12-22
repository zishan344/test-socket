const envConfig = require("../../config/env.config");
const AppError = require("../customAppErrorHandler/customAppErrorHandler");

module.exports.globalErrorHandler = (err, req, res, next) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      statusCode: err.statusCode,
      error: {
        name: envConfig.NODE_ENV === "development" ? err?.name : null,
        statusCode: err.statusCode,
      },
    });
  }
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
