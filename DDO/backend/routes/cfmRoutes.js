const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");
const Company = require("../models/Company");
const { authMiddleware, requireCompanyRole } = require("../middleware/companyAuth");

const router = express.Router();
const workspaceUpload = multer({ storage: multer.memoryStorage(), limits: { files: 500, fileSize: 1024 * 1024 * 3 } });
const WORKSPACE_ROOT = path.join(__dirname, "..", "uploads", "cfm-workspaces");
const MAX_TEXT_PREVIEW_SIZE = 1024 * 1024;
const MAX_SEARCH_RESULTS = 75;
const ALLOWED_EXTENSIONS = new Set([
  ".html",
  ".css",
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".json",
  ".md",
  ".txt",
  ".py",
  ".java",
  ".cpp",
  ".c",
  ".php",
]);

fs.mkdirSync(WORKSPACE_ROOT, { recursive: true });

function normalizeRelativePath(input = "") {
  const normalized = String(input || "").replace(/\\/g, "/").replace(/^\/+/, "").trim();

  if (!normalized || normalized.includes("..")) {
    throw new Error("Invalid path.");
  }

  return normalized
    .split("/")
    .filter(Boolean)
    .join("/");
}

function isAllowedFile(relativePath) {
  const lowerPath = relativePath.toLowerCase();

  if (lowerPath.endsWith(".env.example")) {
    return true;
  }

  return ALLOWED_EXTENSIONS.has(path.extname(lowerPath));
}

function getWorkspaceRoot(companyMongoId, workspaceId) {
  const safeWorkspaceId = String(workspaceId || "").replace(/[^a-zA-Z0-9-_]/g, "");
  if (!safeWorkspaceId) {
    throw new Error("Workspace ID is required.");
  }

  return path.join(WORKSPACE_ROOT, String(companyMongoId), safeWorkspaceId);
}

function resolveWorkspacePath(companyMongoId, workspaceId, targetPath = "") {
  const workspaceRoot = getWorkspaceRoot(companyMongoId, workspaceId);
  const relativePath = targetPath ? normalizeRelativePath(targetPath) : "";
  const absolutePath = path.resolve(workspaceRoot, relativePath);

  if (!absolutePath.startsWith(workspaceRoot)) {
    throw new Error("Invalid path.");
  }

  return { workspaceRoot, relativePath, absolutePath };
}

function listDirectoryTree(baseAbsolutePath, baseRelativePath = "") {
  return fs
    .readdirSync(baseAbsolutePath, { withFileTypes: true })
    .sort((left, right) => Number(right.isDirectory()) - Number(left.isDirectory()) || left.name.localeCompare(right.name))
    .map((entry) => {
      const nextRelativePath = [baseRelativePath, entry.name].filter(Boolean).join("/").replace(/\\/g, "/");
      if (entry.isDirectory()) {
        return {
          name: entry.name,
          itemType: "folder",
          relativePath: nextRelativePath,
          children: listDirectoryTree(path.join(baseAbsolutePath, entry.name), nextRelativePath),
        };
      }

      return {
        name: entry.name,
        itemType: "file",
        relativePath: nextRelativePath,
      };
    });
}

function listDirectoryItems(baseAbsolutePath, baseRelativePath = "") {
  return fs
    .readdirSync(baseAbsolutePath, { withFileTypes: true })
    .sort((left, right) => Number(right.isDirectory()) - Number(left.isDirectory()) || left.name.localeCompare(right.name))
    .map((entry) => ({
      name: entry.name,
      itemType: entry.isDirectory() ? "folder" : "file",
      relativePath: [baseRelativePath, entry.name].filter(Boolean).join("/").replace(/\\/g, "/"),
    }));
}

function buildOpenPayload(companyMongoId, workspaceId, targetPath = "") {
  const { absolutePath, relativePath } = resolveWorkspacePath(companyMongoId, workspaceId, targetPath);
  const stats = fs.statSync(absolutePath);

  if (stats.isDirectory()) {
    return {
      workspaceId,
      targetPath: relativePath,
      itemType: "folder",
      items: listDirectoryItems(absolutePath, relativePath),
      tree: listDirectoryTree(absolutePath, relativePath),
    };
  }

  const safePreview = stats.size <= MAX_TEXT_PREVIEW_SIZE && isAllowedFile(relativePath);
  return {
    workspaceId,
    targetPath: relativePath,
    itemType: "file",
    fileName: path.basename(absolutePath),
    content: safePreview ? fs.readFileSync(absolutePath, "utf8") : "",
    previewAvailable: safePreview,
  };
}

