const API_BASE_URL = window.location.origin;
const TOKEN_KEY = "ddoCompanyToken";
const LOGIN_PATH = "./company-login.html";
const THEME_KEY = "ddoCfmTheme";

const state = {
  token: localStorage.getItem(TOKEN_KEY) || "",
  company: null,
  workspaceId: "",
  workspaceLabel: "",
  tree: [],
  currentPath: "",
  currentItemType: "",
  currentContent: "",
  currentItems: [],
  searchResults: [],
  recentFiles: [],
  view: "empty",
  viewHistory: [],
  expandedPaths: new Set(),
  privacyMode: "public",
  hasPin: false,
  pinTarget: "pin",
};

const allowedExtensions = [
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
];

const successBanner = document.getElementById("successBanner");
const errorBanner = document.getElementById("errorBanner");
const sidebar = document.getElementById("sidebar");
const treeRoot = document.getElementById("treeRoot");
const resultPanel = document.getElementById("resultPanel");
const breadcrumbPath = document.getElementById("breadcrumbPath");
const workspaceMeta = document.getElementById("workspaceMeta");
const searchInput = document.getElementById("searchInput");
const goBackButton = document.getElementById("goBackButton");
const fileInput = document.getElementById("fileInput");
const folderInput = document.getElementById("folderInput");
const uploadModal = document.getElementById("uploadModal");
const companyInfoModal = document.getElementById("companyInfoModal");
const settingsModal = document.getElementById("settingsModal");
const pinSetupPanel = document.getElementById("pinSetupPanel");
const pinVerifyPanel = document.getElementById("pinVerifyPanel");
const companyDetailsPanel = document.getElementById("companyDetailsPanel");
const profileName = document.getElementById("profileName");
const profileMiniName = document.getElementById("profileMiniName");
const profileAvatar = document.getElementById("profileAvatar");
const companyIdValue = document.getElementById("companyIdValue");
const companyStatusValue = document.getElementById("companyStatusValue");
const companyEmailValue = document.getElementById("companyEmailValue");
const publicModeButton = document.getElementById("publicModeButton");
const privateModeButton = document.getElementById("privateModeButton");
const pinValue = document.getElementById("pinValue");
const confirmPinValue = document.getElementById("confirmPinValue");
const verifyPinValue = document.getElementById("verifyPinValue");
const pinTargetButton = document.getElementById("pinTargetButton");
const confirmPinTargetButton = document.getElementById("confirmPinTargetButton");
const themeSelect = document.getElementById("themeSelect");

function showBanner(type, message) {
  successBanner.classList.remove("show");
  errorBanner.classList.remove("show");

  if (type === "success") {
    successBanner.textContent = message;
    successBanner.classList.add("show");
  }

  if (type === "error") {
    errorBanner.textContent = message;
    errorBanner.classList.add("show");
  }
}

function clearBanner() {
  successBanner.classList.remove("show");
  errorBanner.classList.remove("show");
}

function authHeaders(contentType) {
  const headers = {
    Authorization: `Bearer ${state.token}`,
  };

  if (contentType) {
    headers["Content-Type"] = contentType;
  }

  return headers;
}

async function apiRequest(url, options = {}) {
  const response = await fetch(url, options);
  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.message || "Request failed.");
  }

  return result;
}

function setTheme(theme) {
  const safeTheme = theme === "graphite" ? "graphite" : "vercel";
  document.body.dataset.theme = safeTheme;
  localStorage.setItem(THEME_KEY, safeTheme);
  themeSelect.value = safeTheme;
}

