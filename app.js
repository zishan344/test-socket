const express = require("express");
const app = express();
const dotenv = require("dotenv");
const cors = require("cors");
dotenv.config();
app.use(express.json());

//all routers import
const chatAppRoutersV1 = require("./src/app/modules/chatAppV1/routes/routes");
const corsConfig = require("./src/app/config/cors.config");
const {
  globalErrorHandler,
} = require("./src/app/middleware/globalErrorHandler/globalErrorHandler");

// this is cors polacy
app.use(cors(corsConfig));

// this is all route
app.use("/api/v1", chatAppRoutersV1);

// server starting
app.get("/", (req, res) => {
  res.send({
    success: true,
    message: "Hello Developer your chatting application server is running",
  });
});

// Global error handling middleware
app.use(globalErrorHandler);

module.exports = app;
