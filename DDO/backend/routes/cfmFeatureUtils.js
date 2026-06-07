const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const childProcess = require("child_process");

const INTERNAL_DIR_NAME = ".cfm-system";
const FEATURE_ROOT_NAME = "features";
const FEATURE_META_DIR = "feature-manifests";
const FEATURE_BACKUP_DIR = "feature-backups";
const DEFAULT_IGNORED_DIRS = new Set(["node_modules", ".git", "dist", "build", ".cache", ".next", "coverage"]);
const DEFAULT_IGNORED_FILES = [/\.min\./i, /\.map$/i, /package-lock\.json$/i];
const workspaceIndexCache = new Map();
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".ico"]);
const STYLE_EXTENSIONS = new Set([".css", ".scss", ".sass", ".less"]);
const CODE_EXTENSIONS = new Set([".html", ".css", ".js", ".jsx", ".ts", ".tsx", ".json", ".md", ".txt", ".py", ".java", ".cpp", ".c", ".php", ".rs"]);
const COMMENT_STYLES = {
  ".html": { open: "<!-- ", close: " -->" },
  ".md": { open: "<!-- ", close: " -->" },
  ".css": { open: "/* ", close: " */" },
  ".js": { open: "/* ", close: " */" },
  ".jsx": { open: "/* ", close: " */" },
  ".ts": { open: "/* ", close: " */" },
  ".tsx": { open: "/* ", close: " */" },
  ".json": { open: "/* ", close: " */" },
  ".txt": { open: "# ", close: "" },
  ".py": { open: "# ", close: "" },
  ".java": { open: "/* ", close: " */" },
  ".cpp": { open: "/* ", close: " */" },
  ".c": { open: "/* ", close: " */" },
  ".php": { open: "/* ", close: " */" },
};
const FEATURE_ALIAS_MAP = {
  battery: [
    "batterystatus",
    "batteryicon",
    "batterylevel",
    "batterypercentage",
    "batterypercent",
    "charging",
    "ischarging",
    "powerstatus",
    "powerlevel",
    "navigator.getbattery",
    "systembattery",
    "chargelevel",
    "charge",
  ],
  login: [
    "signin",
    "signup",
    "auth",
    "authenticate",
    "authentication",
    "password",
    "session",
    "token",
    "credential",
  ],
  spotify: [
    "musicplayer",
    "player",
    "playback",
    "track",
    "album",
    "artist",
    "spotifyapi",
  ],
  wifi: [
    "wireless",
    "network",
    "signal",
    "internet",
    "ssid",
    "connectionstatus",
  ],
  "search-bar": [
    "searchinput",
    "searchbox",
    "query",
    "filter",
    "voice search",
    "recognition",
  ],
};