function setSidebarOpen(open) {
  sidebar.classList.toggle("open", open);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function pushView(nextView) {
  if (state.view !== nextView) {
    state.viewHistory.push(state.view);
    state.view = nextView;
  }
}

function goBack() {
  if (!state.viewHistory.length) {
    return;
  }

  state.view = state.viewHistory.pop();
  renderResultPanel();
}

function fileIconSvg(type) {
  if (type === "folder") {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h6l2 2h10v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M3 7a2 2 0 0 1 2-2h4l2 2"/></svg>';
  }

  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/></svg>';
}

function toggleExpanded(path) {
  if (state.expandedPaths.has(path)) {
    state.expandedPaths.delete(path);
  } else {
    state.expandedPaths.add(path);
  }
  renderTree();
}

function buildBreadcrumb(pathValue) {
  if (!pathValue) {
    return state.workspaceLabel || "No folder opened yet";
  }

  const parts = [state.workspaceLabel || "Workspace", ...pathValue.split("/").filter(Boolean)];
  return parts.join(" / ");
}

function formatRecentTime(value) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString("en-IN");
}

function setActiveNav(buttonId) {
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.toggle("active", item.id === buttonId);
  });
}

function renderTreeNodes(nodes, depth = 0) {
  if (!nodes?.length) {
    return '<div class="empty-state">No folder opened yet</div>';
  }

  return nodes
    .map((node) => {
      const isFolder = node.itemType === "folder";
      const isExpanded = isFolder && (depth === 0 || state.expandedPaths.has(node.relativePath));
      const childrenClass = isExpanded ? "tree-children open" : "tree-children";
      const activeClass = state.currentPath === node.relativePath ? "active" : "";

      return `
        <div class="tree-node">
          <div class="tree-row ${activeClass}" data-path="${escapeHtml(node.relativePath)}" data-type="${node.itemType}">
            <button class="tree-toggle ${isFolder ? "" : "placeholder"}" type="button" data-toggle="${escapeHtml(node.relativePath)}">
              ${isFolder ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>' : '<svg viewBox="0 0 24 24" aria-hidden="true"></svg>'}
            </button>
            <span class="tree-icon">${fileIconSvg(node.itemType)}</span>
            <span>${escapeHtml(node.name)}</span>
          </div>
          ${isFolder ? `<div class="${childrenClass}">${renderTreeNodes(node.children || [], depth + 1)}</div>` : ""}
        </div>
      `;
    })
    .join("");
}

function renderTree() {
  treeRoot.innerHTML = renderTreeNodes(state.tree);

  treeRoot.querySelectorAll("[data-toggle]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleExpanded(button.getAttribute("data-toggle"));
    });
  });

  treeRoot.querySelectorAll(".tree-row").forEach((row) => {
    row.addEventListener("click", async () => {
      const targetPath = row.dataset.path || "";
      const itemType = row.dataset.type || "file";

      if (itemType === "folder") {
        state.expandedPaths.add(targetPath);
      }

      await openWorkspaceTarget(targetPath);
    });
  });
}

function renderFolderItems(items) {
  if (!items?.length) {
    return '<div class="empty-state">This folder is empty.</div>';
  }

  return `
    <div class="result-list">
      ${items
        .map(
          (item) => `
            <button class="result-item" data-open-path="${escapeHtml(item.relativePath)}" data-open-type="${item.itemType}" type="button">
              <div>
                <span class="result-name">${escapeHtml(item.name)}</span>
                <span class="result-path">${escapeHtml(item.relativePath)}</span>
              </div>
              <span class="result-type">${item.itemType}</span>
            </button>
          `
        )
        .join("")}
    </div>
  `;
}

function renderSearchResults() {
  if (!state.searchResults.length) {
    return '<div class="empty-state">No files matched your search.</div>';
  }

  return `
    <div class="result-list">
      ${state.searchResults
        .map(
          (item) => `
            <button class="result-item" data-open-path="${escapeHtml(item.relativePath)}" data-open-type="${item.itemType}" type="button">
              <div>
                <span class="result-name">${escapeHtml(item.name)}</span>
                <span class="result-path">${escapeHtml(item.relativePath)}</span>
              </div>
              <span class="result-type">${item.itemType}</span>
            </button>
          `
        )
        .join("")}
    </div>
  `;
}

