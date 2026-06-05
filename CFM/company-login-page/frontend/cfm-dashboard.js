function resolveApiBaseUrl() {
  const stored = localStorage.getItem("ddoApiBaseUrl");
  if (stored) {
    return String(stored).replace(/\/$/, "");
  }

  const { protocol, hostname, origin } = window.location;
  if (protocol === "file:" || !hostname) {
    return "http://localhost:8080";
  }

  return origin;
}

const API_BASE_URL = resolveApiBaseUrl();
const TOKEN_KEY = "ddoCompanyToken";
const LOGIN_PATH = "./company-login.html";
const THEME_KEY = "ddoCfmTheme";
const EDIT_ACCESS_KEY = "ddoCfmEditAccess";

const state = {
  token: localStorage.getItem(TOKEN_KEY) || "",
  company: null,
  workspaceId: "",
  workspaceLabel: "",
  tree: [],
  currentPath: "",
  currentItemType: "",
  currentContent: "",
  currentFileName: "",
  searchResults: [],
  view: "empty",
  viewHistory: [],
  expandedPaths: new Set(),
  privacyMode: "not-private",
  hasPin: false,
  pinDraft: "",
  pinConfirmDraft: "",
  verifyPinDraft: "",
  pinStage: "create",
  notifications: [],
  employeeFiles: [],
  editingEmployeeId: "",
  companyEditUnlocked: false,
  currentFileInfo: null,
  editMode: false,
  editDraft: "",
  originalContent: "",
  editUndoStack: [],
  editRedoStack: [],
  activityFilter: "all",
  currentHistory: [],
  currentSummary: "",
  filesPanelHidden: false,
  pendingCommitPayload: null,
  previewMaximized: false,
  lastOpenedAt: "",
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
const breadcrumbPath = document.getElementById("breadcrumbPath");
const workspaceMeta = document.getElementById("workspaceMeta");
const searchInput = document.getElementById("searchInput");
const fileInput = document.getElementById("fileInput");
const folderInput = document.getElementById("folderInput");
const uploadModal = document.getElementById("uploadModal");
const companyInfoModal = document.getElementById("companyInfoModal");
const pinSetupModal = document.getElementById("pinSetupModal");
const pinVerifyModal = document.getElementById("pinVerifyModal");
const settingsModal = document.getElementById("settingsModal");
const notificationModal = document.getElementById("notificationModal");
const notificationList = document.getElementById("notificationList");
const companyDetailsPanel = document.getElementById("companyDetailsPanel");
const profileMiniName = document.getElementById("profileMiniName");
const profileAvatar = document.getElementById("profileAvatar");
const notPrivateModeButton = document.getElementById("notPrivateModeButton");
const privateModeButton = document.getElementById("privateModeButton");
const privacyStatusText = document.getElementById("privacyStatusText");
const previewFileName = document.getElementById("previewFileName");
const previewMeta = document.getElementById("previewMeta");
const previewContent = document.getElementById("previewContent");
const workspaceBody = document.getElementById("workspaceBody");
const copyCodeButton = document.getElementById("copyCodeButton");
const previewDropdownMenu = document.getElementById("previewDropdownMenu");
const searchPopup = document.getElementById("searchPopup");
const searchPopupResults = document.getElementById("searchPopupResults");
const clearSearchButton = document.getElementById("clearSearchButton");
const voiceSearchButton = document.getElementById("voiceSearchButton");
const searchListeningStatus = document.getElementById("searchListeningStatus");
const cfmSearchBar = document.getElementById("cfmSearchBar");
let voiceRecognition = null;
const fileInfoPopup = document.getElementById("fileInfoPopup");
const fileInfoPopupBody = document.getElementById("fileInfoPopupBody");
const themeSelect = document.getElementById("themeSelect");
const themeToggleText = document.getElementById("themeToggleText");
const pinModalTitle = document.getElementById("pinModalTitle");
const pinInputLabel = document.getElementById("pinInputLabel");
const pinInputValue = document.getElementById("pinInputValue");
const pinVerifyValue = document.getElementById("pinVerifyValue");
const employeeFilesModal = document.getElementById("employeeFilesModal");
const employeeList = document.getElementById("employeeList");
const companyEditPasswordModal = document.getElementById("companyEditPasswordModal");
const companyDetailsModal = document.getElementById("companyDetailsModal");
const logoutPasswordModal = document.getElementById("logoutPasswordModal");
const logoutPasswordInput = document.getElementById("logoutPasswordInput");
const openSidebarButton = document.getElementById("openSidebarButton");
const companyEditPasswordInput = document.getElementById("companyEditPasswordInput");
const companyEditPasswordSuccess = document.getElementById("companyEditPasswordSuccess");
const companyEditPasswordError = document.getElementById("companyEditPasswordError");
const verifyCompanyEditPasswordButton = document.getElementById("verifyCompanyEditPasswordButton");
const editCodeButton = document.getElementById("editCodeButton");
const editToolbar = document.getElementById("editToolbar");
const unsavedIndicator = document.getElementById("unsavedIndicator");
const activityPanel = document.getElementById("activityPanel");
const activityPanelTitle = document.getElementById("activityPanelTitle");
const activityPanelLabel = document.getElementById("activityPanelLabel");
const activityPanelBody = document.getElementById("activityPanelBody");
const activityFilterBar = document.getElementById("activityFilterBar");
const historyPopup = document.getElementById("historyPopup");
const historyPopupBody = document.getElementById("historyPopupBody");
const commitPopup = document.getElementById("commitPopup");
const commitPopupError = document.getElementById("commitPopupError");
const maximizePreviewIcon = document.getElementById("maximizePreviewIcon");
let bannerTimerId = 0;

function pushNotification(message, kind = "info") {
  state.notifications.unshift({
    message,
    kind,
    time: new Date().toLocaleTimeString("en-IN"),
  });
  state.notifications = state.notifications.slice(0, 10);
  renderNotifications();
}

function showBanner(type, message) {
  successBanner.classList.remove("show");
  errorBanner.classList.remove("show");
  if (bannerTimerId) {
    window.clearTimeout(bannerTimerId);
    bannerTimerId = 0;
  }

  if (type === "success") {
    successBanner.textContent = message;
    successBanner.classList.add("show");
    pushNotification(message, "success");
  }

  if (type === "error") {
    errorBanner.textContent = message;
    errorBanner.classList.add("show");
    pushNotification(message, "error");
  }

  bannerTimerId = window.setTimeout(() => {
    clearBanner();
  }, 2600);
}

function clearBanner() {
  successBanner.classList.remove("show");
  errorBanner.classList.remove("show");
  if (bannerTimerId) {
    window.clearTimeout(bannerTimerId);
    bannerTimerId = 0;
  }
}

function setEditMode(enabled) {
  state.editMode = enabled;
  editToolbar.classList.toggle("hidden", !enabled);
  unsavedIndicator.classList.toggle("hidden", !enabled || state.editDraft === state.originalContent);
  editCodeButton.textContent = enabled ? "Editing" : "Edit";
}

function closeActivityPanel() {
  activityPanel.classList.add("hidden");
  activityFilterBar.classList.add("hidden");
}

function openActivityPanel(title, label = "Activity") {
  activityPanelTitle.textContent = title;
  activityPanelLabel.textContent = label;
  activityPanel.classList.remove("hidden");
}

function closeHistoryPopup() {
  historyPopup.classList.add("hidden");
}

function openHistoryPopup() {
  historyPopup.classList.remove("hidden");
}

function setFilesPanelHidden(hidden) {
  state.filesPanelHidden = hidden;
  workspaceBody?.classList.toggle("files-hidden", hidden);
  document.getElementById("showFilesPanelButton").classList.toggle("hidden", !hidden);
}

function updateCommitCounts() {
  document.getElementById("commitTitleCount").textContent = `${document.getElementById("commitTitleInput").value.length} / 100`;
  document.getElementById("commitDetailsCount").textContent = `${document.getElementById("commitDetailsInput").value.length} / 1000`;
}

function resetCommitPopup() {
  document.getElementById("commitTitleInput").value = "";
  document.getElementById("commitDetailsInput").value = "";
  document.getElementById("commitReasonInput").value = "";
  setInlineMessage(commitPopupError, "");
  updateCommitCounts();
}

function openCommitPopup() {
  commitPopup.classList.remove("hidden");
  updateCommitCounts();
}

function closeCommitPopup() {
  commitPopup.classList.add("hidden");
}

function getSearchEmptyStateMessage() {
  if (!state.workspaceId) {
    return "Open a workspace to search files.";
  }
  if (!searchInput.value.trim()) {
    return "Search files in the current workspace.";
  }
  return "No matching coding files found.";
}

function renderSearchEmptyState() {
  searchPopupResults.innerHTML = `<div class="empty-state">${getSearchEmptyStateMessage()}</div>`;
}

function syncSearchClearButton() {
  clearSearchButton.classList.toggle("hidden", !searchInput.value.trim());
}

function setVoiceListening(active) {
  cfmSearchBar?.classList.toggle("is-listening", active);
  voiceSearchButton?.classList.toggle("is-active", active);
  searchListeningStatus?.classList.toggle("hidden", !active);
}

function stopVoiceSearch() {
  if (voiceRecognition) {
    try {
      voiceRecognition.stop();
    } catch (_error) {
      // Recognition may already be stopped.
    }
    voiceRecognition = null;
  }
  setVoiceListening(false);
}

function getSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  return SpeechRecognition ? new SpeechRecognition() : null;
}

