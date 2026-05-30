const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();

const companyRoutes = require("./routes/companyRoutes");
const userRoutes = require("./routes/userRoutes");

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/company/assets", express.static(path.join(__dirname, "..", "ddo-company-login")));

// Normal users and companies share the same database connection,
// but stay separated by collection and route namespace.
app.use("/api/users", userRoutes);
app.use("/api/company", companyRoutes);
app.use("/api/company-form", companyRoutes);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/reset-company-password.html", (_req, res) => {
  res.sendFile(path.join(__dirname, "..", "ddo-company-login", "reset-company-password.html"));
});

app.get("/company-login.html", (_req, res) => {
  res.sendFile(path.join(__dirname, "..", "ddo-company-login", "company-login.html"));
});

app.get("/company/reset-password", (_req, res) => {
  res.redirect("/reset-company-password.html");
});

async function startServer() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected successfully.");
    app.listen(port, () => {
      console.log(`DDO backend running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
}

startServer();
