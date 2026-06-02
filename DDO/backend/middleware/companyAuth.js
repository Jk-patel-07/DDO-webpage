const jwt = require("jsonwebtoken");

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

function requireCompanyRole(req, res, next) {
  if (req.user?.role !== "company") {
    return res.status(403).json({ message: "Only company accounts can access this route." });
  }

  return next();
}

module.exports = {
  authMiddleware,
  requireCompanyRole,
};