async function startVoiceSearch() {
  const recognition = getSpeechRecognition();
  if (!recognition) {
    showBanner("error", "Voice search is not supported in this browser.");
    return;
  }

  stopVoiceSearch();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = "en-IN";
  recognition.onstart = () => setVoiceListening(true);
  recognition.onend = () => setVoiceListening(false);
  recognition.onerror = () => setVoiceListening(false);
  recognition.onresult = async (event) => {
    const transcript = event.results[0]?.[0]?.transcript?.trim();
    if (!transcript) {
      return;
    }
    searchInput.value = transcript;
    syncSearchClearButton();
    await runSearch({ keepPopupState: true, silent: true });
  };

  voiceRecognition = recognition;
  try {
    recognition.start();
  } catch (error) {
    setVoiceListening(false);
    showBanner("error", "Could not start voice search. Try again.");
  }
}

function searchItemTypeLabel(item) {
  if (item.itemType === "folder") {
    return "Folder";
  }

  const name = String(item.name || "");
  if (!name.includes(".")) {
    return "File";
  }

  return name.split(".").pop().toUpperCase();
}

function searchItemParentPath(relativePath = "") {
  const parts = String(relativePath).split("/").filter(Boolean);
  if (parts.length <= 1) {
    return "workspace root";
  }
  parts.pop();
  return parts.join("/");
}

function closeSearchPopup() {
  stopVoiceSearch();
  searchPopup.classList.add("hidden");
}

function openSearchPopup() {
  closeFileInfoPopup();
  previewDropdownMenu.classList.add("hidden");
  searchPopup.classList.remove("hidden");
  syncSearchClearButton();
  if (!searchInput.value.trim()) {
    renderSearchEmptyState();
  } else if (state.searchResults.length) {
    renderSearchPopupResults(state.searchResults);
  } else {
    renderSearchEmptyState();
  }
  searchInput.focus();
}

function closeFileInfoPopup() {
  fileInfoPopup.classList.add("hidden");
}

function openFileInfoPopup() {
  closeSearchPopup();
  fileInfoPopup.classList.remove("hidden");
}

function setPreviewMaximized(enabled) {
  state.previewMaximized = enabled;
  workspaceBody.classList.toggle("preview-maximized", enabled);
  document.querySelector(".preview-panel")?.classList.toggle("maximized", enabled);
  maximizePreviewIcon.innerHTML = enabled
    ? '<path d="M9 14H5v4M15 10h4V6M21 14v4h-4M3 10V6h4"></path>'
    : '<path d="M9 3H5a2 2 0 0 0-2 2v4M15 3h4a2 2 0 0 1 2 2v4M21 15v4a2 2 0 0 1-2 2h-4M3 15v4a2 2 0 0 0 2 2h4"></path>';
}

function renderNotifications() {
  if (!state.notifications.length) {
    notificationList.innerHTML = '<div class="empty-state">No notifications yet</div>';
    return;
  }

  notificationList.innerHTML = state.notifications
    .map((item) => `
      <div class="notification-item">
        <span>${item.time}</span>
        <strong>${escapeHtml(item.message)}</strong>
      </div>
    `)
    .join("");
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

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function setTheme(theme) {
  let safeTheme = "vercel";
  if (theme === "graphite" || theme === "light") {
    safeTheme = theme;
  }
  document.body.dataset.theme = safeTheme;
  localStorage.setItem(THEME_KEY, safeTheme);
  themeSelect.value = safeTheme === "graphite" ? "graphite" : "vercel";
  themeToggleText.textContent = safeTheme === "light" ? "Dark Mode" : "White Mode";
}

function toggleTheme() {
  const nextTheme = document.body.dataset.theme === "light" ? "vercel" : "light";
  setTheme(nextTheme);
  showBanner("success", `Theme changed to ${nextTheme === "light" ? "white" : "dark"} mode.`);
}

function syncTopControls() {
  const canGoBack = state.viewHistory.length > 0;
  const goBackButton = document.getElementById("goBackButton");
  goBackButton.disabled = !canGoBack;
  goBackButton.classList.toggle("is-disabled", !canGoBack);
}

function setSidebarOpen(open) {
  sidebar.classList.toggle("open", open);
  openSidebarButton.classList.toggle("hidden", open);
}

function syncSidebarState() {
  if (window.innerWidth <= 860) {
    setSidebarOpen(sidebar.classList.contains("open"));
  } else {
    setSidebarOpen(true);
  }
}

function pushView(nextView) {
  if (state.view !== nextView) {
    state.viewHistory.push(state.view);
    state.view = nextView;
  }
  syncTopControls();
}

function goBack() {
  if (!state.viewHistory.length) {
    return;
  }

  state.view = state.viewHistory.pop();
  renderPreview();
  syncTopControls();
}

function setActiveNav(buttonId) {
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.toggle("active", item.id === buttonId);
  });
}

function openModal(modal) {
  modal.classList.remove("hidden");
}

function closeModal(modal) {
  modal.classList.add("hidden");
}

function setInlineMessage(element, message = "", type = "success") {
  element.textContent = message;
  element.classList.toggle("hidden", !message);
  element.classList.toggle("success", type === "success");
  element.classList.toggle("error", type === "error");
}

function resetCompanyEditPasswordState() {
  companyEditPasswordInput.value = "";
  companyEditPasswordInput.type = "password";
  verifyCompanyEditPasswordButton.disabled = false;
  verifyCompanyEditPasswordButton.classList.remove("is-loading");
  verifyCompanyEditPasswordButton.textContent = "Verify Password";
  document.getElementById("toggleCompanyEditPasswordButton").setAttribute("aria-label", "Show password");
  setInlineMessage(companyEditPasswordSuccess, "");
  setInlineMessage(companyEditPasswordError, "");
}

async function parseJsonResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return {
      success: false,
      message: "Unexpected server response. Open CFM from the DDO backend URL (for example http://localhost:8080/CFM/).",
    };
  }

  return response.json().catch(() => ({
    success: false,
    message: "Server error. Please try again.",
  }));
}

function fileIconSvg(type) {
  if (type === "folder") {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h6l2 2h10v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M3 7a2 2 0 0 1 2-2h4l2 2"/></svg>';
  }

  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/></svg>';
}

function languageFromFileName(fileName) {
  const lowerName = String(fileName || "").toLowerCase();
  if (lowerName.endsWith(".html")) return "html";
  if (lowerName.endsWith(".css")) return "css";
  if (lowerName.endsWith(".js") || lowerName.endsWith(".jsx")) return "javascript";
  if (lowerName.endsWith(".ts") || lowerName.endsWith(".tsx")) return "typescript";
  if (lowerName.endsWith(".json")) return "json";
  if (lowerName.endsWith(".md")) return "markdown";
  if (lowerName.endsWith(".py")) return "python";
  if (lowerName.endsWith(".java")) return "java";
  if (lowerName.endsWith(".c")) return "c";
  if (lowerName.endsWith(".cpp")) return "cpp";
  if (lowerName.endsWith(".php")) return "php";
  return "plaintext";
}

function buildBreadcrumb(pathValue) {
  if (!pathValue) {
    return state.workspaceLabel || "No folder opened yet";
  }

  return [state.workspaceLabel || "Workspace", ...pathValue.split("/").filter(Boolean)].join(" / ");
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString("en-IN");
}

function renderCompany(company) {
  state.company = company;
  profileMiniName.textContent = company.companyName || "DDO Company";
  profileAvatar.textContent = (company.companyName || "DD").slice(0, 2).toUpperCase();
}

async function loadCompanyProfile() {
  const company = await apiRequest(`${API_BASE_URL}/api/company/me`, {
    headers: authHeaders(),
  });
  renderCompany(company);
}

function toggleExpanded(path) {
  if (state.expandedPaths.has(path)) {
    state.expandedPaths.delete(path);
  } else {
    state.expandedPaths.add(path);
  }
  renderTree();
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
          <div class="tree-row ${activeClass} ${isFolder ? "" : "file-row"}" data-path="${escapeHtml(node.relativePath)}" data-type="${node.itemType}">
            <div class="tree-row-main">
              <button class="tree-toggle ${isFolder ? "" : "placeholder"}" type="button" data-toggle="${escapeHtml(node.relativePath)}">
                ${isFolder ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>' : '<svg viewBox="0 0 24 24" aria-hidden="true"></svg>'}
              </button>
              <span class="tree-icon">${fileIconSvg(node.itemType)}</span>
              <span class="tree-name">${escapeHtml(node.name)}</span>
            </div>
            ${!isFolder ? `
              <button class="file-action-button" type="button" data-remove-path="${escapeHtml(node.relativePath)}" aria-label="Remove file from workspace">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="m19 6-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
              </button>
            ` : ""}
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

  treeRoot.querySelectorAll("[data-remove-path]").forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.stopPropagation();
      const targetPath = button.getAttribute("data-remove-path") || "";
      if (!window.confirm(`Remove ${targetPath} from this CFM workspace?`)) {
        return;
      }
      await removeWorkspaceFile(targetPath);
    });
  });
}