function renderRecentResults() {
  if (!state.recentFiles.length) {
    return '<div class="empty-state">No recent files yet.</div>';
  }

  return `
    <div class="result-list">
      ${state.recentFiles
        .map(
          (item) => `
            <button class="result-item" data-open-path="${escapeHtml(item.targetPath)}" data-open-type="${item.itemType}" type="button">
              <div>
                <span class="result-name">${escapeHtml(item.targetPath)}</span>
                <span class="result-path">${escapeHtml(formatRecentTime(item.lastAccessedAt))}</span>
              </div>
              <span class="result-type">${escapeHtml(item.action || item.itemType)}</span>
            </button>
          `
        )
        .join("")}
    </div>
  `;
}

function renderFilePreview() {
  const preview = state.currentContent
    ? `<pre class="code-preview">${escapeHtml(state.currentContent)}</pre>`
    : '<div class="empty-state">Preview is not available for this file.</div>';

  return `
    <div class="result-list">
      <div class="result-item">
        <div>
          <span class="result-name">${escapeHtml(state.currentPath.split("/").pop() || "File preview")}</span>
          <span class="result-path">${escapeHtml(state.currentPath)}</span>
        </div>
        <span class="result-type">file</span>
      </div>
      ${preview}
    </div>
  `;
}

function renderResultPanel() {
  breadcrumbPath.textContent = buildBreadcrumb(state.currentPath);

  if (state.view === "search") {
    resultPanel.innerHTML = renderSearchResults();
  } else if (state.view === "recent") {
    resultPanel.innerHTML = renderRecentResults();
  } else if (state.view === "file") {
    resultPanel.innerHTML = renderFilePreview();
  } else if (state.view === "workspace" && state.currentItemType === "folder") {
    resultPanel.innerHTML = renderFolderItems(state.currentItems);
  } else {
    resultPanel.innerHTML = '<div class="empty-state">No folder opened yet</div>';
  }

  resultPanel.querySelectorAll("[data-open-path]").forEach((button) => {
    button.addEventListener("click", async () => {
      await openWorkspaceTarget(button.dataset.openPath || "");
    });
  });
}

function renderCompany(company) {
  state.company = company;
  profileName.textContent = company.companyName || "DDO Company";
  profileMiniName.textContent = company.companyName || "DDO Company";
  companyIdValue.textContent = company.companyId || "-";
  companyStatusValue.textContent = company.status || "-";
  companyEmailValue.textContent = company.companyEmail || "-";
  profileAvatar.textContent = (company.companyName || "DD").slice(0, 2).toUpperCase();
}

async function loadCompanyProfile() {
  const company = await apiRequest(`${API_BASE_URL}/api/company/me`, {
    headers: authHeaders(),
  });
  renderCompany(company);
}

async function loadRecentFiles() {
  const result = await apiRequest(`${API_BASE_URL}/api/cfm/recent`, {
    headers: authHeaders(),
  });
  state.recentFiles = result.recentFiles || [];
}

async function saveRecentActivity(targetPath, itemType, action) {
  try {
    await apiRequest(`${API_BASE_URL}/api/cfm/recent`, {
      method: "POST",
      headers: authHeaders("application/json"),
      body: JSON.stringify({ targetPath, itemType, action }),
    });
  } catch (_error) {
    // Keep the UI moving even if the recent save fails.
  }
}

async function openWorkspaceTarget(targetPath = "") {
  if (!state.workspaceId) {
    showBanner("error", "Open a file or folder first.");
    return;
  }

  clearBanner();
  const params = new URLSearchParams({
    workspaceId: state.workspaceId,
    target: targetPath,
  });
  const result = await apiRequest(`${API_BASE_URL}/api/cfm/open?${params.toString()}`, {
    headers: authHeaders(),
  });

  state.currentPath = result.targetPath || "";
  state.currentItemType = result.itemType || "";
  state.currentItems = result.items || [];
  state.currentContent = result.content || "";

  if (result.tree && !state.currentPath) {
    state.tree = result.tree;
  }

  pushView(result.itemType === "file" ? "file" : "workspace");
  renderTree();
  renderResultPanel();
}

