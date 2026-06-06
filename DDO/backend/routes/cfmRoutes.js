const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");
const Company = require("../models/Company");
const CfmFileActivity = require("../models/CfmFileActivity");
const CfmFileChange = require("../models/CfmFileChange");
const { authMiddleware, requireCompanyRole } = require("../middleware/companyAuth");
const {
  ensureFeatureSystem,
  isInternalRelativePath,
  listWorkspaceFiles,
  getFeatureTerms,
  getWorkspaceIndex,
  buildConvertPreview,
  applyConvertPreview,
  undoConvert,
  analyzeSyncPreview,
  applySync,
  undoLastSync,
  buildAgenticSearchReport,
  filterConvertPreviewBySelectedPaths,
  buildSearchSuggestions,
} = require("./cfmFeatureUtils");

const router = express.Router();
const workspaceUpload = multer({ storage: multer.memoryStorage(), limits: { files: 500, fileSize: 1024 * 1024 * 3 } });
const WORKSPACE_ROOT = path.join(__dirname, "..", "uploads", "cfm-workspaces");
const MAX_TEXT_PREVIEW_SIZE = 1024 * 1024;
const MAX_SEARCH_RESULTS = 75;
const MASK_REPLACEMENT = "[REDACTED]";
const agenticSearchJobs = new Map();
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
  const lowerPath = String(relativePath || "").toLowerCase();
  if (lowerPath.endsWith(".env.example")) {
    return true;
  }
  return ALLOWED_EXTENSIONS.has(path.extname(lowerPath));
}

function ensureEditableFile(relativePath) {
  if (!isAllowedFile(relativePath)) {
    throw new Error("Only supported code and text files can be edited.");
  }
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
    .filter((entry) => !isInternalRelativePath([baseRelativePath, entry.name].filter(Boolean).join("/")))
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
    .filter((entry) => !isInternalRelativePath([baseRelativePath, entry.name].filter(Boolean).join("/")))
    .sort((left, right) => Number(right.isDirectory()) - Number(left.isDirectory()) || left.name.localeCompare(right.name))
    .map((entry) => ({
      name: entry.name,
      itemType: entry.isDirectory() ? "folder" : "file",
      relativePath: [baseRelativePath, entry.name].filter(Boolean).join("/").replace(/\\/g, "/"),
    }));
}