function renderCodePreview(content) {
  const lines = content.split("\n");
  const lineNumbers = lines.map((_, index) => index + 1).join("\n");
  const languageClass = `language-${languageFromFileName(state.currentFileName)}`;
  return `
    <div class="code-surface">
      <div class="code-grid">
        <pre class="line-numbers">${lineNumbers}</pre>
        <pre class="code-block"><code class="${languageClass}">${escapeHtml(content)}</code></pre>
      </div>
    </div>
  `;
}

function renderSearchPreview(items) {
  if (!items.length) {
    return '<div class="empty-state">No files found.</div>';
  }

  return `
    <div class="code-surface">
      <div class="tree-root">
        ${items
          .map((item) => `
            <button class="tree-row result-open-row" data-open-path="${escapeHtml(item.relativePath)}" data-open-type="${item.itemType}" type="button">
              <span class="tree-icon">${fileIconSvg(item.itemType)}</span>
              <span>${escapeHtml(item.name || item.relativePath)}</span>
            </button>
          `)
          .join("")}
      </div>
    </div>
  `;
}

function renderSearchPopupResults(items) {
  if (!items.length) {
    renderSearchEmptyState();
    return;
  }

  searchPopupResults.innerHTML = items
    .map(
      (item) => `
        <button class="search-result-row" type="button" data-open-search-path="${escapeHtml(item.relativePath)}" data-open-search-type="${escapeHtml(item.itemType)}">
          <span class="search-result-icon">${fileIconSvg(item.itemType)}</span>
          <span class="search-result-main">
            <span class="search-result-name">${escapeHtml(item.name || item.relativePath)}</span>
            <span class="search-result-meta">${escapeHtml(searchItemParentPath(item.relativePath))} · ${escapeHtml(searchItemTypeLabel(item))}</span>
          </span>
        </button>
      `
    )
    .join("");

  searchPopupResults.querySelectorAll("[data-open-search-path]").forEach((button) => {
    button.addEventListener("click", async () => {
      await openWorkspaceTarget(button.getAttribute("data-open-search-path") || "");
      closeSearchPopup();
    });
  });
}

