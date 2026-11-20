require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const { sendError } = require("./lib/constants");
const authRoute = require("./routes/authRoute");
const testimonialRoute = require("./routes/testimonialRoute");

const app = express();

app.use(express.json());

app.use("/api/auth", authRoute);
app.use("/api/testimonials", testimonialRoute);

app.use((req, res) => {
  return sendError(res, { code: 404, message: "Route not found" });
});

app.use((err, req, res, next) => {
  console.error(err);

  const statusCode = err && (err.statusCode || err.status);
  if (typeof statusCode === "number" && statusCode >= 400 && statusCode < 600) {
    return sendError(res, { code: statusCode, message: err.message || "Request error" });
  }

  return sendError(res, { code: 500, message: "Internal server error" });
});

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

const start = async () => {
  try {
    if (!MONGODB_URI) {
      throw new Error("MONGODB_URI is not defined");
    }
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

if (require.main === module) {
  start();
}

module.exports = { app, start };