function maskSecrets(content = "") {
  return String(content || "")
    .replace(/((?:api[_-]?key|token|secret|password)\s*[:=]\s*['"`]?)([^'"`\n\r]+)/gi, `$1${MASK_REPLACEMENT}`)
    .replace(/(Authorization\s*:\s*['"`]Bearer\s+)([^'"`\n\r]+)/gi, `$1${MASK_REPLACEMENT}`);
}

function diffStats(oldContent = "", newContent = "") {
  const oldLines = String(oldContent || "").split("\n");
  const newLines = String(newContent || "").split("\n");
  const oldSet = new Set(oldLines);
  const newSet = new Set(newLines);

  let linesAdded = 0;
  let linesRemoved = 0;

  newLines.forEach((line) => {
    if (!oldSet.has(line)) {
      linesAdded += 1;
    }
  });

  oldLines.forEach((line) => {
    if (!newSet.has(line)) {
      linesRemoved += 1;
    }
  });

  return { linesAdded, linesRemoved };
}

function buildSimpleSummary({ action, filePath, oldContent = "", newContent = "", linesAdded = 0, linesRemoved = 0 }) {
  const fileName = path.basename(filePath || "file");
  if (action === "opened") {
    return `${fileName} was opened in the workspace.`;
  }
  if (action === "added") {
    return `${fileName} was added to the workspace.`;
  }
  if (action === "removed") {
    return `${fileName} was removed from the workspace view.`;
  }
  if (action === "edited") {
    return `${fileName} is being edited with unsaved changes in the workspace.`;
  }
  if (action === "saved") {
    if (oldContent !== newContent) {
      return `${fileName} was updated with ${linesAdded} lines added and ${linesRemoved} lines removed.`;
    }
    return `${fileName} was saved without content changes.`;
  }
  return `${fileName} was updated in the workspace.`;
}

function buildExplainPayload(filePath, oldContent, newContent) {
  const { linesAdded, linesRemoved } = diffStats(oldContent, newContent);
  const fileName = path.basename(filePath || "file");
  const summaryLines = [];

  if (oldContent !== newContent) {
    summaryLines.push(`The file ${fileName} was updated.`);
    summaryLines.push(`${linesAdded} lines were added and ${linesRemoved} lines were removed.`);
  } else {
    summaryLines.push(`The file ${fileName} was reviewed and saved without content changes.`);
  }

  if (/port\s*=|const\s+port/i.test(oldContent + newContent)) {
    summaryLines.push("A configuration value related to the application port may have changed.");
  }
  if (/login|auth|password/i.test(oldContent + newContent)) {
    summaryLines.push("The update affects login or authentication-related code.");
  }
  if (/color|background|border|padding|margin/i.test(oldContent + newContent)) {
    summaryLines.push("The update includes styling or layout-related changes.");
  }
  if (/required|validate|email|phone/i.test(oldContent + newContent)) {
    summaryLines.push("The update touches validation or required input handling.");
  }

  return {
    changeTitle: `${fileName} updated`,
    changeDetails: summaryLines.join("\n"),
    simpleSummary: summaryLines.join(" "),
    linesAdded,
    linesRemoved,
  };
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
      fileInfo: {
        fileName: path.basename(relativePath || absolutePath),
        filePath: relativePath,
        createdAt: stats.birthtime,
        lastModifiedAt: stats.mtime,
      },
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
    fileInfo: {
      fileName: path.basename(absolutePath),
      filePath: relativePath,
      createdAt: stats.birthtime,
      lastModifiedAt: stats.mtime,
    },
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

async function createActivityRecord(req, payload) {
  const filePath = String(payload.filePath || payload.targetPath || "").trim();
  const oldContent = String(payload.oldContent || "");
  const newContent = String(payload.newContent || "");
  const { linesAdded, linesRemoved } = payload.linesAdded != null && payload.linesRemoved != null
    ? { linesAdded: payload.linesAdded, linesRemoved: payload.linesRemoved }
    : diffStats(oldContent, newContent);

  const summary = payload.simpleSummary || buildSimpleSummary({
    action: payload.action,
    filePath,
    oldContent,
    newContent,
    linesAdded,
    linesRemoved,
  });

  return CfmFileActivity.create({
    companyUserId: req.user.companyMongoId,
    companyId: req.user.companyId || "",
    workspaceId: String(payload.workspaceId || ""),
    filePath,
    fileName: path.basename(filePath || payload.fileName || ""),
    action: payload.action || "opened",
    oldContent: maskSecrets(oldContent),
    newContent: maskSecrets(newContent),
    linesAdded,
    linesRemoved,
    simpleSummary: summary,
    changedBy: req.user.companyEmail || req.user.companyId || "Company user",
  });
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
    if (isInternalRelativePath(relativePath)) {
      continue;
    }
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

function summarizeFolderActivity(records, folderPath) {
  const scoped = records.filter((item) => !folderPath || item.filePath.startsWith(folderPath));
  const edited = scoped.filter((item) => item.action === "saved").length;
  const added = scoped.filter((item) => item.action === "added").length;
  const removed = scoped.filter((item) => item.action === "removed").length;
  const renamed = scoped.filter((item) => item.action === "renamed").length;
  const total = edited + added + removed + renamed;

  return {
    totalFilesChanged: total,
    summary: `${total} file activities were tracked in this folder.`,
    details: [
      `${edited} files were edited`,
      `${added} new files were added`,
      `${renamed} files were renamed`,
      `${removed} files were removed from the workspace`,
    ],
  };
}

function createSearchJobKey(companyMongoId, workspaceId, jobId) {
  return `${companyMongoId}:${workspaceId}:${jobId}`;
}

function getSearchJob(companyMongoId, workspaceId, jobId) {
  return agenticSearchJobs.get(createSearchJobKey(companyMongoId, workspaceId, jobId));
}

function setSearchJob(companyMongoId, workspaceId, jobId, job) {
  agenticSearchJobs.set(createSearchJobKey(companyMongoId, workspaceId, jobId), job);
}

function summarizeSearchJob(job) {
  return {
    jobId: job.jobId,
    status: job.status,
    featureName: job.featureName,
    featureSlug: job.featureSlug || "",
    currentFile: job.currentFile || "",
    logs: job.logs,
    summary: job.summary,
    warnings: job.warnings,
    groupedResults: job.groupedResults,
    connections: job.connections,
    preview: job.preview,
    gitHistory: job.gitHistory || [],
    elapsedMs: Date.now() - (job.startedAt || Date.now()),
    mode: job.mode || "smart",
    filters: job.filters || {},
    error: job.error || "",
  };
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

    for (const [index, file] of files.entries()) {
      const relativePath = normalizeRelativePath(rawRelativePaths[index] || file.originalname);
      if (!isAllowedFile(relativePath)) {
        continue;
      }

      const topFolderName = relativePath.split("/")[0];
      if (topFolderName) {
        workspaceLabel = topFolderName;
      }

      const outputPath = path.join(workspaceRoot, relativePath);
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      fs.writeFileSync(outputPath, file.buffer);
      savedFiles += 1;

      await createActivityRecord(req, {
        workspaceId,
        filePath: relativePath,
        fileName: file.originalname,
        action: "added",
        oldContent: "",
        newContent: file.buffer.toString("utf8"),
      });
    }

    if (!savedFiles) {
      fs.rmSync(workspaceRoot, { recursive: true, force: true });
      return res.status(400).json({ message: "Only coding and project files are allowed." });
    }

    ensureFeatureSystem(workspaceRoot);

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

router.post("/workspace/add", workspaceUpload.array("workspaceFiles", 500), async (req, res) => {
  try {
    const workspaceId = String(req.body.workspaceId || "");
    if (!workspaceId) {
      return res.status(400).json({ message: "Workspace ID is required." });
    }

    const files = req.files || [];
    if (!files.length) {
      return res.status(400).json({ message: "Choose at least one coding file." });
    }

    const workspaceRoot = getWorkspaceRoot(req.user.companyMongoId, workspaceId);
    if (!fs.existsSync(workspaceRoot)) {
      return res.status(404).json({ message: "Workspace not found." });
    }

    const rawRelativePaths = Array.isArray(req.body.relativePaths)
      ? req.body.relativePaths
      : req.body.relativePaths
        ? [req.body.relativePaths]
        : [];

    let savedFiles = 0;

    for (const [index, file] of files.entries()) {
      const relativePath = normalizeRelativePath(rawRelativePaths[index] || file.originalname);
      if (!isAllowedFile(relativePath)) {
        continue;
      }

      const outputPath = path.join(workspaceRoot, relativePath);
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      fs.writeFileSync(outputPath, file.buffer);
      savedFiles += 1;

      await createActivityRecord(req, {
        workspaceId,
        filePath: relativePath,
        fileName: file.originalname,
        action: "added",
        oldContent: "",
        newContent: file.buffer.toString("utf8"),
      });
    }

    if (!savedFiles) {
      return res.status(400).json({ message: "Only coding and project files are allowed." });
    }

    ensureFeatureSystem(workspaceRoot);

    return res.json({
      message: `${savedFiles} file${savedFiles === 1 ? "" : "s"} added to workspace.`,
      workspaceId,
      tree: listDirectoryTree(workspaceRoot),
      items: listDirectoryItems(workspaceRoot),
    });
  } catch (error) {
    return res.status(400).json({ message: error.message || "Failed to add files to workspace." });
  }
});

router.post("/workspace/remove", async (req, res) => {
  try {
    const workspaceId = String(req.body.workspaceId || "");
    const targetPath = String(req.body.targetPath || "");
    const { absolutePath, relativePath } = resolveWorkspacePath(req.user.companyMongoId, workspaceId, targetPath);

    if (!relativePath) {
      return res.status(400).json({ message: "Choose a file inside the workspace to remove." });
    }

    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ message: "File not found in this workspace." });
    }

    const stats = fs.statSync(absolutePath);
    if (stats.isDirectory()) {
      return res.status(400).json({ message: "Only files can be removed from the workspace list." });
    }

    const oldContent = isAllowedFile(relativePath) ? fs.readFileSync(absolutePath, "utf8") : "";
    fs.unlinkSync(absolutePath);
    await saveRecentActivity(req.user.companyMongoId, relativePath, "file", "remove");
    await createActivityRecord(req, {
      workspaceId,
      filePath: relativePath,
      action: "removed",
      oldContent,
      newContent: "",
    });

    return res.json({
      message: "File removed from workspace successfully.",
      workspaceId,
      removedPath: relativePath,
      tree: listDirectoryTree(getWorkspaceRoot(req.user.companyMongoId, workspaceId)),
      items: listDirectoryItems(getWorkspaceRoot(req.user.companyMongoId, workspaceId)),
    });
  } catch (error) {
    return res.status(400).json({ message: error.message || "Failed to remove file from workspace." });
  }
});

router.put("/workspace/file", async (req, res) => {
  try {
    const workspaceId = String(req.body.workspaceId || "");
    const filePath = String(req.body.filePath || "");
    const newContent = String(req.body.newContent || "");
    const { absolutePath, relativePath } = resolveWorkspacePath(req.user.companyMongoId, workspaceId, filePath);

    ensureEditableFile(relativePath);

    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ message: "File not found in this workspace." });
    }

    if (fs.statSync(absolutePath).isDirectory()) {
      return res.status(400).json({ message: "Only files can be edited in the workspace." });
    }

    const oldContent = fs.readFileSync(absolutePath, "utf8");
    fs.writeFileSync(absolutePath, newContent, "utf8");
    const { linesAdded, linesRemoved } = diffStats(oldContent, newContent);

    await saveRecentActivity(req.user.companyMongoId, relativePath, "file", "save");
    await createActivityRecord(req, {
      workspaceId,
      filePath: relativePath,
      action: "saved",
      oldContent,
      newContent,
      linesAdded,
      linesRemoved,
    });

    return res.json({
      message: "File saved successfully.",
      filePath: relativePath,
      linesAdded,
      linesRemoved,
      content: newContent,
    });
  } catch (error) {
    return res.status(400).json({ message: error.message || "Failed to save file." });
  }
});

router.post("/files/save-with-commit", async (req, res) => {
  try {
    const workspaceId = String(req.body.workspaceId || "");
    const filePath = String(req.body.filePath || "");
    const newContent = String(req.body.newContent || "");
    const changeTitle = String(req.body.changeTitle || "").trim();
    const changeDetails = String(req.body.changeDetails || "").trim();
    const changeReason = String(req.body.changeReason || "").trim();
    const simpleSummary = String(req.body.simpleSummary || "").trim();
    const { absolutePath, relativePath } = resolveWorkspacePath(req.user.companyMongoId, workspaceId, filePath);

    ensureEditableFile(relativePath);

    if (changeTitle.length < 5 || changeTitle.length > 100) {
      return res.status(400).json({ message: "Change title must be between 5 and 100 characters." });
    }

    if (changeDetails.length < 10 || changeDetails.length > 1000) {
      return res.status(400).json({ message: "Change details must be between 10 and 1000 characters." });
    }

    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ message: "File not found in this workspace." });
    }

    if (fs.statSync(absolutePath).isDirectory()) {
      return res.status(400).json({ message: "Only files can be saved in the workspace." });
    }

    const oldContent = fs.readFileSync(absolutePath, "utf8");
    fs.writeFileSync(absolutePath, newContent, "utf8");
    const { linesAdded, linesRemoved } = diffStats(oldContent, newContent);
    const fallbackSummary = buildSimpleSummary({
      action: "saved",
      filePath: relativePath,
      oldContent,
      newContent,
      linesAdded,
      linesRemoved,
    });

    const change = await CfmFileChange.create({
      companyUserId: req.user.companyMongoId,
      companyId: req.user.companyId || "",
      workspaceId,
      fileName: path.basename(relativePath),
      filePath: relativePath,
      changedBy: req.user.companyId || "Company user",
      changedByEmail: req.user.companyEmail || "",
      oldContent: maskSecrets(oldContent),
      newContent: maskSecrets(newContent),
      linesAdded,
      linesRemoved,
      changeTitle,
      changeDetails,
      changeReason,
      simpleSummary: simpleSummary || fallbackSummary,
      status: "submitted",
    });

    await saveRecentActivity(req.user.companyMongoId, relativePath, "file", "save");
    await createActivityRecord(req, {
      workspaceId,
      filePath: relativePath,
      action: "saved",
      oldContent,
      newContent,
      linesAdded,
      linesRemoved,
      simpleSummary: simpleSummary || fallbackSummary,
    });

    return res.json({
      message: "File saved and change submitted successfully",
      filePath: relativePath,
      content: newContent,
      linesAdded,
      linesRemoved,
      change,
    });
  } catch (error) {
    return res.status(400).json({ message: error.message || "Failed to save file with commit." });
  }
});