function formatBytes(value) {
  const bytes = Number(value || 0);
  if (!bytes || bytes < 1) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"];
  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const normalized = bytes / 1024 ** unitIndex;
  return `${normalized.toFixed(normalized >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function renderEditablePreview(content) {
  const lines = content.split("\n");
  const lineNumbers = lines.map((_, index) => index + 1).join("\n");
  return `
    <div class="code-surface edit-mode">
      <div class="code-grid">
        <pre class="line-numbers">${lineNumbers}</pre>
        <textarea class="code-editor" id="codeEditor" spellcheck="false" wrap="off">${escapeHtml(content)}</textarea>
      </div>
    </div>
  `;
}

function renderActivityCards(records, compact = false) {
  if (!records.length) {
    return '<div class="empty-state">No activity recorded yet for this selection.</div>';
  }

  return records
    .map(
      (item) => `
        <article class="${compact ? "history-item" : "activity-card"}">
          <div class="${compact ? "history-item-title" : ""}">
            <strong>${escapeHtml(item.fileName || item.filePath || "Workspace item")}</strong>
            <time>${formatDate(item.createdAt)}</time>
          </div>
          <p>${escapeHtml(item.changedBy || "Company user")} ${escapeHtml(item.action)} this item.</p>
          <span>${item.linesAdded || 0} lines added · ${item.linesRemoved || 0} lines removed</span>
          <p>${escapeHtml(item.simpleSummary || "")}</p>
        </article>
      `
    )
    .join("");
}

function renderCompareCode(leftContent, rightContent) {
  const leftLines = String(leftContent || "").split("\n");
  const rightLines = String(rightContent || "").split("\n");
  const maxLength = Math.max(leftLines.length, rightLines.length);
  const leftOutput = [];
  const rightOutput = [];

  for (let index = 0; index < maxLength; index += 1) {
    const leftLine = leftLines[index] ?? "";
    const rightLine = rightLines[index] ?? "";
    const leftClass = leftLine && leftLine !== rightLine ? "diff-removed" : "";
    const rightClass = rightLine && leftLine !== rightLine ? "diff-added" : "";
    leftOutput.push(`<div class="${leftClass}">${escapeHtml(leftLine)}</div>`);
    rightOutput.push(`<div class="${rightClass}">${escapeHtml(rightLine)}</div>`);
  }

  return {
    left: leftOutput.join(""),
    right: rightOutput.join(""),
  };
}

function updateEditorLineNumbers(value) {
  const lineNode = previewContent.querySelector(".line-numbers");
  if (!lineNode) {
    return;
  }
  const lines = String(value || "").split("\n");
  lineNode.textContent = lines.map((_, index) => index + 1).join("\n");
}

function syncEditorScroll(editor) {
  const lineNode = previewContent.querySelector(".line-numbers");
  if (!editor || !lineNode) {
    return;
  }

  const applyScroll = () => {
    lineNode.scrollTop = editor.scrollTop;
  };

  editor.onscroll = applyScroll;
  applyScroll();
}

function renderPreview() {
  syncTopControls();
  breadcrumbPath.textContent = buildBreadcrumb(state.currentPath);
  copyCodeButton.disabled = !state.currentContent;
  previewDropdownMenu.classList.add("hidden");
  unsavedIndicator.classList.toggle("hidden", !(state.editMode && state.editDraft !== state.originalContent));
  document.getElementById("previewInfoButton").disabled = !state.currentPath;

  if (state.view === "file") {
    previewFileName.textContent = state.currentFileName || "Selected file";
    previewMeta.textContent = state.currentPath || "Preview loaded";
    previewContent.innerHTML = state.editMode ? renderEditablePreview(state.editDraft) : renderCodePreview(state.currentContent);
    if (state.editMode) {
      const codeEditor = document.getElementById("codeEditor");
      if (codeEditor) {
        codeEditor.value = state.editDraft;
        syncEditorScroll(codeEditor);
        codeEditor.addEventListener("input", () => {
          state.editUndoStack.push(state.editDraft);
          state.editRedoStack = [];
          state.editDraft = codeEditor.value;
          unsavedIndicator.classList.toggle("hidden", state.editDraft === state.originalContent);
          updateEditorLineNumbers(state.editDraft);
          const lineNode = previewContent.querySelector(".line-numbers");
          if (lineNode) {
            lineNode.scrollTop = codeEditor.scrollTop;
          }
        });
      }
    } else {
      const codeElement = previewContent.querySelector("code");
      if (window.hljs && codeElement) {
        window.hljs.highlightElement(codeElement);
      }
    }
    return;
  }

  setEditMode(false);
  if (state.view === "search") {
    previewFileName.textContent = "Search Result";
    previewMeta.textContent = "Click a file from the list to open its preview.";
    previewContent.innerHTML = renderSearchPreview(state.searchResults);
  } else if (state.view === "workspace") {
    previewFileName.textContent = state.workspaceLabel || "Workspace";
    previewMeta.textContent = "Choose a coding file from the left side to see its content.";
    previewContent.innerHTML = '<div class="empty-state">No file selected</div>';
  } else {
    previewFileName.textContent = "No file selected";
    previewMeta.textContent = "Open a coding file from the left side to see its content.";
    previewContent.innerHTML = '<div class="empty-state">No file selected</div>';
  }

  previewContent.querySelectorAll(".result-open-row").forEach((button) => {
    button.addEventListener("click", async () => {
      await openWorkspaceTarget(button.dataset.openPath || "");
    });
  });
}

async function openWorkspaceTarget(targetPath = "") {
  if (!state.workspaceId) {
    showBanner("error", "Open a file or folder first.");
    return;
  }

  if (state.editMode && state.editDraft !== state.originalContent && !window.confirm("You have unsaved changes. Open another item anyway?")) {
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
  state.currentContent = result.content || "";
  state.currentFileName = result.fileName || (result.targetPath ? result.targetPath.split("/").pop() : "");
  state.currentFileInfo = result.fileInfo || null;
  state.lastOpenedAt = new Date().toISOString();
  state.editMode = false;
  state.editDraft = "";
  state.originalContent = state.currentContent || "";
  state.editUndoStack = [];
  state.editRedoStack = [];
  closeActivityPanel();
  closeFileInfoPopup();

  if (result.tree && !state.currentPath) {
    state.tree = result.tree;
  }

  pushView(result.itemType === "file" ? "file" : "workspace");
  renderTree();
  renderPreview();
  if (result.itemType === "file") {
    showBanner("success", "File / Folder opened successfully");
  }
}

function filterAllowedWorkspaceFiles(fileList, isFolderMode = false) {
  const allowedFiles = [];
  const relativePaths = [];

  Array.from(fileList || []).forEach((file) => {
    const relativePath = isFolderMode ? file.webkitRelativePath || file.name : file.name;
    const lowerPath = relativePath.toLowerCase();
    const allowed = lowerPath.endsWith(".env.example") || allowedExtensions.some((ext) => lowerPath.endsWith(ext));

    if (allowed) {
      allowedFiles.push(file);
      relativePaths.push(relativePath);
    }
  });

  return { allowedFiles, relativePaths };
}

function syncAddFilesButton() {
  const addFilesButton = document.getElementById("addFilesButton");
  if (addFilesButton) {
    addFilesButton.disabled = !state.workspaceId;
  }
}

async function addFilesToWorkspace(files, relativePaths) {
  if (!state.workspaceId) {
    showBanner("error", "Open a file or folder first.");
    return;
  }

  clearBanner();
  const formData = new FormData();
  formData.append("workspaceId", state.workspaceId);

  files.forEach((file, index) => {
    formData.append("workspaceFiles", file);
    formData.append("relativePaths", relativePaths[index]);
  });

  const result = await apiRequest(`${API_BASE_URL}/api/cfm/workspace/add`, {
    method: "POST",
    headers: authHeaders(),
    body: formData,
  });

  state.tree = result.tree || [];
  renderTree();
  syncAddFilesButton();
  showBanner("success", result.message || "Files added to workspace.");
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
  state.currentItemType = "folder";
  state.currentContent = "";
  state.currentFileName = "";
  state.currentFileInfo = null;
  state.lastOpenedAt = "";
  state.searchResults = [];
  state.viewHistory = [];
  state.expandedPaths = new Set();
  state.editMode = false;
  closeActivityPanel();
  closeSearchPopup();
  closeFileInfoPopup();

  pushView("workspace");
  renderTree();
  renderPreview();
  syncAddFilesButton();
  workspaceMeta.textContent = `${state.workspaceLabel} is loaded with coding files only.`;
  setActiveNav("openWorkspaceButton");
  showBanner("success", result.message || "Workspace uploaded successfully.");
  closeModal(uploadModal);
}

async function removeWorkspaceFile(targetPath) {
  if (!state.workspaceId) {
    return;
  }

  const result = await apiRequest(`${API_BASE_URL}/api/cfm/workspace/remove`, {
    method: "POST",
    headers: authHeaders("application/json"),
    body: JSON.stringify({
      workspaceId: state.workspaceId,
      targetPath,
    }),
  });

  state.tree = result.tree || [];

  if (state.currentPath === targetPath) {
    state.currentPath = "";
    state.currentItemType = "folder";
    state.currentContent = "";
    state.currentFileName = "";
    state.currentFileInfo = null;
    state.view = "workspace";
    state.editMode = false;
  }

  renderTree();
  renderPreview();
  closeFileInfoPopup();
  showBanner("success", result.message || "File deleted successfully.");
}

function startEditMode() {
  if (state.currentItemType !== "file" || !state.currentPath) {
    showBanner("error", "Open a code file first.");
    return;
  }

  state.editMode = true;
  state.editDraft = state.currentContent || "";
  state.originalContent = state.currentContent || "";
  state.editUndoStack = [];
  state.editRedoStack = [];
  setEditMode(true);
  renderPreview();
  fetch(`${API_BASE_URL}/api/cfm/activity`, {
    method: "POST",
    headers: authHeaders("application/json"),
    body: JSON.stringify({
      workspaceId: state.workspaceId,
      filePath: state.currentPath,
      fileName: state.currentFileName,
      action: "edited",
      oldContent: state.originalContent,
      newContent: state.editDraft,
    }),
  }).catch(() => undefined);
}

function cancelEditMode() {
  if (state.editDraft !== state.originalContent && !window.confirm("You have unsaved changes. Close edit mode anyway?")) {
    return;
  }

  state.editMode = false;
  state.editDraft = "";
  state.originalContent = "";
  state.editUndoStack = [];
  state.editRedoStack = [];
  setEditMode(false);
  renderPreview();
}

function undoEdit() {
  if (!state.editUndoStack.length) {
    return;
  }
  state.editRedoStack.push(state.editDraft);
  state.editDraft = state.editUndoStack.pop();
  renderPreview();
}

function redoEdit() {
  if (!state.editRedoStack.length) {
    return;
  }
  state.editUndoStack.push(state.editDraft);
  state.editDraft = state.editRedoStack.pop();
  renderPreview();
}

async function openSaveCommitPopup() {
  if (!state.editMode || !state.currentPath) {
    showBanner("error", "Open a file in edit mode first.");
    return;
  }

  const editor = document.getElementById("codeEditor");
  if (editor) {
    state.editDraft = editor.value;
  }

  state.pendingCommitPayload = {
    workspaceId: state.workspaceId,
    filePath: state.currentPath,
    fileName: state.currentFileName,
    oldContent: state.originalContent,
    newContent: state.editDraft,
  };

  resetCommitPopup();
  openCommitPopup();
}

async function submitSaveWithCommit() {
  if (!state.pendingCommitPayload) {
    showBanner("error", "No file changes are ready to save.");
    return;
  }

  const changeTitle = document.getElementById("commitTitleInput").value.trim();
  const changeDetails = document.getElementById("commitDetailsInput").value.trim();
  const changeReason = document.getElementById("commitReasonInput").value.trim();

  if (changeTitle.length < 5 || changeTitle.length > 100) {
    setInlineMessage(commitPopupError, "Change title must be between 5 and 100 characters.", "error");
    return;
  }

  if (changeDetails.length < 10 || changeDetails.length > 1000) {
    setInlineMessage(commitPopupError, "Change details must be between 10 and 1000 characters.", "error");
    return;
  }

  const result = await apiRequest(`${API_BASE_URL}/api/cfm/files/save-with-commit`, {
    method: "POST",
    headers: authHeaders("application/json"),
    body: JSON.stringify({
      workspaceId: state.pendingCommitPayload.workspaceId,
      filePath: state.pendingCommitPayload.filePath,
      newContent: state.pendingCommitPayload.newContent,
      changeTitle,
      changeDetails,
      changeReason,
      simpleSummary: state.currentSummary,
    }),
  });

  state.currentContent = result.content || state.pendingCommitPayload.newContent;
  state.originalContent = state.currentContent;
  state.editDraft = state.currentContent;
  state.editMode = false;
  state.pendingCommitPayload = null;
  state.currentSummary = result.change?.simpleSummary || state.currentSummary;
  setEditMode(false);
  renderPreview();
  closeCommitPopup();
  showBanner("success", result.message || "File saved and change submitted successfully");
}

async function explainCommitChanges() {
  if (!state.pendingCommitPayload) {
    return;
  }

  const result = await apiRequest(`${API_BASE_URL}/api/cfm/files/explain-changes`, {
    method: "POST",
    headers: authHeaders("application/json"),
    body: JSON.stringify({
      filePath: state.pendingCommitPayload.filePath,
      oldContent: state.pendingCommitPayload.oldContent,
      newContent: state.pendingCommitPayload.newContent,
    }),
  });

  document.getElementById("commitTitleInput").value = result.changeTitle || "";
  document.getElementById("commitDetailsInput").value = result.changeDetails || "";
  state.currentSummary = result.simpleSummary || "";
  updateCommitCounts();
}

async function loadActivityPanel(filter = "all", mode = "file") {
  if (!state.workspaceId) {
    showBanner("error", "Open a workspace first.");
    return;
  }

  state.activityFilter = filter;
  const normalizedFilter = filter === "edited" ? "saved" : filter;
  const params = new URLSearchParams({
    action: normalizedFilter,
    itemType: mode === "folder" ? "folder" : state.currentItemType || "file",
  });
  if (state.currentPath) {
    params.set("filePath", state.currentPath);
  }

  const result = await apiRequest(`${API_BASE_URL}/api/cfm/activity/${encodeURIComponent(state.workspaceId)}?${params.toString()}`, {
    headers: authHeaders(),
  });

  state.currentHistory = result.activities || [];
  openActivityPanel(mode === "folder" ? "Folder Activity" : "Digital File Activity", mode === "folder" ? "Activity" : "Activity");
  activityFilterBar.classList.remove("hidden");

  if (mode === "folder" && result.folderSummary) {
    activityPanelBody.innerHTML = `
      <div class="summary-card">
        <strong>${escapeHtml(result.folderSummary.summary)}</strong>
        <div class="summary-meta">${escapeHtml(state.currentPath || state.workspaceLabel || "Workspace")}</div>
        <div class="summary-output">${escapeHtml(result.folderSummary.details.join("\n"))}</div>
      </div>
      ${renderActivityCards(state.currentHistory)}
    `;
    return;
  }

  activityPanelBody.innerHTML = renderActivityCards(state.currentHistory);
}

async function openHistoryPopupWithFilter(filter = "all") {
  if (!state.workspaceId || !state.currentPath) {
    showBanner("error", "Open a file first.");
    return;
  }

  state.activityFilter = filter;
  const normalizedFilter = filter === "edited" ? "saved" : filter;
  const params = new URLSearchParams({
    action: normalizedFilter,
    filePath: state.currentPath,
  });
  const result = await apiRequest(`${API_BASE_URL}/api/cfm/activity/${encodeURIComponent(state.workspaceId)}/file?${params.toString()}`, {
    headers: authHeaders(),
  });

  state.currentHistory = result.activities || [];
  historyPopupBody.innerHTML = renderActivityCards(state.currentHistory, true);
  openHistoryPopup();
}

async function openComparePanel() {
  if (!state.workspaceId || !state.currentPath) {
    showBanner("error", "Open a file first.");
    return;
  }

  const params = new URLSearchParams({ filePath: state.currentPath });
  const result = await apiRequest(`${API_BASE_URL}/api/cfm/compare/${encodeURIComponent(state.workspaceId)}/file?${params.toString()}`, {
    headers: authHeaders(),
  });

  const diff = renderCompareCode(result.previousContent || "", result.currentContent || "");
  openActivityPanel("Compare Changes", "Compare");
  activityFilterBar.classList.add("hidden");
  activityPanelBody.innerHTML = `
    <div class="compare-grid">
      <div class="compare-column">
        <h5>Previous version</h5>
        <div class="diff-code">${diff.left}</div>
      </div>
      <div class="compare-column">
        <h5>Current version</h5>
        <div class="diff-code">${diff.right}</div>
      </div>
    </div>
    <div class="summary-card">
      <div class="summary-meta">${escapeHtml(formatDate(result.changedAt))}</div>
      <p>${escapeHtml(result.simpleSummary || "")}</p>
      <div class="activity-meta">${result.linesAdded || 0} lines added | ${result.linesRemoved || 0} lines removed</div>
    </div>
  `;
}

async function explainCurrentChanges() {
  if (!state.currentPath || state.currentItemType !== "file") {
    showBanner("error", "Open a file first.");
    return;
  }

  const editor = document.getElementById("codeEditor");
  const currentVersion = state.editMode && editor ? editor.value : state.currentContent;
  const result = await apiRequest(`${API_BASE_URL}/api/cfm/explain-changes`, {
    method: "POST",
    headers: authHeaders("application/json"),
    body: JSON.stringify({
      filePath: state.currentPath,
      oldContent: state.originalContent || state.currentContent,
      newContent: currentVersion,
    }),
  });

  state.currentSummary = result.simpleSummary || "";
  openActivityPanel("Explain Changes", "Summary");
  activityFilterBar.classList.add("hidden");
  const summaryLines = state.currentSummary
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const headline = summaryLines[0] || "This file was reviewed and saved without major content changes.";
  const supportingLines = summaryLines.slice(1);
  activityPanelBody.innerHTML = `
    <section class="summary-showcase">
      <div class="summary-hero">
        <div class="summary-title">
          <p class="panel-label">Summary</p>
          <h5>Explain Changes</h5>
        </div>
        <p class="summary-output">${escapeHtml(headline)}</p>
        <div class="summary-meta">${result.linesAdded || 0} lines added · ${result.linesRemoved || 0} lines removed · Last updated ${escapeHtml(formatDate(new Date()))}</div>
      </div>
      <div class="summary-card highlight">
        <strong>Change summary</strong>
        <div class="summary-output">${escapeHtml(state.currentSummary)}</div>
        ${
          supportingLines.length
            ? `<ul class="summary-impact">${supportingLines.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>`
            : ""
        }
        <div class="summary-actions">
          <button class="subtle-button" id="copySummaryButton" type="button">Copy Summary</button>
          <button class="subtle-button" id="downloadSummaryButton" type="button">Download Summary</button>
        </div>
      </div>
    </section>
  `;

  document.getElementById("copySummaryButton").addEventListener("click", async () => {
    await navigator.clipboard.writeText(state.currentSummary);
    showBanner("success", "Change summary copied successfully.");
  });

  document.getElementById("downloadSummaryButton").addEventListener("click", () => {
    const blob = new Blob([state.currentSummary], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${(state.currentFileName || "change-summary").replace(/\.[^.]+$/, "")}-summary.md`;
    link.click();
    URL.revokeObjectURL(url);
  });
}

