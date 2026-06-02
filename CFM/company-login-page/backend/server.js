const path = require("path");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

const connectDB = require("./config/db");
const companyAuthRoutes = require("./routes/companyAuthRoutes");

dotenv.config({
  path: path.resolve(__dirname, "..", ".env"),
});

const app = express();
const PORT = process.env.PORT || 5000;
const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

connectDB();

app.use(
  cors({
    origin(origin, callback) {
      // Allow direct file opening and the configured frontend URL.
      if (!origin || origin === frontendUrl) {
        return callback(null, true);
      }

      return callback(new Error("CORS not allowed for this origin"));
    },
    credentials: true,
  })
);
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "DDO Company Login backend is running",
  });
});

app.use("/api/company", companyAuthRoutes);

// Optional static serving makes the HTML page easy to open from this module too.
app.use(express.static(path.resolve(__dirname, "..", "frontend")));

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

app.use((error, req, res, next) => {
  console.error("Server error:", error);

  if (res.headersSent) {
    return next(error);
  }

  return res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || "Internal server error",
  });
});

app.listen(PORT, () => {
  console.log(`Company login backend running on http://localhost:${PORT}`);
});
