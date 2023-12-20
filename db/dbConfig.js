const envConfig = require("../src/app/config/env.config.js");

module.exports = {
  host: envConfig.databaseHost,
  user: envConfig.databaseUser,
  password: envConfig.databasePassword,
  database: envConfig.databaseName,
  connectTimeout: 30000,
};