function showFileInformation() {
  if (!state.currentFileInfo) {
    showBanner("error", "Open a file or folder first.");
    return;
  }

  previewDropdownMenu.classList.add("hidden");

  const filePath = state.currentFileInfo.filePath || state.currentPath || "-";
  const fileName = state.currentFileInfo.fileName || state.currentFileName || "-";
  const fileType = fileName.includes(".") ? fileName.split(".").pop().toUpperCase() : state.currentItemType || "ITEM";
  const fileSize = formatBytes(new Blob([state.currentContent || ""]).size);
  const totalLines = String(state.currentContent || "").split("\n").length;
  const editable = state.currentItemType === "file" && allowedExtensions.some((ext) => fileName.toLowerCase().endsWith(ext));

  fileInfoPopupBody.innerHTML = `
    <div class="info-row"><span>File name</span><strong>${escapeHtml(fileName)}</strong></div>
    <div class="info-row"><span>File type</span><strong>${escapeHtml(fileType)}</strong></div>
    <div class="info-row"><span>File size</span><strong>${escapeHtml(fileSize)}</strong></div>
    <div class="info-row"><span>File path</span><strong>${escapeHtml(filePath)}</strong></div>
    <div class="info-row"><span>Last opened</span><strong>${escapeHtml(formatDate(state.lastOpenedAt || new Date()))}</strong></div>
    <div class="info-row"><span>Last modified</span><strong>${escapeHtml(formatDate(state.currentFileInfo.lastModifiedAt))}</strong></div>
    <div class="info-row"><span>Total lines</span><strong>${escapeHtml(totalLines)}</strong></div>
    <div class="info-row"><span>Access mode</span><strong>${editable ? "Editable" : "Read only"}</strong></div>
    <div class="info-row"><span>Workspace name</span><strong>${escapeHtml(state.workspaceLabel || "Workspace")}</strong></div>
  `;
  openFileInfoPopup();
}

async function handleFileSelection(fileList, isFolderMode) {
  const files = Array.from(fileList || []);
  if (!files.length) {
    return;
  }

  const { allowedFiles, relativePaths } = filterAllowedWorkspaceFiles(files, isFolderMode);

  if (!allowedFiles.length) {
    showBanner("error", "Choose coding files like .html, .css, .js, .json, .md, .py, or .php.");
    return;
  }

  await uploadWorkspace(allowedFiles, relativePaths);
}

async function handleAddFilesSelection(fileList) {
  const files = Array.from(fileList || []);
  if (!files.length) {
    return;
  }

  const { allowedFiles, relativePaths } = filterAllowedWorkspaceFiles(files, false);

  if (!allowedFiles.length) {
    showBanner("error", "Choose coding files like .html, .css, .js, .json, .md, .py, or .php.");
    return;
  }

  await addFilesToWorkspace(allowedFiles, relativePaths);
}

