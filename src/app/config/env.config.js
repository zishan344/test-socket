const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join((process.cwd(), ".env")) });

module.exports = {
  NODE_ENV: process.env.NODE_ENV,
  port: process.env.PORT,
  databasePort: process.env.DATABASE_PORT,
  databaseHost: process.env.DATABASE_HOST,
  databaseUser: process.env.DATABASE_USER,
  databasePassword: process.env.DATABASE_PASSWORD,
  databaseName: process.env.DATABASE_DATABASE,
};
