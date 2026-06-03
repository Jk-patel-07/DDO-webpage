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
const copyCodeButton = document.getElementById("copyCodeButton");
const previewDropdownMenu = document.getElementById("previewDropdownMenu");
const themeSelect = document.getElementById("themeSelect");
const themeToggleText = document.getElementById("themeToggleText");
const pinModalTitle = document.getElementById("pinModalTitle");
const pinInputLabel = document.getElementById("pinInputLabel");
const pinInputValue = document.getElementById("pinInputValue");
const pinVerifyValue = document.getElementById("pinVerifyValue");
const employeeFilesModal = document.getElementById("employeeFilesModal");
const employeeList = document.getElementById("employeeList");
const companyDetailsModal = document.getElementById("companyDetailsModal");
const logoutPasswordModal = document.getElementById("logoutPasswordModal");
const logoutPasswordInput = document.getElementById("logoutPasswordInput");
const openSidebarButton = document.getElementById("openSidebarButton");
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
}

function goBack() {
  if (!state.viewHistory.length) {
    return;
  }

  state.view = state.viewHistory.pop();
  renderPreview();
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

function renderPreview() {
  breadcrumbPath.textContent = buildBreadcrumb(state.currentPath);
  copyCodeButton.disabled = !state.currentContent;
  previewDropdownMenu.classList.add("hidden");

  if (state.view === "file") {
    previewFileName.textContent = state.currentFileName || "Selected file";
    previewMeta.textContent = state.currentPath || "Preview loaded";
    previewContent.innerHTML = renderCodePreview(state.currentContent);
    const codeElement = previewContent.querySelector("code");
    if (window.hljs && codeElement) {
      window.hljs.highlightElement(codeElement);
    }
    return;
  }

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
  state.searchResults = [];
  state.viewHistory = [];
  state.expandedPaths = new Set();

  pushView("workspace");
  renderTree();
  renderPreview();
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
    state.view = "workspace";
  }

  renderTree();
  renderPreview();
  showBanner("success", result.message || "File deleted successfully.");
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
  renderPreview();
  setActiveNav("searchFilesButton");
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
  const details = await apiRequest(`${API_BASE_URL}/api/company/details`, {
    headers: authHeaders(),
  });

  document.getElementById("updateCompanyName").value = details.companyName || "";
  document.getElementById("updateCompanyEmail").value = details.companyEmail || "";
  document.getElementById("updateCompanyPhone").value = details.companyPhone || "";
  document.getElementById("updateCompanyWebsite").value = details.companyWebsite || "";
  document.getElementById("updateOfficeDetails").value = details.officeDetails || "";
  document.getElementById("updateHeadOfficeCity").value = details.headOfficeCity || "";
  document.getElementById("updateHeadOfficeState").value = details.headOfficeState || "";
  document.getElementById("updateHeadOfficeCountry").value = details.headOfficeCountry || "";
  document.getElementById("updateHeadOfficePincode").value = details.headOfficePincode || "";
  document.getElementById("updateCompanyDetails").value = details.companyDetails || "";

  closeModal(settingsModal);
  openModal(companyDetailsModal);
}

async function saveCompanyDetailsUpdate() {
  await apiRequest(`${API_BASE_URL}/api/company/details`, {
    method: "PUT",
    headers: authHeaders("application/json"),
    body: JSON.stringify({
      companyName: document.getElementById("updateCompanyName").value.trim(),
      companyEmail: document.getElementById("updateCompanyEmail").value.trim(),
      companyPhone: document.getElementById("updateCompanyPhone").value.trim(),
      companyWebsite: document.getElementById("updateCompanyWebsite").value.trim(),
      officeDetails: document.getElementById("updateOfficeDetails").value.trim(),
      headOfficeCity: document.getElementById("updateHeadOfficeCity").value.trim(),
      headOfficeState: document.getElementById("updateHeadOfficeState").value.trim(),
      headOfficeCountry: document.getElementById("updateHeadOfficeCountry").value.trim(),
      headOfficePincode: document.getElementById("updateHeadOfficePincode").value.trim(),
      companyDetails: document.getElementById("updateCompanyDetails").value.trim(),
    }),
  });

  await loadCompanyProfile();
  closeModal(companyDetailsModal);
  showBanner("success", "Company details updated successfully.");
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

document.getElementById("companyInfoButton").addEventListener("click", openCompanyInfo);
document.getElementById("closeCompanyInfoModalButton").addEventListener("click", () => closeModal(companyInfoModal));
document.getElementById("closePinSetupModalButton").addEventListener("click", () => closeModal(pinSetupModal));
document.getElementById("closePinVerifyModalButton").addEventListener("click", () => closeModal(pinVerifyModal));
document.getElementById("settingsButton").addEventListener("click", () => openModal(settingsModal));
document.getElementById("closeSettingsModalButton").addEventListener("click", () => closeModal(settingsModal));
document.getElementById("employeeFilesButton").addEventListener("click", openEmployeeFilesModal);
document.getElementById("companyDetailsUpdateButton").addEventListener("click", openCompanyDetailsModal);
document.getElementById("settingsLogoutButton").addEventListener("click", openLogoutPasswordModal);
document.getElementById("goBackButton").addEventListener("click", goBack);
copyCodeButton.addEventListener("click", copyCurrentCode);
document.getElementById("notificationButton").addEventListener("click", () => openModal(notificationModal));
document.getElementById("closeNotificationModalButton").addEventListener("click", () => closeModal(notificationModal));
document.getElementById("themeToggleButton").addEventListener("click", toggleTheme);
document.getElementById("logoutButton").addEventListener("click", openLogoutPasswordModal);
document.getElementById("previewMenuButton").addEventListener("click", () => {
  previewDropdownMenu.classList.toggle("hidden");
});
document.getElementById("previewCopyMenuItem").addEventListener("click", copyCurrentCode);
document.getElementById("previewDownloadMenuItem").addEventListener("click", () => {
  if (!state.currentContent || !state.currentFileName) {
    showBanner("error", "Open a file first.");
    return;
  }
  const blob = new Blob([state.currentContent], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = state.currentFileName;
  link.click();
  URL.revokeObjectURL(url);
  showBanner("success", "Current file downloaded successfully.");
});
document.getElementById("previewInfoMenuItem").addEventListener("click", () => {
  if (!state.currentFileName) {
    showBanner("error", "Open a file first.");
    return;
  }
  showBanner("success", `File info: ${state.currentFileName} | ${state.currentPath}`);
});
document.getElementById("closeEmployeeFilesModalButton").addEventListener("click", () => closeModal(employeeFilesModal));
document.getElementById("saveEmployeeButton").addEventListener("click", saveEmployeeFile);
document.getElementById("resetEmployeeButton").addEventListener("click", resetEmployeeForm);
document.getElementById("closeCompanyDetailsModalButton").addEventListener("click", () => closeModal(companyDetailsModal));
document.getElementById("saveCompanyDetailsButton").addEventListener("click", saveCompanyDetailsUpdate);
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
  if (event.target === companyDetailsModal) {
    closeModal(companyDetailsModal);
  }
  if (event.target === logoutPasswordModal) {
    closeModal(logoutPasswordModal);
  }
  if (!event.target.closest(".preview-dropdown")) {
    previewDropdownMenu.classList.add("hidden");
  }
});

window.addEventListener("resize", syncSidebarState);

initializeDashboard();