async function runSearch(options = {}) {
  if (!state.workspaceId) {
    renderSearchEmptyState();
    if (!options.silent) {
      showBanner("error", "Open a file or folder first.");
    }
    return;
  }

  const query = searchInput.value.trim();
  if (!query) {
    renderSearchEmptyState();
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
  renderSearchPopupResults(state.searchResults);
  if (!options.keepPopupState) {
    openSearchPopup();
    setActiveNav("searchFilesButton");
  }
}

async function loadPrivacyStatus() {
  const result = await apiRequest(`${API_BASE_URL}/api/cfm/privacy/status`, {
    headers: authHeaders(),
  });

  state.privacyMode = result.privacyMode || "not-private";
  state.hasPin = Boolean(result.hasPin);
  notPrivateModeButton.classList.toggle("active-mode", state.privacyMode === "not-private");
  privateModeButton.classList.toggle("active-mode", state.privacyMode === "private");
  privacyStatusText.textContent = state.privacyMode === "private" ? "Private ON" : "Not Private";
}

async function loadEmployeeFiles() {
  const result = await apiRequest(`${API_BASE_URL}/api/company/employee-files`, {
    headers: authHeaders(),
  });
  state.employeeFiles = result.employeeFiles || [];
}

function resetEmployeeForm() {
  state.editingEmployeeId = "";
  document.getElementById("employeeNameInput").value = "";
  document.getElementById("employeeRoleInput").value = "";
  document.getElementById("employeeFileNameInput").value = "";
  document.getElementById("employeeNotesInput").value = "";
  document.getElementById("saveEmployeeButton").textContent = "Add employee file";
}

function renderEmployeeFiles() {
  if (!state.employeeFiles.length) {
    employeeList.innerHTML = '<div class="empty-state">No employee files yet</div>';
    return;
  }

  employeeList.innerHTML = state.employeeFiles
    .map((item) => `
      <div class="employee-item">
        <strong>${escapeHtml(item.name)}</strong>
        <div class="employee-item-meta">
          <span>${escapeHtml(item.role || "No role")}</span>
          <span>${escapeHtml(item.fileName || "No file name")}</span>
          <span>${escapeHtml(item.notes || "No notes")}</span>
        </div>
        <div class="employee-item-actions">
          <button class="subtle-button" data-employee-view="${item._id}" type="button">View employee file</button>
          <button class="subtle-button" data-employee-edit="${item._id}" type="button">Update employee file</button>
          <button class="subtle-button" data-employee-remove="${item._id}" type="button">Remove employee file</button>
        </div>
      </div>
    `)
    .join("");

  employeeList.querySelectorAll("[data-employee-view]").forEach((button) => {
    button.addEventListener("click", () => {
      const employee = state.employeeFiles.find((item) => item._id === button.dataset.employeeView);
      if (employee) {
        showBanner("success", `Employee file: ${employee.name} | ${employee.fileName || "No file name"}`);
      }
    });
  });

  employeeList.querySelectorAll("[data-employee-edit]").forEach((button) => {
    button.addEventListener("click", () => {
      const employee = state.employeeFiles.find((item) => item._id === button.dataset.employeeEdit);
      if (!employee) {
        return;
      }
      state.editingEmployeeId = employee._id;
      document.getElementById("employeeNameInput").value = employee.name || "";
      document.getElementById("employeeRoleInput").value = employee.role || "";
      document.getElementById("employeeFileNameInput").value = employee.fileName || "";
      document.getElementById("employeeNotesInput").value = employee.notes || "";
      document.getElementById("saveEmployeeButton").textContent = "Update employee file";
    });
  });

  employeeList.querySelectorAll("[data-employee-remove]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!window.confirm("Remove this employee file from workspace?")) {
        return;
      }
      await apiRequest(`${API_BASE_URL}/api/company/employee-files/${button.dataset.employeeRemove}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      await loadEmployeeFiles();
      renderEmployeeFiles();
      showBanner("success", "Employee file removed successfully.");
    });
  });
}

async function saveEmployeeFile() {
  const payload = {
    name: document.getElementById("employeeNameInput").value.trim(),
    role: document.getElementById("employeeRoleInput").value.trim(),
    fileName: document.getElementById("employeeFileNameInput").value.trim(),
    notes: document.getElementById("employeeNotesInput").value.trim(),
  };

  if (!payload.name) {
    showBanner("error", "Employee name is required.");
    return;
  }

  if (state.editingEmployeeId) {
    await apiRequest(`${API_BASE_URL}/api/company/employee-files/${state.editingEmployeeId}`, {
      method: "PUT",
      headers: authHeaders("application/json"),
      body: JSON.stringify(payload),
    });
    showBanner("success", "Employee file updated successfully.");
  } else {
    await apiRequest(`${API_BASE_URL}/api/company/employee-files`, {
      method: "POST",
      headers: authHeaders("application/json"),
      body: JSON.stringify(payload),
    });
    showBanner("success", "Employee file added successfully.");
  }

  await loadEmployeeFiles();
  renderEmployeeFiles();
  resetEmployeeForm();
}

async function openEmployeeFilesModal() {
  await loadEmployeeFiles();
  resetEmployeeForm();
  renderEmployeeFiles();
  closeModal(settingsModal);
  openModal(employeeFilesModal);
}

async function openCompanyDetailsModal() {
  const result = await apiRequest(`${API_BASE_URL}/api/cfm/company/edit/current`, {
    headers: authHeaders(),
  });

  if (result.success === false) {
    throw new Error(result.message || "Failed to load company details.");
  }

  const details = result;

  document.getElementById("updateCompanyName").value = details.companyName || "";
  document.getElementById("updateCompanyEmail").value = details.companyEmail || "";
  document.getElementById("updateCompanyPhone").value = details.companyPhone || "";
  document.getElementById("updateCompanyWebsite").value = details.companyWebsite || "";
  document.getElementById("updateOfficeDetails").value = details.officeDetails || "";
  document.getElementById("updateHeadOfficeCity").value = details.headOfficeCity || "";
  document.getElementById("updateHeadOfficeState").value = details.headOfficeState || "";
  document.getElementById("updateHeadOfficeCountry").value = details.headOfficeCountry || "";
  document.getElementById("updateHeadOfficePincode").value = details.headOfficePincode || "";
  document.getElementById("updateFilledByName").value = details.filledByName || "";
  document.getElementById("updateFilledByEmail").value = details.filledByEmail || "";
  document.getElementById("updateFilledByPhone").value = details.filledByPhone || "";
  document.getElementById("updatePersonName").value = details.personName || "";
  document.getElementById("updatePersonEmail").value = details.personEmail || "";
  document.getElementById("updatePersonPhone").value = details.personPhone || "";
  document.getElementById("updatePersonPosition").value = details.personPosition || "";
  document.getElementById("updateCompanyDetails").value = details.companyDetails || "";
  document.getElementById("updateCompanyLogo").value = "";
  document.getElementById("updateCompanyPhoto").value = "";
  document.getElementById("updateCompanyProof").value = "";

  openModal(companyDetailsModal);
}

async function saveCompanyDetailsUpdate() {
  const formData = new FormData();
  [
    ["companyName", "updateCompanyName"],
    ["companyEmail", "updateCompanyEmail"],
    ["companyPhone", "updateCompanyPhone"],
    ["companyWebsite", "updateCompanyWebsite"],
    ["officeDetails", "updateOfficeDetails"],
    ["headOfficeCity", "updateHeadOfficeCity"],
    ["headOfficeState", "updateHeadOfficeState"],
    ["headOfficeCountry", "updateHeadOfficeCountry"],
    ["headOfficePincode", "updateHeadOfficePincode"],
    ["filledByName", "updateFilledByName"],
    ["filledByEmail", "updateFilledByEmail"],
    ["filledByPhone", "updateFilledByPhone"],
    ["personName", "updatePersonName"],
    ["personEmail", "updatePersonEmail"],
    ["personPhone", "updatePersonPhone"],
    ["personPosition", "updatePersonPosition"],
    ["companyDetails", "updateCompanyDetails"],
  ].forEach(([field, elementId]) => {
    formData.append(field, document.getElementById(elementId).value.trim());
  });

  const logoFile = document.getElementById("updateCompanyLogo").files[0];
  const photoFile = document.getElementById("updateCompanyPhoto").files[0];
  const proofFile = document.getElementById("updateCompanyProof").files[0];
  if (logoFile) formData.append("companyLogo", logoFile);
  if (photoFile) formData.append("companyPhoto", photoFile);
  if (proofFile) formData.append("companyProof", proofFile);

  await apiRequest(`${API_BASE_URL}/api/cfm/company/edit/request`, {
    method: "POST",
    headers: authHeaders(),
    body: formData,
  });

  await loadCompanyProfile();
  closeModal(companyDetailsModal);
  state.companyEditUnlocked = false;
  showBanner("success", "Edit request submitted for admin approval.");
}

function openCompanyEditPasswordModal() {
  closeModal(settingsModal);
  resetCompanyEditPasswordState();
  openModal(companyEditPasswordModal);
}

function mapVerifyPasswordError(message = "") {
  if (/wrong company password/i.test(message)) {
    return "Wrong company password";
  }
  if (/authentication token is required|invalid or expired token|only company accounts can access|login required/i.test(message)) {
    return "Login required";
  }
  if (/database connection failed/i.test(message)) {
    return "Database connection failed";
  }
  return message || "Server error. Please try again.";
}

async function verifyCompanyEditPassword() {
  console.log("Verify password clicked");
  const password = companyEditPasswordInput.value.trim();
  const companyToken = state.token;
  const verifyUrl = `${API_BASE_URL}/api/cfm/company/edit/verify-password`;

  setInlineMessage(companyEditPasswordSuccess, "");
  setInlineMessage(companyEditPasswordError, "");

  if (!companyToken) {
    setInlineMessage(companyEditPasswordError, "Login required", "error");
    return;
  }

  if (!password) {
    setInlineMessage(companyEditPasswordError, "Company password is required.", "error");
    return;
  }

  verifyCompanyEditPasswordButton.disabled = true;
  verifyCompanyEditPasswordButton.classList.add("is-loading");
  verifyCompanyEditPasswordButton.textContent = "Checking password...";

  try {
    console.log("API URL:", verifyUrl);
    console.log("Token exists:", !!companyToken);

    const response = await fetch(verifyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${companyToken}`,
      },
      body: JSON.stringify({ password }),
    });
    console.log("Verify response status:", response.status);

    const data = await parseJsonResponse(response);
    console.log("Verify API response:", data);

    if (!response.ok || data.success === false) {
      setInlineMessage(companyEditPasswordError, mapVerifyPasswordError(data.message), "error");
      return;
    }

    if (data.success !== true) {
      setInlineMessage(companyEditPasswordError, "Wrong company password", "error");
      return;
    }

    setInlineMessage(companyEditPasswordSuccess, data.message || "Password verified", "success");
    state.companyEditUnlocked = true;
    sessionStorage.setItem(
      EDIT_ACCESS_KEY,
      JSON.stringify({
        allowed: true,
        verifiedAt: Date.now(),
      })
    );
    console.log("Opening DDO One edit form");
    window.setTimeout(async () => {
      try {
        closeModal(companyEditPasswordModal);
        window.location.href = "/CFM/company-details-edit/";
      } catch (error) {
        console.log("Opening DDO One edit form failed:", error.message);
        openModal(companyEditPasswordModal);
        setInlineMessage(
          companyEditPasswordError,
          /database connection failed/i.test(error.message)
            ? "Database connection failed"
            : "Password verified, but edit form failed to open.",
          "error"
        );
      }
    }, 320);
  } catch (error) {
    console.log("Verify API response:", { error: error.message });
    setInlineMessage(companyEditPasswordError, mapVerifyPasswordError(error.message), "error");
  } finally {
    verifyCompanyEditPasswordButton.disabled = false;
    verifyCompanyEditPasswordButton.classList.remove("is-loading");
    verifyCompanyEditPasswordButton.textContent = "Verify Password";
  }
}