async function uploadWorkspace(files, relativePaths) {
  clearBanner();
  const formData = new FormData();

  files.forEach((file, index) => {
    formData.append("workspaceFiles", file);
    formData.append("relativePaths", relativePaths[index]);
  });

  const result = await apiRequest(`${API_BASE_URL}/api/cfm/workspace/upload`, {
    method: "POST",
    headers: authHeaders(),
    body: formData,
  });

  state.workspaceId = result.workspaceId;
  state.workspaceLabel = result.workspaceLabel || "Uploaded workspace";
  state.tree = result.tree || [];
  state.currentPath = "";
  state.currentItems = result.items || [];
  state.currentItemType = "folder";
  state.currentContent = "";
  state.searchResults = [];
  state.viewHistory = [];
  state.expandedPaths = new Set();

  pushView("workspace");
  renderTree();
  renderResultPanel();
  workspaceMeta.textContent = `${state.workspaceLabel} is loaded with coding files only.`;
  setActiveNav("openWorkspaceButton");
  showBanner("success", result.message || "Workspace uploaded successfully.");
  closeModal(uploadModal);
  await loadRecentFiles();
}

async function handleFileSelection(fileList, isFolderMode) {
  const files = Array.from(fileList || []);
  if (!files.length) {
    return;
  }

  const allowedFiles = [];
  const relativePaths = [];

  files.forEach((file) => {
    const relativePath = isFolderMode ? file.webkitRelativePath || file.name : file.name;
    const lowerPath = relativePath.toLowerCase();
    const allowed = lowerPath.endsWith(".env.example") || allowedExtensions.some((ext) => lowerPath.endsWith(ext));

    if (allowed) {
      allowedFiles.push(file);
      relativePaths.push(relativePath);
    }
  });

  if (!allowedFiles.length) {
    showBanner("error", "Choose coding files like .html, .css, .js, .json, .md, .py, or .php.");
    return;
  }

  await uploadWorkspace(allowedFiles, relativePaths);
}

async function runSearch() {
  if (!state.workspaceId) {
    showBanner("error", "Open a file or folder first.");
    return;
  }

  const query = searchInput.value.trim();
  if (!query) {
    showBanner("error", "Enter a file name to search.");
    return;
  }

  const params = new URLSearchParams({
    workspaceId: state.workspaceId,
    q: query,
  });

  const result = await apiRequest(`${API_BASE_URL}/api/cfm/search?${params.toString()}`, {
    headers: authHeaders(),
  });

  state.searchResults = result.results || [];
  pushView("search");
  renderResultPanel();
  setActiveNav("searchFilesButton");
}

async function showRecentFiles() {
  await loadRecentFiles();
  pushView("recent");
  renderResultPanel();
  setActiveNav("recentFilesButton");
}

function openModal(modal) {
  modal.classList.remove("hidden");
}

function closeModal(modal) {
  modal.classList.add("hidden");
}

async function loadPrivacyStatus() {
  const result = await apiRequest(`${API_BASE_URL}/api/cfm/private/company-info/privacy`, {
    headers: authHeaders(),
  });

  state.privacyMode = result.privacyMode || "public";
  state.hasPin = Boolean(result.hasPin);
  publicModeButton.classList.toggle("active-mode", state.privacyMode === "public");
  privateModeButton.classList.toggle("active-mode", state.privacyMode === "private");
}

function resetPinInputs() {
  pinValue.value = "";
  confirmPinValue.value = "";
  verifyPinValue.value = "";
  state.pinTarget = "pin";
  pinTargetButton.classList.add("active-target");
  confirmPinTargetButton.classList.remove("active-target");
}

function showCompanyInfoPanel(mode) {
  pinSetupPanel.classList.toggle("hidden", mode !== "setup");
  pinVerifyPanel.classList.toggle("hidden", mode !== "verify");
  companyDetailsPanel.classList.toggle("hidden", mode !== "details");
}