async function saveRecentActivity(companyMongoId, targetPath, itemType, action) {
  const cleanPath = String(targetPath || "").trim();
  if (!cleanPath) {
    return;
  }

  const company = await Company.findById(companyMongoId).select("recentFiles");
  if (!company) {
    return;
  }

  const remaining = (company.recentFiles || []).filter(
    (item) => item.targetPath !== cleanPath || item.action !== action
  );

  company.recentFiles = [
    {
      targetPath: cleanPath,
      itemType,
      action,
      lastAccessedAt: new Date(),
    },
    ...remaining,
  ].slice(0, 12);

  await company.save();
}

function walkSearch(baseAbsolutePath, baseRelativePath, query, matches) {
  if (matches.length >= MAX_SEARCH_RESULTS) {
    return;
  }

  const entries = fs.readdirSync(baseAbsolutePath, { withFileTypes: true });

  for (const entry of entries) {
    if (matches.length >= MAX_SEARCH_RESULTS) {
      return;
    }

    const relativePath = [baseRelativePath, entry.name].filter(Boolean).join("/").replace(/\\/g, "/");
    if (entry.name.toLowerCase().includes(query)) {
      matches.push({
        name: entry.name,
        relativePath,
        itemType: entry.isDirectory() ? "folder" : "file",
      });
    }

    if (entry.isDirectory()) {
      walkSearch(path.join(baseAbsolutePath, entry.name), relativePath, query, matches);
    }
  }
}

router.use(authMiddleware, requireCompanyRole);

router.post("/workspace/upload", workspaceUpload.array("workspaceFiles", 500), async (req, res) => {
  try {
    const files = req.files || [];
    if (!files.length) {
      return res.status(400).json({ message: "Choose at least one coding file or folder." });
    }

    const rawRelativePaths = Array.isArray(req.body.relativePaths)
      ? req.body.relativePaths
      : req.body.relativePaths
        ? [req.body.relativePaths]
        : [];

    const workspaceId = crypto.randomBytes(6).toString("hex");
    const workspaceRoot = getWorkspaceRoot(req.user.companyMongoId, workspaceId);
    fs.mkdirSync(workspaceRoot, { recursive: true });

    let savedFiles = 0;
    let workspaceLabel = "Uploaded workspace";

    files.forEach((file, index) => {
      const relativePath = normalizeRelativePath(rawRelativePaths[index] || file.originalname);

      if (!isAllowedFile(relativePath)) {
        return;
      }

      const topFolderName = relativePath.split("/")[0];
      if (topFolderName) {
        workspaceLabel = topFolderName;
      }

      const outputPath = path.join(workspaceRoot, relativePath);
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      fs.writeFileSync(outputPath, file.buffer);
      savedFiles += 1;
    });

    if (!savedFiles) {
      fs.rmSync(workspaceRoot, { recursive: true, force: true });
      return res.status(400).json({ message: "Only coding and project files are allowed." });
    }

    await saveRecentActivity(req.user.companyMongoId, workspaceLabel, "folder", "upload");

    return res.status(201).json({
      message: "Workspace uploaded successfully.",
      workspaceId,
      workspaceLabel,
      tree: listDirectoryTree(workspaceRoot),
      items: listDirectoryItems(workspaceRoot),
    });
  } catch (error) {
    return res.status(400).json({ message: error.message || "Failed to upload workspace." });
  }
});

router.get("/open", async (req, res) => {
  try {
    const workspaceId = String(req.query.workspaceId || "");
    const targetPath = String(req.query.target || "");
    const payload = buildOpenPayload(req.user.companyMongoId, workspaceId, targetPath);
    await saveRecentActivity(req.user.companyMongoId, payload.targetPath || "workspace", payload.itemType, "open");
    return res.json(payload);
  } catch (error) {
    return res.status(400).json({ message: error.message || "Failed to open file or folder." });
  }
});

router.get("/search", async (req, res) => {
  try {
    const workspaceId = String(req.query.workspaceId || "");
    const query = String(req.query.q || "").trim().toLowerCase();

    if (!workspaceId) {
      return res.status(400).json({ message: "Workspace ID is required." });
    }

    if (!query) {
      return res.status(400).json({ message: "Search query is required." });
    }

    const { workspaceRoot } = resolveWorkspacePath(req.user.companyMongoId, workspaceId);
    const results = [];
    walkSearch(workspaceRoot, "", query, results);
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

router.delete("/recent", async (req, res) => {
  try {
    await Company.findByIdAndUpdate(req.user.companyMongoId, { $set: { recentFiles: [] } });
    return res.json({ message: "Recent files cleared successfully." });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to clear recent files." });
  }
});

module.exports = router;
