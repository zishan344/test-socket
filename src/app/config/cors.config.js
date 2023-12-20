module.exports = {
  origin: ["http://localhost:3000", "https://hire.elite-professionals.in"],
  methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "Control-Allow-Headers",
    "uid",
    "Access-Control-Allow-Headers",
  ],
  credentials: true,
  optionsSuccessStatus: 200,
};