function renderCompanyDetails(company) {
  companyDetailsPanel.innerHTML = `
    <div class="details-grid">
      <div class="details-item"><span>Company name</span><strong>${escapeHtml(company.companyName)}</strong></div>
      <div class="details-item"><span>Company ID</span><strong>${escapeHtml(company.companyId)}</strong></div>
      <div class="details-item"><span>Company email</span><strong>${escapeHtml(company.companyEmail)}</strong></div>
      <div class="details-item"><span>Company phone</span><strong>${escapeHtml(company.companyPhone)}</strong></div>
      <div class="details-item"><span>Company website</span><strong>${escapeHtml(company.companyWebsite)}</strong></div>
      <div class="details-item"><span>Status</span><strong>${escapeHtml(company.status)}</strong></div>
      <div class="details-item"><span>Person name</span><strong>${escapeHtml(company.personName)}</strong></div>
      <div class="details-item"><span>Person email</span><strong>${escapeHtml(company.personEmail)}</strong></div>
      <div class="details-item"><span>Person phone</span><strong>${escapeHtml(company.personPhone)}</strong></div>
    </div>
  `;
}

async function openCompanyInfo() {
  clearBanner();
  await loadPrivacyStatus();
  resetPinInputs();
  openModal(companyInfoModal);
  setActiveNav("companyInfoButton");

  if (state.privacyMode === "public") {
    const result = await apiRequest(`${API_BASE_URL}/api/cfm/private/company-info`, {
      headers: authHeaders(),
    });
    renderCompanyDetails(result.company);
    showCompanyInfoPanel("details");
  } else if (state.hasPin) {
    showCompanyInfoPanel("verify");
  } else {
    showCompanyInfoPanel("setup");
  }
}

async function savePrivacyMode(mode) {
  const payload = { privacyMode: mode };

  if (mode === "private") {
    payload.pin = pinValue.value;
    payload.confirmPin = confirmPinValue.value;
  }

  const result = await apiRequest(`${API_BASE_URL}/api/cfm/private/company-info/privacy`, {
    method: "POST",
    headers: authHeaders("application/json"),
    body: JSON.stringify(payload),
  });

  state.privacyMode = result.privacyMode;
  state.hasPin = Boolean(result.hasPin);
  showBanner("success", result.message);

  if (state.privacyMode === "public") {
    const info = await apiRequest(`${API_BASE_URL}/api/cfm/private/company-info`, {
      headers: authHeaders(),
    });
    renderCompanyDetails(info.company);
    showCompanyInfoPanel("details");
  } else {
    resetPinInputs();
    showCompanyInfoPanel("verify");
  }
}

async function verifyAndOpenCompanyInfo() {
  const result = await apiRequest(`${API_BASE_URL}/api/cfm/private/company-info/access`, {
    method: "POST",
    headers: authHeaders("application/json"),
    body: JSON.stringify({ pin: verifyPinValue.value }),
  });

  renderCompanyDetails(result.company);
  showCompanyInfoPanel("details");
  verifyPinValue.value = "";
  showBanner("success", "Company info unlocked successfully.");
}

function appendPinValue(value) {
  const target = state.pinTarget === "confirm" ? confirmPinValue : pinValue;
  if (target.value.length >= 8) {
    return;
  }
  target.value += value;
}

function backspacePinValue() {
  const target = state.pinTarget === "confirm" ? confirmPinValue : pinValue;
  target.value = target.value.slice(0, -1);
}

function clearPinValue() {
  const target = state.pinTarget === "confirm" ? confirmPinValue : pinValue;
  target.value = "";
}

function buildPinPad(container, onDigit, onSubmit) {
  container.innerHTML = "";
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "Clear", "0", "Backspace", "Submit"];

  keys.forEach((key) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "pin-key";
    button.textContent = key;
    button.addEventListener("click", async () => {
      if (/^\d$/.test(key)) {
        onDigit(key);
        return;
      }

      if (key === "Clear") {
        clearPinValue();
        return;
      }

      if (key === "Backspace") {
        backspacePinValue();
        return;
      }

      await onSubmit();
    });
    container.appendChild(button);
  });
}