function safeSlug(input = "") {
  return String(input || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function normalizeRelativePath(input = "") {
  return String(input || "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .split("/")
    .filter(Boolean)
    .join("/");
}

function getInternalRoot(workspaceRoot) {
  return path.join(workspaceRoot, INTERNAL_DIR_NAME);
}

function getFeatureManifestPath(workspaceRoot, featureSlug) {
  return path.join(getInternalRoot(workspaceRoot), FEATURE_META_DIR, `${featureSlug}.json`);
}

function getBackupRoot(workspaceRoot) {
  return path.join(getInternalRoot(workspaceRoot), FEATURE_BACKUP_DIR);
}

function ensureFeatureSystem(workspaceRoot) {
  ensureDir(path.join(getInternalRoot(workspaceRoot), FEATURE_META_DIR));
  ensureDir(getBackupRoot(workspaceRoot));
  ensureDir(path.join(workspaceRoot, FEATURE_ROOT_NAME));
}

function isInternalRelativePath(relativePath = "") {
  const normalized = normalizeRelativePath(relativePath);
  return normalized === INTERNAL_DIR_NAME || normalized.startsWith(`${INTERNAL_DIR_NAME}/`);
}

function getFeatureFolderPath(workspaceRoot, featureSlug) {
  return path.join(workspaceRoot, FEATURE_ROOT_NAME, featureSlug);
}

function readJsonIfExists(filePath, fallback = null) {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }

  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function fileHashFromBuffer(buffer) {
  return crypto.createHash("sha1").update(buffer).digest("hex");
}

function readFileSnapshot(absolutePath, extension) {
  const isBinary = IMAGE_EXTENSIONS.has(extension);
  if (isBinary) {
    const buffer = fs.readFileSync(absolutePath);
    return {
      isBinary: true,
      buffer,
      text: "",
      hash: fileHashFromBuffer(buffer),
    };
  }

  const text = fs.readFileSync(absolutePath, "utf8");
  return {
    isBinary: false,
    buffer: null,
    text,
    hash: fileHashFromBuffer(Buffer.from(text, "utf8")),
  };
}

function writeJson(filePath, data) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

function getFeatureTerms(featureName = "") {
  const raw = String(featureName || "").trim().toLowerCase();
  const words = raw
    .split(/[^a-z0-9]+/g)
    .map((part) => part.trim())
    .filter(Boolean);
  const slug = safeSlug(raw);
  const compact = raw.replace(/[^a-z0-9]+/g, "");
  const set = new Set([raw, slug, compact, ...words]);

  for (const word of words) {
    if (word.endsWith("s") && word.length > 3) {
      set.add(word.slice(0, -1));
    } else if (word.length > 2) {
      set.add(`${word}s`);
    }
  }

  const aliasKey = slug || words.join("-");
  (FEATURE_ALIAS_MAP[aliasKey] || []).forEach((item) => set.add(item.toLowerCase()));

  return [...set].filter(Boolean);
}

function categoryLabel(category = "") {
  if (category === "frontend") return "Frontend";
  if (category === "styles") return "Styles";
  if (category === "desktop") return "Desktop / Tauri";
  if (category === "backend") return "Backend";
  if (category === "assets") return "Assets";
  if (category === "config") return "Config";
  if (category === "feature") return "Feature";
  return "Services";
}

function codeSectionLabel(snippet = "", fallbackName = "Related section") {
  const firstLine = String(snippet || "")
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);
  if (!firstLine) {
    return fallbackName;
  }
  const functionMatch = firstLine.match(/(?:function|const|let|var|class)\s+([A-Za-z0-9_]+)/);
  if (functionMatch) {
    return functionMatch[1];
  }
  if (firstLine.length <= 56) {
    return firstLine;
  }
  return `${firstLine.slice(0, 53)}...`;
}

function listWorkspaceFiles(workspaceRoot) {
  const files = [];
  const options = arguments[1] || {};
  const includeIgnored = Boolean(options.includeIgnored);
  const changedOnly = Boolean(options.changedOnly);
  const changedPaths = changedOnly ? getChangedPathsFromGit(workspaceRoot) : null;

  function walk(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const absolutePath = path.join(currentDir, entry.name);
      const relativePath = normalizeRelativePath(path.relative(workspaceRoot, absolutePath));

      if (isInternalRelativePath(relativePath)) {
        continue;
      }

      if (entry.isDirectory()) {
        if (!includeIgnored && DEFAULT_IGNORED_DIRS.has(entry.name.toLowerCase())) {
          continue;
        }
        walk(absolutePath);
        continue;
      }

       if (!includeIgnored && DEFAULT_IGNORED_FILES.some((pattern) => pattern.test(relativePath))) {
        continue;
      }

      if (changedPaths && changedPaths.size && !changedPaths.has(relativePath)) {
        continue;
      }

      const stats = fs.statSync(absolutePath);

      files.push({
        absolutePath,
        relativePath,
        name: entry.name,
        extension: path.extname(entry.name).toLowerCase(),
        size: stats.size,
        mtimeMs: stats.mtimeMs,
      });
    }
  }

  walk(workspaceRoot);
  return files;
}

function getChangedPathsFromGit(workspaceRoot) {
  try {
    const output = childProcess.execFileSync("git", ["status", "--short"], {
      cwd: workspaceRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return new Set(
      output
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => normalizeRelativePath(line.replace(/^[A-Z? ]+/, "").trim()))
        .filter(Boolean)
    );
  } catch {
    return new Set();
  }
}

function fileTypeLabelFromExtension(extension = "") {
  const map = {
    ".js": "JS",
    ".jsx": "JSX",
    ".ts": "TS",
    ".tsx": "TSX",
    ".css": "CSS",
    ".html": "HTML",
    ".json": "JSON",
    ".rs": "Rust",
    ".py": "Python",
  };
  return map[extension] || extension.replace(".", "").toUpperCase();
}

function extractSymbols(content = "") {
  const text = String(content || "");
  const symbols = new Set();
  const patterns = [
    /\bfunction\s+([A-Za-z0-9_]+)/g,
    /\bclass\s+([A-Za-z0-9_]+)/g,
    /\b(?:const|let|var)\s+([A-Za-z0-9_]+)/g,
    /\bexport\s+(?:default\s+)?(?:function|class|const|let|var)?\s*([A-Za-z0-9_]+)/g,
  ];

  for (const pattern of patterns) {
    let match = pattern.exec(text);
    while (match) {
      if (match[1]) {
        symbols.add(match[1]);
      }
      match = pattern.exec(text);
    }
  }

  return [...symbols];
}

function getWorkspaceIndex(workspaceRoot, options = {}) {
  const includeIgnored = Boolean(options.includeIgnored);
  const changedOnly = Boolean(options.changedOnly);
  const cacheKey = `${workspaceRoot}::${includeIgnored ? "all" : "clean"}::${changedOnly ? "changed" : "full"}`;
  const files = listWorkspaceFiles(workspaceRoot, { includeIgnored, changedOnly });
  const fingerprint = files.map((file) => `${file.relativePath}:${file.mtimeMs}:${file.size}`).join("|");
  const cached = workspaceIndexCache.get(cacheKey);
  if (cached && cached.fingerprint === fingerprint) {
    return cached.index;
  }

  const indexedFiles = files.map((file) => {
    const isText = CODE_EXTENSIONS.has(file.extension) || !file.extension;
    const content = isText ? fs.readFileSync(file.absolutePath, "utf8") : "";
    const imports = isText ? parseImports(content) : [];
    const exports = isText ? parseExports(content) : [];
    const symbols = isText ? extractSymbols(content) : [];
    return {
      ...file,
      content,
      contentLower: content.toLowerCase(),
      imports,
      exports,
      symbols,
      category: categorizeRelativePath(file.relativePath, file.extension),
      fileType: fileTypeLabelFromExtension(file.extension),
    };
  });

  const index = {
    workspaceRoot,
    createdAt: Date.now(),
    indexedFiles,
    symbolSet: [...new Set(indexedFiles.flatMap((file) => file.symbols))].sort(),
    filesIndexed: indexedFiles.length,
  };

  workspaceIndexCache.set(cacheKey, { fingerprint, index });
  return index;
}

function matchesMode(indexedFile, query, terms, mode) {
  const fileName = indexedFile.name.toLowerCase();
  const relativePath = indexedFile.relativePath.toLowerCase();
  const content = indexedFile.contentLower;
  const exact = content.includes(query) || fileName.includes(query) || relativePath.includes(query);
  if (mode === "exact") {
    return exact;
  }
  if (mode === "quick") {
    return exact || indexedFile.symbols.some((symbol) => symbol.toLowerCase().includes(query));
  }
  return exact || terms.some((term) => content.includes(term) || fileName.includes(term) || relativePath.includes(term));
}

function resultRelevanceLabel(item, query) {
  const lowerPath = item.filePath.toLowerCase();
  const lowerQuery = query.toLowerCase();
  if (path.basename(lowerPath).toLowerCase().includes(lowerQuery)) return "Exact Match";
  if (item.reason.toLowerCase().includes("imports")) return "Connected Dependency";
  if (item.reason.toLowerCase().includes("matched")) return "Highly Related";
  return "Possible Match";
}

function searchGitHistory(workspaceRoot, query) {
  try {
    const output = childProcess.execFileSync("git", ["log", "--oneline", "--decorate=short", "-S", query, "--all", "-n", "10"], {
      cwd: workspaceRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return output
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => ({ commit: line }));
  } catch {
    return [];
  }
}

function buildSearchSuggestions(workspaceRoot, partialQuery, options = {}) {
  const query = String(partialQuery || "").trim().toLowerCase();
  if (!query) {
    return [];
  }
  const index = getWorkspaceIndex(workspaceRoot, options);
  const suggestions = new Set();
  getFeatureTerms(query).forEach((term) => {
    if (term.toLowerCase().startsWith(query)) {
      suggestions.add(term);
    }
  });
  index.symbolSet.forEach((symbol) => {
    if (symbol.toLowerCase().startsWith(query)) {
      suggestions.add(symbol);
    }
  });
  index.indexedFiles.forEach((file) => {
    const base = path.basename(file.relativePath).replace(/\.[^.]+$/, "");
    if (base.toLowerCase().startsWith(query)) {
      suggestions.add(base);
    }
  });
  return [...suggestions].slice(0, 10);
}

function normalizeSearchTargets(targetPaths = []) {
  return (targetPaths || [])
    .map((target) => ({
      path: normalizeRelativePath(target.path || ""),
      scopeType: target.scopeType === "file" ? "file" : "folder",
    }))
    .filter((target) => target.path || target.scopeType === "folder");
}

function fileMatchesSearchTargets(relativePath = "", targets = []) {
  if (!targets.length) {
    return true;
  }
  const normalizedPath = normalizeRelativePath(relativePath);
  return targets.some((target) => {
    if (!target.path) {
      return true;
    }
    if (target.scopeType === "file") {
      return normalizedPath === target.path;
    }
    return normalizedPath === target.path || normalizedPath.startsWith(`${target.path}/`);
  });
}

function categorizeRelativePath(relativePath = "", extension = "") {
  const normalized = normalizeRelativePath(relativePath).toLowerCase();
  if (normalized.startsWith("features/")) {
    return "feature";
  }
  if (IMAGE_EXTENSIONS.has(extension)) {
    return "assets";
  }
  if (STYLE_EXTENSIONS.has(extension)) {
    return "styles";
  }
  if (/package(-lock)?\.json$/.test(normalized) || /vite\.config|eslint|tsconfig|babel|webpack|rollup|\.env/.test(normalized)) {
    return "config";
  }
  if (/src-tauri\/|\.rs$|tauri/.test(normalized)) {
    return "desktop";
  }
  if (/backend|server|routes|controllers|models|middleware|api/.test(normalized)) {
    return "backend";
  }
  if (/services?\//.test(normalized)) {
    return "services";
  }
  if (/src\/|components\/|pages\/|hooks\/|frontend\/|public\//.test(normalized)) {
    return "frontend";
  }
  if (/assets\//.test(normalized)) {
    return "assets";
  }
  return "services";
}

function escapeRegExp(value = "") {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function countOccurrences(content, term) {
  if (!term) {
    return 0;
  }
  const pattern = new RegExp(escapeRegExp(term), "gi");
  return (String(content || "").match(pattern) || []).length;
}

function extractRelevantSections(content, terms) {
  const text = String(content || "");
  const lines = text.split("\n");
  const matchedIndexes = new Set();

  lines.forEach((line, index) => {
    const lower = line.toLowerCase();
    if (terms.some((term) => lower.includes(term))) {
      for (let pointer = Math.max(0, index - 2); pointer <= Math.min(lines.length - 1, index + 2); pointer += 1) {
        matchedIndexes.add(pointer);
      }
    }
  });

  if (!matchedIndexes.size) {
    return [];
  }

  const sorted = [...matchedIndexes].sort((left, right) => left - right);
  const groups = [];
  let currentGroup = [sorted[0]];

  for (let index = 1; index < sorted.length; index += 1) {
    if (sorted[index] - sorted[index - 1] <= 3) {
      currentGroup.push(sorted[index]);
      continue;
    }
    groups.push(currentGroup);
    currentGroup = [sorted[index]];
  }
  groups.push(currentGroup);

  return groups.map((group) => {
    const start = group[0];
    const end = group[group.length - 1];
    return {
      startLine: start + 1,
      endLine: end + 1,
      snippet: lines.slice(start, end + 1).join("\n").trim(),
    };
  }).filter((section) => section.snippet);
}

function buildMarker(extension, label) {
  const style = COMMENT_STYLES[extension] || COMMENT_STYLES[".txt"];
  return `${style.open}${label}${style.close}`.trimEnd();
}

function buildSnippetContent(file, sections) {
  const extension = file.extension || path.extname(file.name || "").toLowerCase();
  const parts = [
    buildMarker(extension, `CFM FEATURE EXTRACT | source=${file.relativePath}`),
  ];

  sections.forEach((section, index) => {
    parts.push(buildMarker(extension, `CFM_SECTION:${index + 1}:START lines ${section.startLine}-${section.endLine}`));
    parts.push(section.snippet);
    parts.push(buildMarker(extension, `CFM_SECTION:${index + 1}:END`));
    parts.push("");
  });

  return parts.join("\n").trimEnd() + "\n";
}

function parseSnippetContent(content = "") {
  const text = String(content || "");
  const pattern = /CFM_SECTION:(\d+):START[\s\S]*?\n([\s\S]*?)\n.*?CFM_SECTION:\1:END/g;
  const sections = [];
  let match = pattern.exec(text);

  while (match) {
    sections.push({
      sectionIndex: Number(match[1]),
      content: match[2],
    });
    match = pattern.exec(text);
  }

  return sections;
}

function resolveFeatureTargetPath(featureSlug, file, useSnippet) {
  const baseCategory = categorizeRelativePath(file.relativePath, file.extension);
  const fileName = path.basename(file.relativePath);
  const extension = path.extname(fileName);
  const parsedName = path.basename(fileName, extension);
  const nextFileName = useSnippet ? `${parsedName}.${featureSlug}.snippet${extension || ".txt"}` : fileName;
  return normalizeRelativePath(path.join(FEATURE_ROOT_NAME, featureSlug, baseCategory, nextFileName));
}

function scoreFileAgainstFeature(file, content, terms) {
  const lowerPath = file.relativePath.toLowerCase();
  const lowerName = file.name.toLowerCase();
  const lowerContent = String(content || "").toLowerCase();
  let score = 0;
  const reasons = [];

  terms.forEach((term) => {
    if (!term) {
      return;
    }
    if (lowerName.includes(term)) {
      score += 14;
      reasons.push(`File name includes "${term}"`);
    }
    if (lowerPath.includes(term)) {
      score += 8;
      reasons.push(`Path includes "${term}"`);
    }
    const occurrences = countOccurrences(lowerContent, term);
    if (occurrences) {
      score += Math.min(18, occurrences * 2);
      reasons.push(`${occurrences} code match${occurrences === 1 ? "" : "es"} for "${term}"`);
    }
  });

  if (/import|export|require\(/.test(lowerContent)) {
    score += 1;
  }

  return { score, reasons: [...new Set(reasons)] };
}

function parseImports(content = "") {
  const imports = [];
  const text = String(content || "");
  const patterns = [
    /import\s+[^'"]*?from\s+['"]([^'"]+)['"]/g,
    /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /require\(\s*['"]([^'"]+)['"]\s*\)/g,
    /@import\s+['"]([^'"]+)['"]/g,
  ];

  for (const pattern of patterns) {
    let match = pattern.exec(text);
    while (match) {
      imports.push(match[1]);
      match = pattern.exec(text);
    }
  }

  return [...new Set(imports)];
}

function parseExports(content = "") {
  const exports = [];
  const text = String(content || "");
  const patterns = [
    /export\s+(?:default\s+)?(?:function|class|const|let|var)?\s*([A-Za-z0-9_]+)/g,
    /module\.exports\s*=\s*([A-Za-z0-9_]+)/g,
  ];

  for (const pattern of patterns) {
    let match = pattern.exec(text);
    while (match) {
      if (match[1]) {
        exports.push(match[1]);
      }
      match = pattern.exec(text);
    }
  }

  return [...new Set(exports)];
}

function buildConvertPreview(workspaceRoot, featureName) {
  ensureFeatureSystem(workspaceRoot);
  const featureSlug = safeSlug(featureName);
  if (!featureSlug) {
    throw new Error("Feature name is required.");
  }

  const terms = getFeatureTerms(featureName);
  const workspaceFiles = listWorkspaceFiles(workspaceRoot);
  const relatedFiles = [];
  const codeSections = [];
  const plannedFiles = [];

  for (const file of workspaceFiles) {
    if (file.relativePath.startsWith(`${FEATURE_ROOT_NAME}/`)) {
      continue;
    }
    const canReadText = CODE_EXTENSIONS.has(file.extension) || file.extension === "";
    const sourceSnapshot = readFileSnapshot(file.absolutePath, file.extension);
    const content = canReadText ? sourceSnapshot.text : "";
    const match = scoreFileAgainstFeature(file, content, terms);
    if (match.score <= 0) {
      continue;
    }

    const sections = canReadText ? extractRelevantSections(content, terms) : [];
    const linesCount = String(content || "").split("\n").length || 1;
    const coveredLines = sections.reduce((sum, section) => sum + (section.endLine - section.startLine + 1), 0);
    const useSnippet = canReadText && sections.length > 0 && coveredLines < Math.max(8, Math.ceil(linesCount * 0.82));
    const targetPath = resolveFeatureTargetPath(featureSlug, file, useSnippet);
    const category = categorizeRelativePath(file.relativePath, file.extension);
    const imports = canReadText ? parseImports(content) : [];
    const targetAbsolutePath = path.join(workspaceRoot, targetPath);
    const sectionDetails = sections.map((section, index) => ({
      sourcePath: file.relativePath,
      targetPath,
      sectionIndex: index + 1,
      startLine: section.startLine,
      endLine: section.endLine,
      snippet: section.snippet,
    }));

    relatedFiles.push({
      sourcePath: file.relativePath,
      fileName: file.name,
      category,
      targetPath,
      score: match.score,
      reasons: match.reasons,
      itemType: IMAGE_EXTENSIONS.has(file.extension) ? "asset" : "file",
      extractionMode: useSnippet ? "snippet" : "full-copy",
      imports,
    });

    codeSections.push(...sectionDetails);

    plannedFiles.push({
      sourcePath: file.relativePath,
      targetPath,
      targetAbsolutePath,
      category,
      extractionMode: useSnippet ? "snippet" : "full-copy",
      extension: file.extension,
      imports,
      sourceContent: content,
      sourceHash: sourceSnapshot.hash,
      sections: sectionDetails,
      generatedContent: useSnippet ? buildSnippetContent(file, sectionDetails) : content,
      generatedHash: useSnippet ? fileHashFromBuffer(Buffer.from(buildSnippetContent(file, sectionDetails), "utf8")) : sourceSnapshot.hash,
      preferredAppPath: file.relativePath,
      fileName: file.name,
      size: file.size,
    });
  }

  plannedFiles.sort((left, right) => left.targetPath.localeCompare(right.targetPath));
  relatedFiles.sort((left, right) => right.score - left.score || left.sourcePath.localeCompare(right.sourcePath));

  const existing = new Set();
  const dedupedPlannedFiles = plannedFiles.filter((item) => {
    if (existing.has(item.targetPath)) {
      return false;
    }
    existing.add(item.targetPath);
    return true;
  });

  const newFolderStructure = [
    FEATURE_ROOT_NAME,
    normalizeRelativePath(path.join(FEATURE_ROOT_NAME, featureSlug)),
    ...[...new Set(dedupedPlannedFiles.map((item) => path.dirname(item.targetPath)))].sort(),
  ];

  const importsToChange = [];
  dedupedPlannedFiles.forEach((item) => {
    if (item.extractionMode !== "full-copy") {
      return;
    }
    item.imports.forEach((specifier) => {
      if (specifier.startsWith(".")) {
        importsToChange.push({
          filePath: item.targetPath,
          importPath: specifier,
          reason: "Copied file keeps a relative import that may still point back to the workspace source tree.",
        });
      }
    });
  });

  return {
    featureName,
    featureSlug,
    relatedFiles,
    codeSections,
    newFolderStructure,
    filesToCreate: dedupedPlannedFiles.map((item) => ({
      targetPath: item.targetPath,
      sourcePath: item.sourcePath,
      category: item.category,
      extractionMode: item.extractionMode,
    })),
    importsToChange,
    plannedFiles: dedupedPlannedFiles,
  };
}

function buildFeatureConnections(preview) {
  const sourceLookup = new Map(preview.relatedFiles.map((item) => [item.sourcePath, item]));
  const connections = [];

  preview.plannedFiles.forEach((file) => {
    const outgoing = [];
    file.imports.forEach((specifier) => {
      const normalizedSpecifier = specifier.replace(/\\/g, "/");
      const specifierName = normalizedSpecifier.split("/").pop()?.replace(/\.[^.]+$/, "") || normalizedSpecifier;
      preview.relatedFiles.forEach((candidate) => {
        const candidateName = path.basename(candidate.sourcePath).replace(/\.[^.]+$/, "");
        if (candidate.sourcePath !== file.sourcePath && specifierName && candidateName.toLowerCase() === specifierName.toLowerCase()) {
          outgoing.push({
            type: "imports",
            targetPath: candidate.sourcePath,
            label: `imports ${path.basename(candidate.sourcePath)}`,
          });
        }
      });
    });

    const item = sourceLookup.get(file.sourcePath);
    if (item) {
      connections.push({
        sourcePath: file.sourcePath,
        targetPath: item.targetPath,
        category: item.category,
        edges: outgoing,
      });
    }
  });

  return connections;
}

function filterConvertPreviewBySelectedPaths(preview, selectedPaths = []) {
  const selectedSet = new Set((selectedPaths || []).map((item) => normalizeRelativePath(item)));
  if (!selectedSet.size) {
    return preview;
  }

  const relatedFiles = preview.relatedFiles.filter((item) => selectedSet.has(item.sourcePath));
  const codeSections = preview.codeSections.filter((item) => selectedSet.has(item.sourcePath));
  const plannedFiles = preview.plannedFiles.filter((item) => selectedSet.has(item.sourcePath));
  const filesToCreate = preview.filesToCreate.filter((item) => selectedSet.has(item.sourcePath));
  const importsToChange = preview.importsToChange.filter((item) => {
    const match = plannedFiles.find((file) => file.targetPath === item.filePath);
    return Boolean(match);
  });
  const newFolderStructure = [
    FEATURE_ROOT_NAME,
    normalizeRelativePath(path.join(FEATURE_ROOT_NAME, preview.featureSlug)),
    ...[...new Set(plannedFiles.map((item) => path.dirname(item.targetPath)))].sort(),
  ];

  return {
    ...preview,
    relatedFiles,
    codeSections,
    plannedFiles,
    filesToCreate,
    importsToChange,
    newFolderStructure,
  };
}

function buildAgenticSearchReport(workspaceRoot, featureName, options = {}) {
  const logs = [];
  const warnings = [];
  const mode = String(options.mode || "smart").toLowerCase();
  const includeIgnored = Boolean(options.includeIgnored);
  const changedOnly = mode === "changed" || Boolean(options.changedOnly);
  const categoryFilters = new Set((options.categoryFilters || []).map((item) => String(item || "").toLowerCase()).filter(Boolean));
  const typeFilters = new Set((options.typeFilters || []).map((item) => String(item || "").toUpperCase()).filter(Boolean));
  const targetPaths = normalizeSearchTargets(options.targetPaths || []);
  const emit = (message, meta = {}) => {
    const entry = {
      id: `${Date.now()}-${logs.length + 1}`,
      message,
      level: meta.level || "info",
      filePath: meta.filePath || "",
      createdAt: new Date().toISOString(),
    };
    logs.push(entry);
    if (typeof options.onProgress === "function") {
      options.onProgress(entry);
    }
  };

  emit("Searching DDO project...");
  const workspaceIndex = getWorkspaceIndex(workspaceRoot, { includeIgnored, changedOnly });
  const terms = getFeatureTerms(featureName);
  const files = workspaceIndex.indexedFiles.filter((file) => !file.relativePath.startsWith(`${FEATURE_ROOT_NAME}/`) && fileMatchesSearchTargets(file.relativePath, targetPaths));
  const filteredFiles = files.filter((file) => {
    if (categoryFilters.size) {
      const categoryKey = file.category === "desktop" ? "tauri" : file.category;
      if (!categoryFilters.has("all") && !categoryFilters.has(categoryKey)) {
        return false;
      }
    }
    if (typeFilters.size && !typeFilters.has(file.fileType)) {
      return false;
    }
    return matchesMode(file, String(featureName || "").trim().toLowerCase(), terms, mode);
  });
  const matchedSourcePaths = new Set(filteredFiles.map((file) => file.relativePath));
  const preview = filterConvertPreviewBySelectedPaths(buildConvertPreview(workspaceRoot, featureName), [...matchedSourcePaths]);
  const relatedByPath = new Map(preview.relatedFiles.map((item) => [item.sourcePath, item]));
  const searchFiles = mode === "quick" || mode === "exact" ? filteredFiles : files;

  searchFiles.forEach((file, index) => {
    if (options.cancelSignal?.cancelled) {
      emit("Search stopped by user.", { level: "warning" });
      return;
    }

    if (index < 80 || relatedByPath.has(file.relativePath)) {
      emit(`Opened ${file.relativePath}`, { filePath: file.relativePath });
    }

    const related = relatedByPath.get(file.relativePath);
    if (!related) {
      return;
    }

    emit(`Found ${categoryLabel(related.category)} match in ${file.relativePath}`, {
      level: "success",
      filePath: file.relativePath,
    });

    const lowerPath = file.relativePath.toLowerCase();
    if (terms.some((term) => lowerPath.includes(term))) {
      emit(`Matched feature naming in ${file.relativePath}`, {
        level: "success",
        filePath: file.relativePath,
      });
    }

    const content = CODE_EXTENSIONS.has(file.extension) ? fs.readFileSync(file.absolutePath, "utf8").toLowerCase() : "";
    if (/charging|ischarging|chargelevel/.test(content)) {
      emit("Found charging-status logic", { level: "success", filePath: file.relativePath });
    }
    if (/batterypercentage|batterylevel|navigator\.getbattery|systembattery|powerstatus/.test(content)) {
      emit("Found battery percentage logic", { level: "success", filePath: file.relativePath });
    }
    if (/addEventListener|onclick|onchange|keydown|keyup/.test(content)) {
      emit("Found related event listeners", { level: "success", filePath: file.relativePath });
    }
    if (/import |require\(|export /.test(content)) {
      emit("Checking imports and dependencies", { filePath: file.relativePath });
    }
    if (/tauri|rust|src-tauri|command\(/.test(content) || /src-tauri/.test(lowerPath)) {
      emit("Found desktop or system integration", { level: "success", filePath: file.relativePath });
    }
  });

  emit(`Building ${featureName} feature map`, { level: "success" });

  const groupedResults = ["frontend", "styles", "services", "desktop", "backend", "assets", "config"].map((group) => ({
    key: group,
    label: categoryLabel(group),
    items: preview.relatedFiles
      .filter((item) => {
        if (group === "services") {
          return !["frontend", "styles", "desktop", "backend", "assets", "config", "feature"].includes(item.category);
        }
        return item.category === group;
      })
      .map((item) => {
        const planned = preview.plannedFiles.find((entry) => entry.sourcePath === item.sourcePath);
        const sectionMatches = preview.codeSections.filter((section) => section.sourcePath === item.sourcePath);
        return {
          filePath: item.sourcePath,
          targetPath: item.targetPath,
          lineRanges: sectionMatches.map((section) => `${section.startLine}-${section.endLine}`),
          sectionNames: sectionMatches.map((section) => codeSectionLabel(section.snippet, "Related section")),
          reason: item.reasons.join(", ") || "Matched feature-related logic.",
          dependencies: planned?.imports || [],
          exports: planned?.sourceContent ? parseExports(planned.sourceContent) : [],
          codeSections: sectionMatches,
          category: item.category,
          selected: true,
          relevance: "",
        };
      }),
  })).filter((group) => group.items.length);

  groupedResults.forEach((group) => {
    group.items.forEach((item) => {
      item.relevance = resultRelevanceLabel(item, featureName);
    });
    group.items.sort((left, right) => {
      const rank = { "Exact Match": 0, "Highly Related": 1, "Connected Dependency": 2, "Possible Match": 3 };
      return (rank[left.relevance] ?? 9) - (rank[right.relevance] ?? 9);
    });
  });

  const connections = buildFeatureConnections(preview);
  const dependenciesFound = [...new Set(preview.plannedFiles.flatMap((item) => item.imports || []))];
  const possibleConflicts = preview.importsToChange.length;
  const gitHistory = mode === "deep" || categoryFilters.has("git-history")
    ? searchGitHistory(workspaceRoot, String(featureName || "").trim())
    : [];

  if (!groupedResults.length) {
    warnings.push(`No strong ${featureName} matches were found in the current workspace.`);
  }
  if (possibleConflicts) {
    warnings.push(`${possibleConflicts} copied files may need import path review after conversion.`);
  }
  if (gitHistory.length) {
    warnings.push(`${gitHistory.length} Git history matches were found for "${featureName}".`);
  }

  return {
    featureName,
    featureSlug: preview.featureSlug,
    terms,
    groupedResults,
    connections,
    logs,
    warnings,
    gitHistory,
    mode,
    filters: {
      categoryFilters: [...categoryFilters],
      typeFilters: [...typeFilters],
      includeIgnored,
      targetPaths,
    },
    summary: {
      filesIndexed: workspaceIndex.filesIndexed,
      filesScanned: searchFiles.length,
      filesSearched: filteredFiles.length,
      relatedFilesFound: preview.relatedFiles.length,
      relatedCodeSections: preview.codeSections.length,
      dependenciesFound: dependenciesFound.length,
      possibleConflicts,
    },
    preview,
  };
}

function buildFeatureReadme(preview) {
  const lines = [
    `# ${preview.featureName} Feature`,
    "",
    "This folder was generated by the DDO Code File Manager.",
    "",
    "## What is included",
    ...preview.relatedFiles.map((item) => `- \`${item.sourcePath}\` -> \`${item.targetPath}\` (${item.extractionMode})`),
    "",
    "## Notes",
    "- Files in this folder are safe workspace copies or extracted snippets.",
    "- Sync to App uses the hidden CFM manifest stored in `.cfm-system` to map edits back into the main workspace app.",
    "- Snippet files contain section markers so only related code is synced back.",
    "",
  ];

  return `${lines.join("\n")}\n`;
}

function createFeatureManifest(preview) {
  const createdAt = new Date().toISOString();
  return {
    featureName: preview.featureName,
    featureSlug: preview.featureSlug,
    createdAt,
    updatedAt: createdAt,
    mappings: preview.plannedFiles.map((file) => ({
      sourcePath: file.sourcePath,
      targetPath: file.targetPath,
      category: file.category,
      extractionMode: file.extractionMode,
      imports: file.imports,
      preferredAppPath: file.preferredAppPath,
      extension: file.extension,
      sourceContentAtConvert: file.sourceContent,
      sourceHashAtConvert: file.sourceHash,
      generatedContentAtConvert: file.generatedContent,
      generatedHashAtConvert: file.generatedHash,
      sections: file.sections.map((section) => ({
        sectionIndex: section.sectionIndex,
        startLine: section.startLine,
        endLine: section.endLine,
        snippet: section.snippet,
      })),
    })),
    readmePath: normalizeRelativePath(path.join(FEATURE_ROOT_NAME, preview.featureSlug, "README.md")),
    lastSync: null,
  };
}

function applyConvertPreview(workspaceRoot, preview) {
  ensureFeatureSystem(workspaceRoot);
  const featureFolderPath = getFeatureFolderPath(workspaceRoot, preview.featureSlug);
  ensureDir(featureFolderPath);

  preview.plannedFiles.forEach((file) => {
    ensureDir(path.dirname(file.targetAbsolutePath));
    if (IMAGE_EXTENSIONS.has(file.extension)) {
      fs.copyFileSync(path.join(workspaceRoot, file.sourcePath), file.targetAbsolutePath);
      return;
    }
    fs.writeFileSync(file.targetAbsolutePath, file.generatedContent, "utf8");
  });

  const readmePath = path.join(featureFolderPath, "README.md");
  fs.writeFileSync(readmePath, buildFeatureReadme(preview), "utf8");

  const manifest = createFeatureManifest(preview);
  writeJson(getFeatureManifestPath(workspaceRoot, preview.featureSlug), manifest);

  return {
    featureSlug: preview.featureSlug,
    featureFolder: normalizeRelativePath(path.relative(workspaceRoot, featureFolderPath)),
    manifest,
  };
}

function deletePathIfExists(targetPath) {
  if (!fs.existsSync(targetPath)) {
    return;
  }
  const stats = fs.statSync(targetPath);
  if (stats.isDirectory()) {
    fs.rmSync(targetPath, { recursive: true, force: true });
  } else {
    fs.unlinkSync(targetPath);
  }
}

function undoConvert(workspaceRoot, featureSlug) {
  const featureFolderPath = getFeatureFolderPath(workspaceRoot, featureSlug);
  deletePathIfExists(featureFolderPath);
  deletePathIfExists(getFeatureManifestPath(workspaceRoot, featureSlug));
  return {
    featureSlug,
    message: `${featureSlug} feature folder was removed from the workspace.`,
  };
}

function loadFeatureManifest(workspaceRoot, featureSlug) {
  const manifest = readJsonIfExists(getFeatureManifestPath(workspaceRoot, featureSlug));
  if (!manifest) {
    throw new Error("Feature manifest not found. Convert the feature first.");
  }
  return manifest;
}

function getRelativeDestinationForAddedFile(featureSlug, targetPath, category) {
  const fileName = path.basename(targetPath);
  if (category === "backend") {
    return normalizeRelativePath(path.join("backend", "features", featureSlug, fileName));
  }
  if (category === "styles") {
    return normalizeRelativePath(path.join("src", "features", featureSlug, "styles", fileName));
  }
  if (category === "assets") {
    return normalizeRelativePath(path.join("src", "assets", "features", featureSlug, fileName));
  }
  if (category === "config") {
    return normalizeRelativePath(path.join("config", "features", featureSlug, fileName));
  }
  return normalizeRelativePath(path.join("src", "features", featureSlug, fileName));
}

function rebuildSourceFromSnippet(mapping, featureContent) {
  const parsedSections = parseSnippetContent(featureContent);
  const baseLines = String(mapping.sourceContentAtConvert || "").split("\n");
  const orderedSections = (mapping.sections || []).slice().sort((left, right) => right.startLine - left.startLine);

  for (const section of orderedSections) {
    const updated = parsedSections.find((item) => item.sectionIndex === section.sectionIndex);
    if (!updated) {
      continue;
    }
    const replacementLines = String(updated.content || "").replace(/\r/g, "").split("\n");
    baseLines.splice(section.startLine - 1, section.endLine - section.startLine + 1, ...replacementLines);
  }

  return `${baseLines.join("\n")}`.replace(/\n+$/g, "\n");
}

function diffLineSummary(previousContent = "", nextContent = "") {
  const previousLines = String(previousContent || "").split("\n");
  const nextLines = String(nextContent || "").split("\n");
  const previousSet = new Set(previousLines);
  const nextSet = new Set(nextLines);
  let linesAdded = 0;
  let linesRemoved = 0;

  nextLines.forEach((line) => {
    if (!previousSet.has(line)) {
      linesAdded += 1;
    }
  });
  previousLines.forEach((line) => {
    if (!nextSet.has(line)) {
      linesRemoved += 1;
    }
  });

  return { linesAdded, linesRemoved };
}

function collectFeatureFolderFiles(workspaceRoot, featureSlug) {
  const featureRoot = getFeatureFolderPath(workspaceRoot, featureSlug);
  if (!fs.existsSync(featureRoot)) {
    throw new Error("Feature folder not found. Convert the feature first.");
  }

  const files = [];
  function walk(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const absolutePath = path.join(currentDir, entry.name);
      const relativePath = normalizeRelativePath(path.relative(workspaceRoot, absolutePath));
      if (entry.isDirectory()) {
        walk(absolutePath);
        continue;
      }
      files.push({
        absolutePath,
        relativePath,
        extension: path.extname(entry.name).toLowerCase(),
      });
    }
  }
  walk(featureRoot);
  return files;
}

function analyzeSyncPreview(workspaceRoot, featureSlug) {
  ensureFeatureSystem(workspaceRoot);
  const manifest = loadFeatureManifest(workspaceRoot, featureSlug);
  const mappedByTarget = new Map(manifest.mappings.map((mapping) => [mapping.targetPath, mapping]));
  const featureFiles = collectFeatureFolderFiles(workspaceRoot, featureSlug);
  const currentFeaturePaths = new Set(featureFiles.map((file) => file.relativePath));
  const modifiedFiles = [];
  const addedFiles = [];
  const deletedFiles = [];
  const conflicts = [];
  const importChanges = [];

  featureFiles.forEach((file) => {
    if (file.relativePath === manifest.readmePath) {
      return;
    }
    const featureSnapshot = readFileSnapshot(file.absolutePath, file.extension);
    const currentFeatureContent = featureSnapshot.text;
    const mapping = mappedByTarget.get(file.relativePath);

    if (!mapping) {
      const category = categorizeRelativePath(file.relativePath, file.extension);
      const destinationPath = getRelativeDestinationForAddedFile(featureSlug, file.relativePath, category);
      addedFiles.push({
        featurePath: file.relativePath,
        destinationPath,
        category,
        isBinary: featureSnapshot.isBinary,
      });
      return;
    }

    const featureChanged = featureSnapshot.isBinary
      ? featureSnapshot.hash !== String(mapping.generatedHashAtConvert || "")
      : currentFeatureContent !== String(mapping.generatedContentAtConvert || "");
    if (!featureChanged) {
      return;
    }

    const sourceAbsolutePath = path.join(workspaceRoot, mapping.sourcePath);
    const appSnapshot = fs.existsSync(sourceAbsolutePath)
      ? readFileSnapshot(sourceAbsolutePath, mapping.extension)
      : { isBinary: IMAGE_EXTENSIONS.has(mapping.extension), text: "", hash: "" };
    const currentAppContent = appSnapshot.text;
    const proposedContent = mapping.extractionMode === "snippet"
      ? rebuildSourceFromSnippet(mapping, currentFeatureContent)
      : currentFeatureContent;
    const hasConflict = appSnapshot.isBinary
      ? appSnapshot.hash !== String(mapping.sourceHashAtConvert || "")
      : currentAppContent !== String(mapping.sourceContentAtConvert || "");
    const diff = diffLineSummary(currentAppContent, proposedContent);

    if (hasConflict) {
      conflicts.push({
        sourcePath: mapping.sourcePath,
        featurePath: mapping.targetPath,
        appContent: currentAppContent,
        featureContent: currentFeatureContent,
        proposedContent,
        resolution: "merge-both",
      });
    }

    const beforeImports = parseImports(currentAppContent);
    const afterImports = parseImports(proposedContent);
    if (beforeImports.join("|") !== afterImports.join("|")) {
      importChanges.push({
        sourcePath: mapping.sourcePath,
        before: beforeImports,
        after: afterImports,
      });
    }

    modifiedFiles.push({
      sourcePath: mapping.sourcePath,
      featurePath: mapping.targetPath,
      category: mapping.category,
      extractionMode: mapping.extractionMode,
      linesAdded: diff.linesAdded,
      linesRemoved: diff.linesRemoved,
      hasConflict,
      isBinary: featureSnapshot.isBinary,
    });
  });

  manifest.mappings.forEach((mapping) => {
    if (!currentFeaturePaths.has(mapping.targetPath)) {
      deletedFiles.push({
        featurePath: mapping.targetPath,
        sourcePath: mapping.sourcePath,
        extractionMode: mapping.extractionMode,
      });
    }
  });

  return {
    featureSlug,
    featureName: manifest.featureName,
    modifiedFiles,
    addedFiles,
    deletedFiles,
    changedFunctions: modifiedFiles.map((item) => ({
      sourcePath: item.sourcePath,
      description: item.extractionMode === "snippet"
        ? "Related extracted sections will be merged back into the app file."
        : "Full file copy will overwrite the app file.",
    })),
    importChanges,
    conflicts,
  };
}

function listAllAppTextFiles(workspaceRoot) {
  return listWorkspaceFiles(workspaceRoot).filter((file) => CODE_EXTENSIONS.has(file.extension));
}

function resolveImportTarget(baseFilePath, specifier) {
  const directory = path.dirname(baseFilePath);
  const extensions = ["", ".js", ".jsx", ".ts", ".tsx", ".json", ".css", ".html", ".md"];
  const candidates = [];

  if (specifier.startsWith(".")) {
    extensions.forEach((extension) => {
      candidates.push(path.resolve(directory, specifier + extension));
    });
    extensions.forEach((extension) => {
      candidates.push(path.resolve(directory, specifier, `index${extension}`));
    });
  }

  return candidates;
}

function validateWorkspace(workspaceRoot) {
  const files = listAllAppTextFiles(workspaceRoot);
  const issues = [];
  const warnings = [];
  let packageJson = null;

  const packageJsonFile = files.find((file) => file.relativePath === "package.json");
  if (packageJsonFile) {
    try {
      packageJson = JSON.parse(fs.readFileSync(packageJsonFile.absolutePath, "utf8"));
    } catch {
      issues.push({ type: "syntax", filePath: "package.json", message: "package.json is not valid JSON." });
    }
  }

  const declaredDependencies = new Set([
    ...Object.keys(packageJson?.dependencies || {}),
    ...Object.keys(packageJson?.devDependencies || {}),
  ]);

  files.forEach((file) => {
    const content = fs.readFileSync(file.absolutePath, "utf8");

    if (file.extension === ".json") {
      try {
        JSON.parse(content);
      } catch (error) {
        issues.push({ type: "syntax", filePath: file.relativePath, message: error.message });
      }
    }

    if (file.extension === ".js") {
      try {
        childProcess.execFileSync(process.execPath, ["--check", file.absolutePath], {
          stdio: "pipe",
        });
      } catch (error) {
        issues.push({
          type: "syntax",
          filePath: file.relativePath,
          message: String(error.stderr || error.message || "Syntax validation failed.").trim(),
        });
      }
    }

    if (file.extension === ".jsx" || file.extension === ".ts" || file.extension === ".tsx") {
      warnings.push({
        type: "syntax-skip",
        filePath: file.relativePath,
        message: "JSX/TS syntax was not fully parsed in backend validation. Relative import checks still ran.",
      });
    }

    const imports = parseImports(content);
    imports.forEach((specifier) => {
      if (specifier.startsWith(".")) {
        const candidates = resolveImportTarget(file.absolutePath, specifier);
        const exists = candidates.some((candidate) => fs.existsSync(candidate));
        if (!exists) {
          issues.push({
            type: "broken-import",
            filePath: file.relativePath,
            message: `Missing relative import: ${specifier}`,
          });
        }
        return;
      }

      if (specifier.startsWith("/") || specifier.startsWith("http")) {
        return;
      }

      const packageName = specifier.startsWith("@")
        ? specifier.split("/").slice(0, 2).join("/")
        : specifier.split("/")[0];

      if (!declaredDependencies.has(packageName) && !["fs", "path", "http", "https", "url", "crypto", "express"].includes(packageName)) {
        issues.push({
          type: "missing-dependency",
          filePath: file.relativePath,
          message: `Dependency "${packageName}" is imported but not declared in package.json.`,
        });
      }
    });
  });

  return {
    ok: issues.length === 0,
    issues,
    warnings,
  };
}

function createBackup(workspaceRoot, featureSlug, changes) {
  ensureFeatureSystem(workspaceRoot);
  const backupId = `${featureSlug}-${Date.now()}`;
  const backupDir = path.join(getBackupRoot(workspaceRoot), backupId);
  ensureDir(backupDir);

  const manifest = {
    backupId,
    featureSlug,
    createdAt: new Date().toISOString(),
    files: [],
  };

  changes.forEach((change) => {
    const absoluteSource = path.join(workspaceRoot, change.sourcePath);
    const backupRelativePath = normalizeRelativePath(path.join("files", change.sourcePath));
    const backupAbsolutePath = path.join(backupDir, backupRelativePath);
    ensureDir(path.dirname(backupAbsolutePath));

    if (fs.existsSync(absoluteSource)) {
      fs.copyFileSync(absoluteSource, backupAbsolutePath);
      manifest.files.push({
        sourcePath: change.sourcePath,
        existed: true,
        backupPath: backupRelativePath,
      });
      return;
    }

    manifest.files.push({
      sourcePath: change.sourcePath,
      existed: false,
      backupPath: null,
    });
  });

  writeJson(path.join(backupDir, "manifest.json"), manifest);
  return manifest;
}

function restoreBackup(workspaceRoot, backupId) {
  const backupDir = path.join(getBackupRoot(workspaceRoot), backupId);
  const manifest = readJsonIfExists(path.join(backupDir, "manifest.json"));
  if (!manifest) {
    throw new Error("Backup not found.");
  }

  manifest.files.forEach((file) => {
    const destination = path.join(workspaceRoot, file.sourcePath);
    if (!file.existed) {
      deletePathIfExists(destination);
      return;
    }
    ensureDir(path.dirname(destination));
    fs.copyFileSync(path.join(backupDir, file.backupPath), destination);
  });

  return manifest;
}

function mergeConflictVersions(appContent, proposedContent) {
  return [
    "<<<<<<< APP VERSION",
    String(appContent || ""),
    "=======",
    String(proposedContent || ""),
    ">>>>>>> FEATURE VERSION",
    "",
  ].join("\n");
}

function applySync(workspaceRoot, featureSlug, options = {}) {
  const manifest = loadFeatureManifest(workspaceRoot, featureSlug);
  const preview = analyzeSyncPreview(workspaceRoot, featureSlug);
  const conflictResolutions = options.conflictResolutions || {};
  const changes = [];

  manifest.mappings.forEach((mapping) => {
    const featureAbsolutePath = path.join(workspaceRoot, mapping.targetPath);
    if (!fs.existsSync(featureAbsolutePath) || mapping.targetPath === manifest.readmePath) {
      return;
    }

    const featureSnapshot = readFileSnapshot(featureAbsolutePath, mapping.extension);
    const featureContent = featureSnapshot.text;
    const featureChanged = featureSnapshot.isBinary
      ? featureSnapshot.hash !== String(mapping.generatedHashAtConvert || "")
      : featureContent !== String(mapping.generatedContentAtConvert || "");
    if (!featureChanged) {
      return;
    }

    const sourceAbsolutePath = path.join(workspaceRoot, mapping.sourcePath);
    const appSnapshot = fs.existsSync(sourceAbsolutePath)
      ? readFileSnapshot(sourceAbsolutePath, mapping.extension)
      : { isBinary: IMAGE_EXTENSIONS.has(mapping.extension), text: "", hash: "" };
    const appContent = appSnapshot.text;
    const proposedContent = mapping.extractionMode === "snippet"
      ? rebuildSourceFromSnippet(mapping, featureContent)
      : featureContent;
    const resolution = conflictResolutions[mapping.sourcePath] || "merge-both";
    const hasConflict = appSnapshot.isBinary
      ? appSnapshot.hash !== String(mapping.sourceHashAtConvert || "")
      : appContent !== String(mapping.sourceContentAtConvert || "");

    let nextContent = proposedContent;
    let nextBuffer = featureSnapshot.buffer;
    if (hasConflict) {
      if (resolution === "keep-app") {
        nextContent = appContent;
        nextBuffer = appSnapshot.buffer || featureSnapshot.buffer;
      } else if (resolution === "use-feature") {
        nextContent = proposedContent;
        nextBuffer = featureSnapshot.buffer;
      } else {
        nextContent = mergeConflictVersions(appContent, proposedContent);
        nextBuffer = Buffer.from(nextContent, "utf8");
      }
    }

    changes.push({
      sourcePath: mapping.sourcePath,
      absolutePath: sourceAbsolutePath,
      content: nextContent,
      buffer: nextBuffer,
      isBinary: featureSnapshot.isBinary && resolution !== "merge-both",
    });
  });

  preview.addedFiles.forEach((item) => {
    const absoluteFeaturePath = path.join(workspaceRoot, item.featurePath);
    const snapshot = readFileSnapshot(absoluteFeaturePath, path.extname(absoluteFeaturePath).toLowerCase());
    changes.push({
      sourcePath: item.destinationPath,
      absolutePath: path.join(workspaceRoot, item.destinationPath),
      content: snapshot.text,
      buffer: snapshot.buffer,
      isBinary: snapshot.isBinary,
    });
  });

  const deletedCandidates = preview.deletedFiles.filter((item) => item.extractionMode === "full-copy");
  deletedCandidates.forEach((item) => {
    changes.push({
      sourcePath: item.sourcePath,
      absolutePath: path.join(workspaceRoot, item.sourcePath),
      deleteFile: true,
    });
  });

  const backupManifest = createBackup(workspaceRoot, featureSlug, changes);

  try {
    changes.forEach((change) => {
      if (change.deleteFile) {
        deletePathIfExists(change.absolutePath);
        return;
      }
      ensureDir(path.dirname(change.absolutePath));
      if (change.isBinary && change.buffer) {
        fs.writeFileSync(change.absolutePath, change.buffer);
      } else {
        fs.writeFileSync(change.absolutePath, change.content, "utf8");
      }
    });

    const validation = validateWorkspace(workspaceRoot);
    if (!validation.ok) {
      restoreBackup(workspaceRoot, backupManifest.backupId);
      return {
        ok: false,
        restored: true,
        backupId: backupManifest.backupId,
        validation,
      };
    }

    manifest.updatedAt = new Date().toISOString();
    manifest.lastSync = {
      backupId: backupManifest.backupId,
      syncedAt: manifest.updatedAt,
      changedFiles: changes.map((item) => item.sourcePath),
    };

    manifest.mappings = manifest.mappings.map((mapping) => {
      const featureAbsolutePath = path.join(workspaceRoot, mapping.targetPath);
      if (!fs.existsSync(featureAbsolutePath)) {
        return mapping;
      }
      const featureSnapshot = readFileSnapshot(featureAbsolutePath, mapping.extension);
      const featureContent = featureSnapshot.text;
      const sourceAbsolutePath = path.join(workspaceRoot, mapping.sourcePath);
      const nextSourceSnapshot = fs.existsSync(sourceAbsolutePath)
        ? readFileSnapshot(sourceAbsolutePath, mapping.extension)
        : { text: mapping.sourceContentAtConvert, hash: mapping.sourceHashAtConvert };
      return {
        ...mapping,
        generatedContentAtConvert: featureContent,
        generatedHashAtConvert: featureSnapshot.hash,
        sourceContentAtConvert: nextSourceSnapshot.text,
        sourceHashAtConvert: nextSourceSnapshot.hash,
      };
    });
    writeJson(getFeatureManifestPath(workspaceRoot, featureSlug), manifest);

    return {
      ok: true,
      restored: false,
      backupId: backupManifest.backupId,
      validation,
      preview,
      message: `${manifest.featureName} folder changes were successfully synced with the DDO app.`,
    };
  } catch (error) {
    restoreBackup(workspaceRoot, backupManifest.backupId);
    throw error;
  }
}

function undoLastSync(workspaceRoot, featureSlug) {
  const manifest = loadFeatureManifest(workspaceRoot, featureSlug);
  if (!manifest.lastSync?.backupId) {
    throw new Error("No sync backup found for this feature.");
  }
  const backup = restoreBackup(workspaceRoot, manifest.lastSync.backupId);
  manifest.lastSync = null;
  manifest.updatedAt = new Date().toISOString();
  writeJson(getFeatureManifestPath(workspaceRoot, featureSlug), manifest);
  return backup;
}

module.exports = {
  INTERNAL_DIR_NAME,
  FEATURE_ROOT_NAME,
  ensureFeatureSystem,
  isInternalRelativePath,
  listWorkspaceFiles,
  getFeatureTerms,
  getWorkspaceIndex,
  buildSearchSuggestions,
  buildConvertPreview,
  applyConvertPreview,
  undoConvert,
  analyzeSyncPreview,
  applySync,
  undoLastSync,
  buildAgenticSearchReport,
  filterConvertPreviewBySelectedPaths,
};
