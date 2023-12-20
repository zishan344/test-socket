const envConfig = require("./src/app/config/env.config");
const app = require("./app");
const { connectToDatabase } = require("./db/dbPoolConnection");

async function startServer() {
  const server = app.listen(envConfig.port, () => {
    console.log(`App is listening on port ${envConfig.port}`);
  });

  // Handle graceful shutdown
  process.on("SIGINT", () => {
    console.log("Shutting down gracefully...");
    server.close(() => {
      console.log("Server closed.");
      process.exit(0);
    });
  });

  process.on("SIGTERM", () => {
    console.log("Shutting down gracefully...");
    server.close(() => {
      console.log("Server closed.");
      process.exit(0);
    });
  });
}

async function main() {
  try {
    await connectToDatabase();
    await startServer();
  } catch (err) {
    console.error("Error during startup:", err);
    process.exit(1);
  }
}

main();
