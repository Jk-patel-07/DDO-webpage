const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();

function createUserToken(user) {
  return jwt.sign(
    {
      userMongoId: user._id.toString(),
      email: user.email,
      username: user.username,
      role: "user"
    },
    process.env.JWT_SECRET,
    { expiresIn: "12h" }
  );
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";

  if (!token) {
    return res.status(401).json({ message: "Authentication token is required." });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch (_error) {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
}

function requireUserRole(req, res, next) {
  if (req.user?.role !== "user") {
    return res.status(403).json({ message: "Only user accounts can access this route." });
  }
  return next();
}

// This keeps a normal user login flow separate from company login.
router.post("/login", async (req, res) => {
  try {
    const { loginId, password } = req.body;

    if (!loginId || !password) {
      return res.status(400).json({ message: "Login ID and password are required." });
    }

    const normalized = String(loginId).trim().toLowerCase();
    const user = await User.findOne({
      $or: [
        { email: normalized },
        { username: String(loginId).trim() }
      ]
    });

    if (!user) {
      return res.status(401).json({ message: "User login failed. Check your credentials." });
    }

    const passwordOk = await bcrypt.compare(password, user.passwordHash);
    if (!passwordOk) {
      return res.status(401).json({ message: "User login failed. Check your credentials." });
    }

    return res.json({
      message: "User login successful.",
      token: createUserToken(user)
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "User login failed." });
  }
});

router.get("/me", authMiddleware, requireUserRole, async (req, res) => {
  try {
    const user = await User.findById(req.user.userMongoId).select("fullName email username role");

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.json(user);
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to fetch user profile." });
  }
});

// User search is isolated to users collection only.
router.get("/search", authMiddleware, requireUserRole, async (req, res) => {
  try {
    const query = String(req.query.q || "").trim();
    const filter = query
      ? {
          $or: [
            { fullName: { $regex: query, $options: "i" } },
            { email: { $regex: query, $options: "i" } },
            { username: { $regex: query, $options: "i" } }
          ]
        }
      : {};

    const users = await User.find(filter)
      .select("fullName email username role createdAt")
      .sort({ createdAt: -1 })
      .limit(25);

    return res.json({ results: users });
  } catch (error) {
    return res.status(500).json({ message: error.message || "User search failed." });
  }
});

module.exports = router;