router.get("/open", async (req, res) => {
  try {
    const workspaceId = String(req.query.workspaceId || "");
    const targetPath = String(req.query.target || "");
    const payload = buildOpenPayload(req.user.companyMongoId, workspaceId, targetPath);
    await saveRecentActivity(req.user.companyMongoId, payload.targetPath || "workspace", payload.itemType, "open");
    await createActivityRecord(req, {
      workspaceId,
      filePath: payload.targetPath || "",
      fileName: payload.fileName || path.basename(payload.targetPath || ""),
      action: "opened",
      oldContent: payload.content || "",
      newContent: payload.content || "",
    });
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

router.post("/search/agent/start", async (req, res) => {
  try {
    const workspaceId = String(req.body.workspaceId || "");
    const featureName = String(req.body.featureName || "").trim();
    const mode = String(req.body.mode || "smart").trim().toLowerCase();
    const categoryFilters = Array.isArray(req.body.categoryFilters) ? req.body.categoryFilters : [];
    const typeFilters = Array.isArray(req.body.typeFilters) ? req.body.typeFilters : [];
    const includeIgnored = Boolean(req.body.includeIgnored);
    if (!workspaceId) {
      return res.status(400).json({ message: "Workspace ID is required." });
    }
    if (!featureName) {
      return res.status(400).json({ message: "Feature name is required." });
    }

    for (const [key, activeJob] of agenticSearchJobs.entries()) {
      if (key.startsWith(`${req.user.companyMongoId}:${workspaceId}:`) && activeJob.status === "running") {
        activeJob.cancelSignal.cancelled = true;
        activeJob.status = "stopping";
      }
    }

    const { workspaceRoot } = resolveWorkspacePath(req.user.companyMongoId, workspaceId);
    const jobId = crypto.randomBytes(6).toString("hex");
    const job = {
      jobId,
      workspaceId,
      featureName,
      mode,
      featureSlug: "",
      status: "running",
      startedAt: Date.now(),
      currentFile: "",
      logs: [],
      summary: {
        filesIndexed: 0,
        filesScanned: 0,
        filesSearched: 0,
        relatedFilesFound: 0,
        relatedCodeSections: 0,
        dependenciesFound: 0,
        possibleConflicts: 0,
      },
      warnings: [],
      groupedResults: [],
      connections: [],
      preview: null,
      gitHistory: [],
      filters: {
        categoryFilters,
        typeFilters,
        includeIgnored,
      },
      error: "",
      cancelSignal: { cancelled: false },
    };

    setSearchJob(req.user.companyMongoId, workspaceId, jobId, job);

    const index = getWorkspaceIndex(workspaceRoot, {
      includeIgnored,
      changedOnly: mode === "changed",
    });
    const files = index.indexedFiles.filter((file) => !file.relativePath.startsWith("features/"));
    const terms = getFeatureTerms(featureName);
    const fileLogsSeen = new Set();
    let currentIndex = 0;
    job.summary.filesIndexed = index.filesIndexed;

    job.logs.push({
      id: `${Date.now()}-0`,
      message: "Searching DDO project...",
      level: "info",
      filePath: "",
      createdAt: new Date().toISOString(),
    });

    const processBatch = () => {
      try {
        if (job.cancelSignal.cancelled) {
          const report = buildAgenticSearchReport(workspaceRoot, featureName, {
            mode,
            categoryFilters,
            typeFilters,
            includeIgnored,
            changedOnly: mode === "changed",
          });
          job.status = "stopped";
          job.featureSlug = report.featureSlug;
          job.summary = report.summary;
          job.warnings = report.warnings;
          job.groupedResults = report.groupedResults;
          job.connections = report.connections;
          job.preview = report.preview;
          job.gitHistory = report.gitHistory;
          return;
        }

        const batch = files.slice(currentIndex, currentIndex + 4);
        batch.forEach((file) => {
          job.currentFile = file.relativePath;
          if (!fileLogsSeen.has(file.relativePath)) {
            fileLogsSeen.add(file.relativePath);
            job.summary.filesScanned = fileLogsSeen.size;
            job.logs.push({
              id: `${Date.now()}-${job.logs.length + 1}`,
              message: `Opened ${file.relativePath}`,
              level: "info",
              filePath: file.relativePath,
              createdAt: new Date().toISOString(),
            });
          }

          const lowerPath = file.relativePath.toLowerCase();
          if (terms.some((term) => lowerPath.includes(term))) {
            job.logs.push({
              id: `${Date.now()}-${job.logs.length + 1}`,
              message: `Found related file match in ${file.relativePath}`,
              level: "success",
              filePath: file.relativePath,
              createdAt: new Date().toISOString(),
            });
          }

          if (/\.(js|jsx|ts|tsx|css|html|json|md|txt|py|php|rs)$/i.test(file.relativePath)) {
            const content = String(file.content || "").toLowerCase();
            if (terms.some((term) => content.includes(term))) {
              job.logs.push({
                id: `${Date.now()}-${job.logs.length + 1}`,
                message: `Found related code logic in ${file.relativePath}`,
                level: "success",
                filePath: file.relativePath,
                createdAt: new Date().toISOString(),
              });
            }
            if (/charging|ischarging|navigator\.getbattery|systembattery|powerstatus|batterypercentage|batterylevel/.test(content)) {
              job.logs.push({
                id: `${Date.now()}-${job.logs.length + 1}`,
                message: `Found battery or power logic in ${file.relativePath}`,
                level: "success",
                filePath: file.relativePath,
                createdAt: new Date().toISOString(),
              });
            }
            if (/import |require\(|export /.test(content)) {
              job.logs.push({
                id: `${Date.now()}-${job.logs.length + 1}`,
                message: "Checking imports and dependencies",
                level: "info",
                filePath: file.relativePath,
                createdAt: new Date().toISOString(),
              });
            }
          }
        });

        currentIndex += batch.length;
        if (currentIndex < files.length) {
          setTimeout(processBatch, 40);
          return;
        }

        const report = buildAgenticSearchReport(workspaceRoot, featureName, {
          mode,
          categoryFilters,
          typeFilters,
          includeIgnored,
          changedOnly: mode === "changed",
        });
        job.status = "completed";
        job.featureSlug = report.featureSlug;
        job.summary = report.summary;
        job.warnings = report.warnings;
        job.groupedResults = report.groupedResults;
        job.connections = report.connections;
        job.preview = report.preview;
        job.gitHistory = report.gitHistory;
        job.logs = [...job.logs, ...report.logs.filter((entry) => entry.level === "success").slice(-12)];
      } catch (error) {
        job.status = "failed";
        job.error = error.message || "Agentic search failed.";
      }
    };

    setTimeout(processBatch, 20);

    return res.status(202).json({
      jobId,
      status: job.status,
    });
  } catch (error) {
    return res.status(400).json({ message: error.message || "Failed to start AI search." });
  }
});

router.get("/search/agent/status", async (req, res) => {
  try {
    const workspaceId = String(req.query.workspaceId || "");
    const jobId = String(req.query.jobId || "");
    const job = getSearchJob(req.user.companyMongoId, workspaceId, jobId);
    if (!job) {
      return res.status(404).json({ message: "Search job not found." });
    }
    return res.json(summarizeSearchJob(job));
  } catch (error) {
    return res.status(400).json({ message: error.message || "Failed to load AI search status." });
  }
});

router.get("/search/agent/suggestions", async (req, res) => {
  try {
    const workspaceId = String(req.query.workspaceId || "");
    const query = String(req.query.q || "").trim();
    const includeIgnored = String(req.query.includeIgnored || "") === "true";
    if (!workspaceId) {
      return res.status(400).json({ message: "Workspace ID is required." });
    }
    const { workspaceRoot } = resolveWorkspacePath(req.user.companyMongoId, workspaceId);
    const suggestions = buildSearchSuggestions(workspaceRoot, query, { includeIgnored });
    return res.json({ suggestions });
  } catch (error) {
    return res.status(400).json({ message: error.message || "Failed to load search suggestions." });
  }
});

router.post("/search/agent/stop", async (req, res) => {
  try {
    const workspaceId = String(req.body.workspaceId || "");
    const jobId = String(req.body.jobId || "");
    const job = getSearchJob(req.user.companyMongoId, workspaceId, jobId);
    if (!job) {
      return res.status(404).json({ message: "Search job not found." });
    }
    job.cancelSignal.cancelled = true;
    if (job.status === "running") {
      job.status = "stopping";
    }
    return res.json({
      message: "AI search stop requested.",
      status: job.status,
    });
  } catch (error) {
    return res.status(400).json({ message: error.message || "Failed to stop AI search." });
  }
});

router.get("/activity/:workspaceId", async (req, res) => {
  try {
    const workspaceId = String(req.params.workspaceId || "");
    const actionFilter = String(req.query.action || "all");
    const filePath = String(req.query.filePath || "").trim();
    const itemType = String(req.query.itemType || "");

    const filter = {
      companyUserId: req.user.companyMongoId,
      workspaceId,
    };

    if (filePath) {
      filter.filePath = filePath;
    }

    if (actionFilter !== "all") {
      filter.action = actionFilter;
    }

    const activities = await CfmFileActivity.find(filter).sort({ createdAt: -1 }).limit(100).lean();
    const folderSummary = itemType === "folder" ? summarizeFolderActivity(activities, filePath) : null;

    return res.json({ activities, folderSummary });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to load file activity." });
  }
});

router.get("/activity/:workspaceId/file", async (req, res) => {
  try {
    const workspaceId = String(req.params.workspaceId || "");
    const filePath = String(req.query.filePath || "").trim();

    if (!filePath) {
      return res.status(400).json({ message: "File path is required." });
    }

    const activities = await CfmFileActivity.find({
      companyUserId: req.user.companyMongoId,
      workspaceId,
      filePath,
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return res.json({ activities });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to load file history." });
  }
});

router.post("/activity", async (req, res) => {
  try {
    const activity = await createActivityRecord(req, {
      workspaceId: req.body.workspaceId,
      filePath: req.body.filePath,
      fileName: req.body.fileName,
      action: req.body.action,
      oldContent: req.body.oldContent,
      newContent: req.body.newContent,
      linesAdded: req.body.linesAdded,
      linesRemoved: req.body.linesRemoved,
      simpleSummary: req.body.simpleSummary,
    });

    return res.status(201).json({ message: "Activity saved successfully.", activity });
  } catch (error) {
    return res.status(400).json({ message: error.message || "Failed to save activity." });
  }
});

router.get("/compare/:workspaceId/file", async (req, res) => {
  try {
    const workspaceId = String(req.params.workspaceId || "");
    const filePath = String(req.query.filePath || "").trim();

    if (!filePath) {
      return res.status(400).json({ message: "File path is required." });
    }

    const latestSaved = await CfmFileActivity.findOne({
      companyUserId: req.user.companyMongoId,
      workspaceId,
      filePath,
      action: "saved",
    })
      .sort({ createdAt: -1 })
      .lean();

    if (!latestSaved) {
      return res.status(404).json({ message: "No saved changes found for this file yet." });
    }

    return res.json({
      previousContent: latestSaved.oldContent || "",
      currentContent: latestSaved.newContent || "",
      linesAdded: latestSaved.linesAdded || 0,
      linesRemoved: latestSaved.linesRemoved || 0,
      simpleSummary: latestSaved.simpleSummary || "",
      changedAt: latestSaved.createdAt,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to compare file changes." });
  }
});

router.post("/files/explain-changes", async (req, res) => {
  try {
    const filePath = String(req.body.filePath || "").trim();
    const oldContent = String(req.body.oldContent || "");
    const newContent = String(req.body.newContent || "");
    return res.json(buildExplainPayload(filePath, oldContent, newContent));
  } catch (error) {
    return res.status(400).json({ message: error.message || "Failed to explain file changes." });
  }
});

router.post("/explain-changes", async (req, res) => {
  try {
    const filePath = String(req.body.filePath || "").trim();
    const oldContent = String(req.body.oldContent || "");
    const newContent = String(req.body.newContent || "");
    return res.json(buildExplainPayload(filePath, oldContent, newContent));
  } catch (error) {
    return res.status(400).json({ message: error.message || "Failed to explain file changes." });
  }
});

router.get("/changes/:workspaceId", async (req, res) => {
  try {
    const workspaceId = String(req.params.workspaceId || "");
    const filter = { companyUserId: req.user.companyMongoId };
    if (workspaceId !== "all") {
      filter.workspaceId = workspaceId;
    }

    const changes = await CfmFileChange.find(filter).sort({ createdAt: -1 }).limit(100).lean();
    return res.json({ changes });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to load submitted file changes." });
  }
});

router.patch("/changes/:changeId/status", async (req, res) => {
  try {
    const status = String(req.body.status || "").trim();
    if (!["submitted", "reviewed", "approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid change status." });
    }

    const change = await CfmFileChange.findOneAndUpdate(
      { _id: req.params.changeId, companyUserId: req.user.companyMongoId },
      { $set: { status } },
      { new: true }
    );

    if (!change) {
      return res.status(404).json({ message: "Submitted file change not found." });
    }

    return res.json({ message: "Change status updated successfully.", change });
  } catch (error) {
    return res.status(400).json({ message: error.message || "Failed to update change status." });
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

router.post("/feature/convert/preview", async (req, res) => {
  try {
    const workspaceId = String(req.body.workspaceId || "");
    const featureName = String(req.body.featureName || "").trim();
    const { workspaceRoot } = resolveWorkspacePath(req.user.companyMongoId, workspaceId);
    const preview = buildConvertPreview(workspaceRoot, featureName);
    return res.json(preview);
  } catch (error) {
    return res.status(400).json({ message: error.message || "Failed to analyze feature conversion." });
  }
});

router.post("/feature/convert/apply", async (req, res) => {
  try {
    const workspaceId = String(req.body.workspaceId || "");
    const featureName = String(req.body.featureName || "").trim();
    const selectedPaths = Array.isArray(req.body.selectedPaths) ? req.body.selectedPaths : [];
    const { workspaceRoot } = resolveWorkspacePath(req.user.companyMongoId, workspaceId);
    const preview = filterConvertPreviewBySelectedPaths(buildConvertPreview(workspaceRoot, featureName), selectedPaths);
    const result = applyConvertPreview(workspaceRoot, preview);
    return res.json({
      message: `${preview.featureName} feature folder was created successfully.`,
      featureSlug: preview.featureSlug,
      featureFolder: result.featureFolder,
      tree: listDirectoryTree(workspaceRoot),
      preview,
    });
  } catch (error) {
    return res.status(400).json({ message: error.message || "Failed to convert feature." });
  }
});

router.post("/feature/convert/undo", async (req, res) => {
  try {
    const workspaceId = String(req.body.workspaceId || "");
    const featureSlug = String(req.body.featureSlug || "").trim();
    const { workspaceRoot } = resolveWorkspacePath(req.user.companyMongoId, workspaceId);
    const result = undoConvert(workspaceRoot, featureSlug);
    return res.json({
      ...result,
      tree: listDirectoryTree(workspaceRoot),
    });
  } catch (error) {
    return res.status(400).json({ message: error.message || "Failed to undo feature conversion." });
  }
});

router.post("/feature/sync/preview", async (req, res) => {
  try {
    const workspaceId = String(req.body.workspaceId || "");
    const featureSlug = String(req.body.featureSlug || "").trim();
    const { workspaceRoot } = resolveWorkspacePath(req.user.companyMongoId, workspaceId);
    const preview = analyzeSyncPreview(workspaceRoot, featureSlug);
    return res.json(preview);
  } catch (error) {
    return res.status(400).json({ message: error.message || "Failed to preview sync changes." });
  }
});

router.post("/feature/sync/apply", async (req, res) => {
  try {
    const workspaceId = String(req.body.workspaceId || "");
    const featureSlug = String(req.body.featureSlug || "").trim();
    const conflictResolutions = req.body.conflictResolutions && typeof req.body.conflictResolutions === "object"
      ? req.body.conflictResolutions
      : {};
    const { workspaceRoot } = resolveWorkspacePath(req.user.companyMongoId, workspaceId);
    const result = applySync(workspaceRoot, featureSlug, { conflictResolutions });
    return res.json({
      ...result,
      tree: listDirectoryTree(workspaceRoot),
    });
  } catch (error) {
    return res.status(400).json({ message: error.message || "Failed to sync feature to app." });
  }
});

router.post("/feature/sync/undo", async (req, res) => {
  try {
    const workspaceId = String(req.body.workspaceId || "");
    const featureSlug = String(req.body.featureSlug || "").trim();
    const { workspaceRoot } = resolveWorkspacePath(req.user.companyMongoId, workspaceId);
    const backup = undoLastSync(workspaceRoot, featureSlug);
    return res.json({
      message: "Last sync was undone successfully.",
      backupId: backup.backupId,
      tree: listDirectoryTree(workspaceRoot),
    });
  } catch (error) {
    return res.status(400).json({ message: error.message || "Failed to undo last sync." });
  }
});

module.exports = router;