function openLogoutPasswordModal() {
  closeModal(settingsModal);
  logoutPasswordInput.value = "";
  openModal(logoutPasswordModal);
}

async function confirmLogoutWithPassword() {
  await apiRequest(`${API_BASE_URL}/api/company/verify-password`, {
    method: "POST",
    headers: authHeaders("application/json"),
    body: JSON.stringify({ companyPassword: logoutPasswordInput.value }),
  });
  closeModal(logoutPasswordModal);
  localStorage.removeItem(TOKEN_KEY);
  window.location.href = LOGIN_PATH;
}

function renderCompanyDetails(company) {
  companyDetailsPanel.innerHTML = `
    <div class="detail-row"><span>Company Name</span><strong>${escapeHtml(company.companyName)}</strong></div>
    <div class="detail-row"><span>Company ID</span><strong>${escapeHtml(company.companyId)}</strong></div>
    <div class="detail-row"><span>Company Email</span><strong>${escapeHtml(company.companyEmail)}</strong></div>
    <div class="detail-row"><span>Company Phone</span><strong>${escapeHtml(company.companyPhone)}</strong></div>
    <div class="detail-row"><span>Company Website</span><strong>${escapeHtml(company.companyWebsite)}</strong></div>
    <div class="detail-row"><span>Company Status</span><strong>${escapeHtml(company.status)}</strong></div>
    <div class="detail-row"><span>Created Date</span><strong>${escapeHtml(formatDate(company.createdAt))}</strong></div>
  `;
}

async function openCompanyInfo() {
  clearBanner();
  await loadPrivacyStatus();
  setActiveNav("companyInfoButton");

  if (state.privacyMode === "private" && state.hasPin) {
    state.verifyPinDraft = "";
    pinVerifyValue.value = "";
    openModal(pinVerifyModal);
    return;
  }

  const result = await apiRequest(`${API_BASE_URL}/api/cfm/company-info`, {
    headers: authHeaders(),
  });

  renderCompanyDetails(result.company);
  openModal(companyInfoModal);
}

async function setNotPrivateMode() {
  const result = await apiRequest(`${API_BASE_URL}/api/cfm/privacy/set-not-private`, {
    method: "POST",
    headers: authHeaders("application/json"),
    body: JSON.stringify({}),
  });

  await loadPrivacyStatus();
  showBanner("success", result.message || "Private mode disabled.");
}

function openPinCreation(stage) {
  state.pinStage = stage;
  if (stage === "create") {
    state.pinDraft = "";
    pinModalTitle.textContent = "Create Private PIN";
    pinInputLabel.textContent = "Enter PIN";
    pinInputValue.value = "";
  } else {
    state.pinConfirmDraft = "";
    pinModalTitle.textContent = "Confirm Private PIN";
    pinInputLabel.textContent = "Confirm PIN";
    pinInputValue.value = "";
  }
  openModal(pinSetupModal);
}

async function submitPinCreation() {
  const currentValue = state.pinStage === "create" ? state.pinDraft : state.pinConfirmDraft;

  if (!/^\d{4,6}$/.test(currentValue)) {
    showBanner("error", "PIN must be 4 to 6 digits.");
    return;
  }

  if (state.pinStage === "create") {
    closeModal(pinSetupModal);
    openPinCreation("confirm");
    return;
  }

  if (state.pinDraft !== state.pinConfirmDraft) {
    showBanner("error", "PIN and confirm PIN must match.");
    return;
  }

  const result = await apiRequest(`${API_BASE_URL}/api/cfm/privacy/set-private`, {
    method: "POST",
    headers: authHeaders("application/json"),
    body: JSON.stringify({
      pin: state.pinDraft,
      confirmPin: state.pinConfirmDraft,
    }),
  });

  closeModal(pinSetupModal);
  await loadPrivacyStatus();
  showBanner("success", result.message || "Private mode enabled");
}

async function verifyPinAndOpenCompanyInfo() {
  if (!/^\d{4,6}$/.test(state.verifyPinDraft)) {
    showBanner("error", "PIN must be 4 to 6 digits.");
    return;
  }

  const result = await apiRequest(`${API_BASE_URL}/api/cfm/privacy/verify-pin`, {
    method: "POST",
    headers: authHeaders("application/json"),
    body: JSON.stringify({ pin: state.verifyPinDraft }),
  });

  closeModal(pinVerifyModal);
  renderCompanyDetails(result.company);
  openModal(companyInfoModal);
  showBanner("success", "Private mode unlocked successfully.");
}

function updatePinInputValue() {
  pinInputValue.value = state.pinStage === "create" ? state.pinDraft : state.pinConfirmDraft;
}

function buildPinPad(container, inputGetter, inputSetter, onSubmit) {
  container.innerHTML = "";
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "Clear", "0", "Backspace", "Submit"];

  keys.forEach((key) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "pin-key";
    button.textContent = key;
    button.addEventListener("click", async () => {
      if (/^\d$/.test(key)) {
        const current = inputGetter();
        if (current.length < 6) {
          inputSetter(`${current}${key}`);
        }
        return;
      }

      if (key === "Clear") {
        inputSetter("");
        return;
      }

      if (key === "Backspace") {
        inputSetter(inputGetter().slice(0, -1));
        return;
      }

      await onSubmit();
    });
    container.appendChild(button);
  });
}

async function copyCurrentCode() {
  if (!state.currentContent) {
    return;
  }

  await navigator.clipboard.writeText(state.currentContent);
  showBanner("success", "File copied successfully.");
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
    syncSidebarState();
    await loadCompanyProfile();
    await loadPrivacyStatus();
    renderTree();
    renderPreview();
    renderNotifications();
    syncAddFilesButton();
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
document.getElementById("addFilesButton").addEventListener("click", () => {
  if (!state.workspaceId) {
    showBanner("error", "Open a file or folder first.");
    return;
  }
  document.getElementById("addFilesInput").click();
});
document.getElementById("addFilesInput").addEventListener("change", async (event) => {
  await handleAddFilesSelection(event.target.files);
  event.target.value = "";
});

document.getElementById("searchFilesButton").addEventListener("click", async () => {
  setActiveNav("searchFilesButton");
  openSearchPopup();
});
document.getElementById("searchPopupButton").addEventListener("click", () => {
  setActiveNav("searchFilesButton");
  openSearchPopup();
});
document.getElementById("closeSearchPopupButton").addEventListener("click", closeSearchPopup);
clearSearchButton.addEventListener("click", async () => {
  searchInput.value = "";
  state.searchResults = [];
  syncSearchClearButton();
  renderSearchEmptyState();
  searchInput.focus();
});
voiceSearchButton.addEventListener("click", async () => {
  if (voiceRecognition) {
    stopVoiceSearch();
    return;
  }
  await startVoiceSearch();
});
searchInput.addEventListener("keydown", async (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    await runSearch({ keepPopupState: true });
  }
});
searchInput.addEventListener("input", async () => {
  syncSearchClearButton();
  if (!searchInput.value.trim()) {
    state.searchResults = [];
    renderSearchEmptyState();
    return;
  }
  if (!state.workspaceId) {
    renderSearchEmptyState();
    return;
  }
  await runSearch({ keepPopupState: true, silent: true });
});