async function clearRecentFiles() {
  const result = await apiRequest(`${API_BASE_URL}/api/cfm/recent`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  state.recentFiles = [];
  if (state.view === "recent") {
    renderResultPanel();
  }
  showBanner("success", result.message || "Recent files cleared successfully.");
}

function logout() {
  localStorage.removeItem(TOKEN_KEY);
  window.location.href = LOGIN_PATH;
}

async function initializeDashboard() {
  if (!state.token) {
    window.location.href = LOGIN_PATH;
    return;
  }

  setTheme(localStorage.getItem(THEME_KEY) || "vercel");

  try {
    await loadCompanyProfile();
    await loadRecentFiles();
    renderTree();
    renderResultPanel();
  } catch (error) {
    localStorage.removeItem(TOKEN_KEY);
    showBanner("error", error.message || "Session expired.");
    window.location.href = LOGIN_PATH;
  }
}

document.getElementById("openSidebarButton").addEventListener("click", () => setSidebarOpen(true));
document.getElementById("closeSidebarButton").addEventListener("click", () => setSidebarOpen(false));
document.getElementById("openWorkspaceButton").addEventListener("click", () => {
  openModal(uploadModal);
  setActiveNav("openWorkspaceButton");
});
document.getElementById("closeUploadModalButton").addEventListener("click", () => closeModal(uploadModal));
document.getElementById("selectFilesButton").addEventListener("click", () => fileInput.click());
document.getElementById("selectFolderButton").addEventListener("click", () => folderInput.click());
fileInput.addEventListener("change", async () => handleFileSelection(fileInput.files, false));
folderInput.addEventListener("change", async () => handleFileSelection(folderInput.files, true));

document.getElementById("searchFilesButton").addEventListener("click", async () => {
  setActiveNav("searchFilesButton");
  searchInput.focus();
});
document.getElementById("searchSubmitButton").addEventListener("click", runSearch);
searchInput.addEventListener("keydown", async (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    await runSearch();
  }
});

document.getElementById("recentFilesButton").addEventListener("click", showRecentFiles);
document.getElementById("companyInfoButton").addEventListener("click", openCompanyInfo);
document.getElementById("headerCompanyInfoButton").addEventListener("click", openCompanyInfo);
document.getElementById("closeCompanyInfoModalButton").addEventListener("click", () => closeModal(companyInfoModal));
document.getElementById("settingsButton").addEventListener("click", () => openModal(settingsModal));
document.getElementById("headerSettingsButton").addEventListener("click", () => openModal(settingsModal));
document.getElementById("closeSettingsModalButton").addEventListener("click", () => closeModal(settingsModal));
document.getElementById("settingsCompanyPrivacyButton").addEventListener("click", async () => {
  closeModal(settingsModal);
  await openCompanyInfo();
});
document.getElementById("clearRecentFilesButton").addEventListener("click", clearRecentFiles);
document.getElementById("settingsLogoutButton").addEventListener("click", logout);
document.getElementById("logoutButton").addEventListener("click", logout);
goBackButton.addEventListener("click", goBack);

themeSelect.addEventListener("change", () => {
  setTheme(themeSelect.value);
  showBanner("success", "Theme updated successfully.");
});

publicModeButton.addEventListener("click", async () => {
  await savePrivacyMode("public");
});

privateModeButton.addEventListener("click", () => {
  showCompanyInfoPanel("setup");
});

pinTargetButton.addEventListener("click", () => {
  state.pinTarget = "pin";
  pinTargetButton.classList.add("active-target");
  confirmPinTargetButton.classList.remove("active-target");
});

confirmPinTargetButton.addEventListener("click", () => {
  state.pinTarget = "confirm";
  confirmPinTargetButton.classList.add("active-target");
  pinTargetButton.classList.remove("active-target");
});

buildPinPad(document.getElementById("pinPad"), appendPinValue, async () => {
  await savePrivacyMode("private");
});

buildPinPad(document.getElementById("verifyPinPad"), (digit) => {
  if (verifyPinValue.value.length < 8) {
    verifyPinValue.value += digit;
  }
}, async () => {
  await verifyAndOpenCompanyInfo();
});

window.addEventListener("click", (event) => {
  if (event.target === uploadModal) {
    closeModal(uploadModal);
  }
  if (event.target === companyInfoModal) {
    closeModal(companyInfoModal);
  }
  if (event.target === settingsModal) {
    closeModal(settingsModal);
  }
});

initializeDashboard();
