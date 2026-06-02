const express = require("express");
const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");
const Company = require("../models/Company");

const router = express.Router();
const SAFE_ROOT = path.resolve(__dirname, "..", "..", "..");
const MAX_TEXT_PREVIEW_SIZE = 1024 * 1024;
const MAX_SEARCH_RESULTS = 50;
const TEXT_EXTENSIONS = new Set([
  ".txt",
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".json",
  ".html",
  ".css",
  ".md",
  ".env",
  ".yml",
  ".yaml",
  ".xml",
  ".cjs",
  ".mjs",
  ".py",
  ".java",
  ".php",
  ".sql",
]);

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
    return res.status(403).json({ message: "Only company accounts can access CFM." });
  }
  return next();
}

function toRelativePath(targetPath = "") {
  return String(targetPath || "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .trim();
}

function resolveSafePath(targetPath = "") {
  const relativePath = toRelativePath(targetPath);
  const resolvedPath = path.resolve(SAFE_ROOT, relativePath);

  if (!resolvedPath.startsWith(SAFE_ROOT)) {
    throw new Error("Invalid path. Access outside the safe project folder is not allowed.");
  }

  return {
    absolutePath: resolvedPath,
    relativePath,
  };
}

function formatItem(baseRelativePath, dirent) {
  const nextRelativePath = [baseRelativePath, dirent.name].filter(Boolean).join("/").replace(/\\/g, "/");
  return {
    name: dirent.name,
    relativePath: nextRelativePath,
    itemType: dirent.isDirectory() ? "folder" : "file",
  };
}

function listDirectory(relativePath = "") {
  const { absolutePath, relativePath: safeRelativePath } = resolveSafePath(relativePath);
  const entries = fs
    .readdirSync(absolutePath, { withFileTypes: true })
    .filter((entry) => !entry.name.startsWith(".git"))
    .sort((left, right) => Number(right.isDirectory()) - Number(left.isDirectory()) || left.name.localeCompare(right.name))
    .map((entry) => formatItem(safeRelativePath, entry));

  return {
    targetPath: safeRelativePath,
    itemType: "folder",
    items: entries,
  };
}

function buildFolderTree(relativePath = "") {
  const { absolutePath, relativePath: safeRelativePath } = resolveSafePath(relativePath);

  const walk = (currentAbsolutePath, currentRelativePath) => {
    return fs
      .readdirSync(currentAbsolutePath, { withFileTypes: true })
      .filter((entry) => !entry.name.startsWith(".git"))
      .sort((left, right) => Number(right.isDirectory()) - Number(left.isDirectory()) || left.name.localeCompare(right.name))
      .map((entry) => {
        const nextRelativePath = [currentRelativePath, entry.name].filter(Boolean).join("/").replace(/\\/g, "/");
        if (entry.isDirectory()) {
          return {
            name: entry.name,
            relativePath: nextRelativePath,
            itemType: "folder",
            children: walk(path.join(currentAbsolutePath, entry.name), nextRelativePath),
          };
        }

        return {
          name: entry.name,
          relativePath: nextRelativePath,
          itemType: "file",
        };
      });
  };

  return {
    targetPath: safeRelativePath,
    itemType: "folder",
    tree: walk(absolutePath, safeRelativePath),
  };
}

function openTarget(relativePath = "") {
  const { absolutePath, relativePath: safeRelativePath } = resolveSafePath(relativePath);
  const stats = fs.statSync(absolutePath);

  if (stats.isDirectory()) {
    return {
      ...listDirectory(safeRelativePath),
      ...buildFolderTree(safeRelativePath),
    };
  }

  const extension = path.extname(absolutePath).toLowerCase();
  const isTextPreview = TEXT_EXTENSIONS.has(extension) && stats.size <= MAX_TEXT_PREVIEW_SIZE;

  return {
    targetPath: safeRelativePath,
    itemType: "file",
    fileName: path.basename(absolutePath),
    extension,
    size: stats.size,
    content: isTextPreview ? fs.readFileSync(absolutePath, "utf8") : "",
    previewAvailable: isTextPreview,
  };
}

async function saveRecentActivity(companyMongoId, targetPath, itemType, action) {
  const cleanPath = toRelativePath(targetPath);
  if (!cleanPath) {
    return;
  }

  const company = await Company.findById(companyMongoId).select("recentFiles");
  if (!company) {
    return;
  }

  const withoutDuplicate = (company.recentFiles || []).filter(
    (item) => item.targetPath !== cleanPath || item.action !== action
  );

  company.recentFiles = [
    {
      targetPath: cleanPath,
      itemType,
      action,
      lastAccessedAt: new Date(),
    },
    ...withoutDuplicate,
  ].slice(0, 10);

  await company.save();
}

function searchFilesRecursive(baseAbsolutePath, baseRelativePath, query, matches) {
  if (matches.length >= MAX_SEARCH_RESULTS) {
    return;
  }

  const entries = fs.readdirSync(baseAbsolutePath, { withFileTypes: true }).filter((entry) => !entry.name.startsWith(".git"));

  for (const entry of entries) {
    if (matches.length >= MAX_SEARCH_RESULTS) {
      return;
    }

    const nextRelativePath = [baseRelativePath, entry.name].filter(Boolean).join("/").replace(/\\/g, "/");
    const nextAbsolutePath = path.join(baseAbsolutePath, entry.name);
    const itemType = entry.isDirectory() ? "folder" : "file";

    if (entry.name.toLowerCase().includes(query)) {
      matches.push({
        name: entry.name,
        relativePath: nextRelativePath,
        itemType,
      });
    }

    if (entry.isDirectory()) {
      searchFilesRecursive(nextAbsolutePath, nextRelativePath, query, matches);
    }
  }
}

router.use(authMiddleware, requireCompanyRole);

router.get("/open", async (req, res) => {
  try {
    const targetPath = String(req.query.target || "");
    const payload = openTarget(targetPath);
    await saveRecentActivity(req.user.companyMongoId, payload.targetPath, payload.itemType, "open");
    return res.json(payload);
  } catch (error) {
    return res.status(400).json({ message: error.message || "Failed to open file or folder." });
  }
});

router.post("/delete", async (req, res) => {
  try {
    const targetPath = String(req.body.targetPath || "");
    const { absolutePath, relativePath } = resolveSafePath(targetPath);

    if (!relativePath) {
      return res.status(400).json({ message: "Root folder cannot be deleted." });
    }

    const stats = fs.statSync(absolutePath);
    fs.rmSync(absolutePath, { recursive: true, force: false });
    await saveRecentActivity(req.user.companyMongoId, relativePath, stats.isDirectory() ? "folder" : "file", "delete");

    return res.json({ message: "File or folder deleted successfully.", targetPath: relativePath });
  } catch (error) {
    return res.status(400).json({ message: error.message || "Failed to delete file or folder." });
  }
});

router.get("/search", async (req, res) => {
  try {
    const query = String(req.query.q || "").trim().toLowerCase();
    if (!query) {
      return res.status(400).json({ message: "Search query is required." });
    }

    const results = [];
    searchFilesRecursive(SAFE_ROOT, "", query, results);
    await saveRecentActivity(req.user.companyMongoId, query, "file", "search");
    return res.json({ results });
  } catch (error) {
    return res.status(400).json({ message: error.message || "Search failed." });
  }
});

router.get("/recent", async (req, res) => {
  try {
    const company = await Company.findById(req.user.companyMongoId).select("recentFiles");
    return res.json({ recentFiles: company?.recentFiles || [] });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to load recent files." });
  }
});

router.post("/recent", async (req, res) => {
  try {
    const targetPath = String(req.body.targetPath || "");
    const itemType = req.body.itemType === "folder" ? "folder" : "file";
    const action = String(req.body.action || "open");
    await saveRecentActivity(req.user.companyMongoId, targetPath, itemType, action);
    return res.json({ message: "Recent activity saved." });
  } catch (error) {
    return res.status(400).json({ message: error.message || "Failed to save recent activity." });
  }
});

module.exports = router;