document.getElementById("companyInfoButton").addEventListener("click", openCompanyInfo);
document.getElementById("closeCompanyInfoModalButton").addEventListener("click", () => closeModal(companyInfoModal));
document.getElementById("closePinSetupModalButton").addEventListener("click", () => closeModal(pinSetupModal));
document.getElementById("closePinVerifyModalButton").addEventListener("click", () => closeModal(pinVerifyModal));
document.getElementById("settingsButton").addEventListener("click", () => openModal(settingsModal));
document.getElementById("digitalFileActivityButton").addEventListener("click", async () => {
  setActiveNav("digitalFileActivityButton");
  await loadActivityPanel("all", state.currentItemType === "folder" ? "folder" : "file");
});
document.getElementById("toggleFilesPanelButton").addEventListener("click", () => setFilesPanelHidden(true));
document.getElementById("showFilesPanelButton").addEventListener("click", () => setFilesPanelHidden(false));
document.getElementById("closeSettingsModalButton").addEventListener("click", () => closeModal(settingsModal));
document.getElementById("employeeFilesButton").addEventListener("click", openEmployeeFilesModal);
document.getElementById("companyDetailsUpdateButton").addEventListener("click", openCompanyEditPasswordModal);
document.getElementById("settingsLogoutButton").addEventListener("click", openLogoutPasswordModal);
document.getElementById("goBackButton").addEventListener("click", goBack);
document.getElementById("closeActivityPanelButton").addEventListener("click", closeActivityPanel);
document.getElementById("closeHistoryPopupButton").addEventListener("click", closeHistoryPopup);
document.getElementById("closeFileInfoPopupButton").addEventListener("click", closeFileInfoPopup);
document.querySelectorAll("[data-activity-filter]").forEach((button) => {
  button.addEventListener("click", async () => {
    document.querySelectorAll("[data-activity-filter]").forEach((node) => node.classList.remove("active"));
    button.classList.add("active");
    await loadActivityPanel(button.dataset.activityFilter || "all", state.currentItemType === "folder" ? "folder" : "file");
  });
});
document.querySelectorAll("[data-history-filter]").forEach((button) => {
  button.addEventListener("click", async () => {
    document.querySelectorAll("[data-history-filter]").forEach((node) => node.classList.remove("active"));
    button.classList.add("active");
    await openHistoryPopupWithFilter(button.dataset.historyFilter || "all");
  });
});
editCodeButton.addEventListener("click", startEditMode);
document.getElementById("undoEditButton").addEventListener("click", undoEdit);
document.getElementById("redoEditButton").addEventListener("click", redoEdit);
document.getElementById("cancelEditButton").addEventListener("click", cancelEditMode);
document.getElementById("saveEditButton").addEventListener("click", openSaveCommitPopup);
document.getElementById("closeCommitPopupButton").addEventListener("click", closeCommitPopup);
document.getElementById("cancelCommitButton").addEventListener("click", closeCommitPopup);
document.getElementById("submitCommitSaveButton").addEventListener("click", submitSaveWithCommit);
document.getElementById("explainCommitButton").addEventListener("click", explainCommitChanges);
document.getElementById("commitTitleInput").addEventListener("input", updateCommitCounts);
document.getElementById("commitDetailsInput").addEventListener("input", updateCommitCounts);
copyCodeButton.addEventListener("click", copyCurrentCode);
document.getElementById("previewInfoButton").addEventListener("click", showFileInformation);
document.getElementById("maximizePreviewButton").addEventListener("click", () => {
  setPreviewMaximized(!state.previewMaximized);
});
document.getElementById("notificationButton").addEventListener("click", () => openModal(notificationModal));
document.getElementById("closeNotificationModalButton").addEventListener("click", () => closeModal(notificationModal));
document.getElementById("themeToggleButton").addEventListener("click", toggleTheme);
document.getElementById("logoutButton").addEventListener("click", openLogoutPasswordModal);
document.getElementById("previewMenuButton").addEventListener("click", () => {
  previewDropdownMenu.classList.toggle("hidden");
});
document.getElementById("previewCopyMenuItem").addEventListener("click", copyCurrentCode);
document.getElementById("previewEditMenuItem").addEventListener("click", startEditMode);
document.getElementById("previewSaveMenuItem").addEventListener("click", openSaveCommitPopup);
document.getElementById("previewHistoryMenuItem").addEventListener("click", async () => {
  await openHistoryPopupWithFilter("all");
});
document.getElementById("previewCompareMenuItem").addEventListener("click", openComparePanel);
document.getElementById("previewExplainMenuItem").addEventListener("click", explainCurrentChanges);
document.getElementById("previewInfoMenuItem").addEventListener("click", () => {
  showFileInformation();
});
document.getElementById("closeEmployeeFilesModalButton").addEventListener("click", () => closeModal(employeeFilesModal));
document.getElementById("saveEmployeeButton").addEventListener("click", saveEmployeeFile);
document.getElementById("resetEmployeeButton").addEventListener("click", resetEmployeeForm);
document.getElementById("closeCompanyDetailsModalButton").addEventListener("click", () => closeModal(companyDetailsModal));
document.getElementById("saveCompanyDetailsButton").addEventListener("click", saveCompanyDetailsUpdate);
document.getElementById("closeCompanyEditPasswordModalButton").addEventListener("click", () => {
  resetCompanyEditPasswordState();
  closeModal(companyEditPasswordModal);
});
verifyCompanyEditPasswordButton.addEventListener("click", verifyCompanyEditPassword);
companyEditPasswordInput.addEventListener("keydown", async (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    await verifyCompanyEditPassword();
  }
});
document.getElementById("toggleCompanyEditPasswordButton").addEventListener("click", () => {
  const nextType = companyEditPasswordInput.type === "password" ? "text" : "password";
  companyEditPasswordInput.type = nextType;
  document
    .getElementById("toggleCompanyEditPasswordButton")
    .setAttribute("aria-label", nextType === "password" ? "Show password" : "Hide password");
});
document.getElementById("resetCompanyPasswordLinkButton").addEventListener("click", async () => {
  try {
    if (!state.company?.companyEmail) {
      throw new Error("Company email not found.");
    }

    const response = await apiRequest(`${API_BASE_URL}/api/company/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyEmail: state.company.companyEmail }),
    });

    setInlineMessage(companyEditPasswordSuccess, response.message || "Reset password email sent.", "success");
    setInlineMessage(companyEditPasswordError, "");
    window.open(`${API_BASE_URL}/reset-company-password.html`, "_blank", "noopener");
  } catch (error) {
    setInlineMessage(companyEditPasswordError, error.message || "Server error. Please try again.", "error");
  }
});
document.getElementById("closeLogoutPasswordModalButton").addEventListener("click", () => closeModal(logoutPasswordModal));
document.getElementById("confirmLogoutButton").addEventListener("click", confirmLogoutWithPassword);

themeSelect.addEventListener("change", () => {
  setTheme(themeSelect.value);
  showBanner("success", "Theme updated successfully.");
});

notPrivateModeButton.addEventListener("click", async () => {
  await setNotPrivateMode();
});

privateModeButton.addEventListener("click", () => {
  closeModal(companyInfoModal);
  openPinCreation("create");
});

buildPinPad(
  document.getElementById("pinPad"),
  () => (state.pinStage === "create" ? state.pinDraft : state.pinConfirmDraft),
  (value) => {
    if (state.pinStage === "create") {
      state.pinDraft = value;
    } else {
      state.pinConfirmDraft = value;
    }
    updatePinInputValue();
  },
  submitPinCreation
);

buildPinPad(
  document.getElementById("verifyPinPad"),
  () => state.verifyPinDraft,
  (value) => {
    state.verifyPinDraft = value;
    pinVerifyValue.value = value;
  },
  verifyPinAndOpenCompanyInfo
);

window.addEventListener("click", (event) => {
  if (event.target === uploadModal) {
    closeModal(uploadModal);
  }
  if (event.target === companyInfoModal) {
    closeModal(companyInfoModal);
  }
  if (event.target === pinSetupModal) {
    closeModal(pinSetupModal);
  }
  if (event.target === pinVerifyModal) {
    closeModal(pinVerifyModal);
  }
  if (event.target === settingsModal) {
    closeModal(settingsModal);
  }
  if (event.target === notificationModal) {
    closeModal(notificationModal);
  }
  if (event.target === employeeFilesModal) {
    closeModal(employeeFilesModal);
  }
  if (event.target === companyEditPasswordModal) {
    resetCompanyEditPasswordState();
    closeModal(companyEditPasswordModal);
  }
  if (event.target === companyDetailsModal) {
    closeModal(companyDetailsModal);
  }
  if (event.target === logoutPasswordModal) {
    closeModal(logoutPasswordModal);
  }
  if (event.target === historyPopup) {
    closeHistoryPopup();
  }
  if (event.target === commitPopup) {
    closeCommitPopup();
  }
  if (!event.target.closest("#searchPopup") && !event.target.closest("#searchPopupButton") && !event.target.closest("#searchFilesButton")) {
    closeSearchPopup();
  }
  if (!event.target.closest("#fileInfoPopup") && !event.target.closest("#previewInfoButton") && !event.target.closest("#previewInfoMenuItem")) {
    closeFileInfoPopup();
  }
  if (!event.target.closest(".preview-dropdown")) {
    previewDropdownMenu.classList.add("hidden");
  }
});

window.addEventListener("resize", syncSidebarState);

initializeDashboard();
