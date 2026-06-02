const API_BASE_URL = window.location.origin;
const TOKEN_KEY = "ddoCompanyToken";
const LOGIN_PATH = "./company-login.html";

const shell = document.querySelector(".cfm-shell");
const sidebar = document.getElementById("sidebar");
const sidebarBackdrop = document.getElementById("sidebarBackdrop");
const openSidebarButton = document.getElementById("openSidebarButton");
const closeSidebarButton = document.getElementById("closeSidebarButton");
const companyName = document.getElementById("companyName");
const companyEmail = document.getElementById("companyEmail");
const companyPhone = document.getElementById("companyPhone");
const companyWebsite = document.getElementById("companyWebsite");
const companyStatus = document.getElementById("companyStatus");
const selectedName = document.getElementById("selectedName");
const selectedMeta = document.getElementById("selectedMeta");
const previewPanel = document.getElementById("previewPanel");
const treePanel = document.getElementById("treePanel");
const treeRoot = document.getElementById("treeRoot");
const treeEmptyState = document.getElementById("treeEmptyState");
const breadcrumbPath = document.getElementById("breadcrumbPath");
const searchInput = document.getElementById("searchInput");
const searchButton = document.getElementById("searchButton");
const openWorkspaceButton = document.getElementById("openWorkspaceButton");
const browseFileButton = document.getElementById("browseFileButton");
const browseFolderButton = document.getElementById("browseFolderButton");
const localFileInput = document.getElementById("localFileInput");
const localFolderInput = document.getElementById("localFolderInput");
const logoutButton = document.getElementById("logoutButton");
const navButtons = document.querySelectorAll(".nav-item");

let currentSelectionPath = "";
let currentSelectionType = "";
const expandedFolders = new Set([""]);

function redirectToLogin() {
  window.location.href = LOGIN_PATH;
}

function getAuthHeaders() {
  const token = localStorage.getItem(TOKEN_KEY);
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function setSelectedState(title, meta, content = "") {
  selectedName.textContent = title;
  selectedMeta.textContent = meta;
  previewPanel.textContent = content || "No preview available for the selected item.";
}

function setBreadcrumb(pathValue = "") {
  breadcrumbPath.textContent = pathValue ? pathValue.replace(/\//g, " / ") : "No folder opened yet";
}

function setSidebarOpen(isOpen) {
  shell.classList.toggle("sidebar-open", isOpen);
  if (window.innerWidth <= 900) {
    shell.classList.remove("sidebar-collapsed");
  }
}

function setSidebarCollapsed(isCollapsed) {
  if (window.innerWidth > 900) {
    shell.classList.toggle("sidebar-collapsed", isCollapsed);
  } else if (!isCollapsed) {
    setSidebarOpen(true);
  } else {
    setSidebarOpen(false);
  }
}

function setTreeEmpty(message) {
  treeEmptyState.textContent = message;
  treeEmptyState.style.display = "block";
  treeRoot.innerHTML = "";
}

function renderTree(nodes = [], options = {}) {
  if (!nodes.length) {
    setTreeEmpty(options.emptyMessage || "No folder opened yet");
    return;
  }

  treeEmptyState.style.display = "none";
  treeRoot.innerHTML = "";

  const build = (items, depth = 0) => {
    const list = document.createElement("ul");
    list.className = depth === 0 ? "tree-root-list" : "tree-node-children";

    items.forEach((item) => {
      const listItem = document.createElement("li");
      listItem.className = "tree-node";
      if (item.itemType === "folder" && expandedFolders.has(item.relativePath || "")) {
        listItem.classList.add("is-open");
      }

      const row = document.createElement("div");
      row.className = "tree-row";

      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "tree-toggle";

      const label = document.createElement("button");
      label.type = "button";
      label.className = "tree-label";
      if (currentSelectionPath === item.relativePath) {
        label.classList.add("is-active");
      }

      const icon = document.createElement("span");
      icon.className = `tree-icon ${item.itemType === "folder" ? "folder" : "file"}`;

      const text = document.createElement("span");
      text.textContent = item.name;

      label.append(icon, text);

      if (item.itemType === "folder") {
        toggle.addEventListener("click", () => {
          const folderKey = item.relativePath || "";
          if (expandedFolders.has(folderKey)) {
            expandedFolders.delete(folderKey);
          } else {
            expandedFolders.add(folderKey);
          }
          renderTree(nodes, options);
        });

        label.addEventListener("click", () => {
          expandedFolders.add(item.relativePath || "");
          openServerTarget(item.relativePath);
        });
      } else {
        toggle.classList.add("spacer");
        toggle.setAttribute("aria-hidden", "true");
        label.addEventListener("click", () => openServerTarget(item.relativePath));
      }

      row.append(toggle, label);

      if (options.mode === "recent" && item.action) {
        const meta = document.createElement("span");
        meta.className = "tree-result-meta";
        meta.textContent = item.action;
        row.append(meta);
      }

      listItem.appendChild(row);

      if (item.itemType === "folder" && item.children?.length && expandedFolders.has(item.relativePath || "")) {
        listItem.appendChild(build(item.children, depth + 1));
      }

      list.appendChild(listItem);
    });

    return list;
  };

  treeRoot.appendChild(build(nodes));
}

function makeSearchTree(results = []) {
  return results.map((item) => ({
    ...item,
    children: [],
  }));
}

function listToTree(items = []) {
  const root = {};

  items.forEach((item) => {
    const parts = (item.relativePath || item.name).split("/").filter(Boolean);
    let cursor = root;

    parts.forEach((part, index) => {
      const relativePath = parts.slice(0, index + 1).join("/");
      const isFile = index === parts.length - 1;
      if (!cursor[part]) {
        cursor[part] = {
          name: part,
          relativePath,
          itemType: isFile ? "file" : "folder",
          childrenMap: {},
        };
      }
      cursor = cursor[part].childrenMap;
    });
  });

  const convert = (map) =>
    Object.values(map)
      .sort((left, right) => Number(right.itemType === "folder") - Number(left.itemType === "folder") || left.name.localeCompare(right.name))
      .map((node) => ({
        name: node.name,
        relativePath: node.relativePath,
        itemType: node.itemType,
        children: convert(node.childrenMap),
      }));

  return convert(root);
}

async function saveRecent(targetPath, itemType, action) {
  try {
    await fetch(`${API_BASE_URL}/api/cfm/recent`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ targetPath, itemType, action }),
    });
  } catch (_error) {
    // Recent activity is non-blocking for the UI.
  }
}

async function loadCompanyProfile() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    redirectToLogin();
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/company/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.message || "Session expired.");
    }

    companyName.textContent = payload.companyName || "-";
    companyEmail.textContent = payload.companyEmail || "-";
    companyPhone.textContent = payload.companyPhone || "-";
    companyWebsite.textContent = payload.companyWebsite || "-";
    companyStatus.textContent = payload.status || "-";
  } catch (_error) {
    localStorage.removeItem(TOKEN_KEY);
    redirectToLogin();
  }
}

async function openServerTarget(targetPath = "") {
  try {
    const response = await fetch(`${API_BASE_URL}/api/cfm/open?target=${encodeURIComponent(targetPath)}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
      },
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.message || "Failed to open file or folder.");
    }

    currentSelectionPath = payload.targetPath;
    currentSelectionType = payload.itemType;

    if (payload.itemType === "folder") {
      expandedFolders.add(payload.targetPath || "");
      setSelectedState(
        payload.targetPath || "Project Root",
        `${payload.items.length} items in folder`,
        `Opened folder: ${payload.targetPath || "Project Root"}`
      );
      setBreadcrumb(payload.targetPath || "CFM");
      renderTree(payload.tree || payload.items || [], { emptyMessage: "No folder opened yet" });
    } else {
      setSelectedState(
        payload.fileName || payload.targetPath,
        payload.previewAvailable
          ? `${payload.extension || "text"} preview available`
          : `Preview not available for ${payload.extension || "this file type"}`,
        payload.content || ""
      );
      setBreadcrumb(payload.targetPath.split("/").slice(0, -1).join("/") || "CFM");
    }
  } catch (error) {
    setSelectedState("Unable to open item", error.message || "Open failed.");
    setTreeEmpty("Try selecting a different file or folder.");
  }
}

async function loadRecentFiles() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/cfm/recent`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
      },
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.message || "Failed to load recent files.");
    }

    const recentItems = payload.recentFiles || [];
    if (!recentItems.length) {
      setTreeEmpty("No recent file activity yet");
      return;
    }

    renderTree(
      recentItems.map((item) => ({
        name: item.targetPath.split("/").pop() || item.targetPath,
        relativePath: item.targetPath,
        itemType: item.itemType || "file",
        action: item.action || "open",
        children: [],
      })),
      { mode: "recent", emptyMessage: "No recent file activity yet" }
    );
    selectedName.textContent = "Recent Files";
    selectedMeta.textContent = "Latest company CFM activity";
    previewPanel.textContent = "Pick a recent file or folder from the list to reopen it.";
    setBreadcrumb("Recent Files");
  } catch (error) {
    setTreeEmpty(error.message || "Unable to load recent files.");
  }
}

async function searchFiles() {
  const query = searchInput.value.trim();
  if (!query) {
    selectedName.textContent = "Search File";
    selectedMeta.textContent = "Enter a file or folder name to search.";
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/cfm/search?q=${encodeURIComponent(query)}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
      },
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.message || "Search failed.");
    }

    const results = payload.results || [];
    selectedName.textContent = "Search File";
    selectedMeta.textContent = `${results.length} result(s) found for "${query}"`;
    previewPanel.textContent = "Choose a result from the list to open it.";
    setBreadcrumb(`Search / ${query}`);
    renderTree(makeSearchTree(results), { emptyMessage: "No matching files found." });
  } catch (error) {
    selectedName.textContent = "Search File";
    selectedMeta.textContent = error.message || "Search failed.";
    setTreeEmpty("No search results available.");
  }
}

async function deleteCurrentSelection() {
  if (!currentSelectionPath) {
    selectedName.textContent = "Delete File / Folder";
    selectedMeta.textContent = "Open a file or folder first, then delete it.";
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/cfm/delete`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ targetPath: currentSelectionPath }),
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.message || "Delete failed.");
    }

    await saveRecent(currentSelectionPath, currentSelectionType || "file", "delete");
    currentSelectionPath = "";
    currentSelectionType = "";
    setSelectedState("Delete File / Folder", payload.message, "");
    setTreeEmpty("Item deleted successfully. Open another file or folder to continue.");
    setBreadcrumb("");
  } catch (error) {
    selectedName.textContent = "Delete File / Folder";
    selectedMeta.textContent = error.message || "Delete failed.";
  }
}

function previewLocalFile(file) {
  currentSelectionPath = file.name;
  currentSelectionType = "file";

  const reader = new FileReader();
  reader.onload = () => {
    setSelectedState(file.name, `Local file preview (${file.type || "text"})`, String(reader.result || ""));
    setBreadcrumb(file.name);
    setTreeEmpty("Local file selected. Use the explorer to browse backend project files too.");
  };
  reader.readAsText(file);
}

function previewLocalFolder(files) {
  const items = [...files].map((file) => ({
    name: file.name,
    relativePath: file.webkitRelativePath || file.name,
    itemType: "file",
  }));

  currentSelectionPath = items[0]?.relativePath?.split("/")[0] || "Local Folder";
  currentSelectionType = "folder";
  setSelectedState(currentSelectionPath, `${items.length} local file(s) in folder`, `Opened local folder: ${currentSelectionPath}`);
  setBreadcrumb(currentSelectionPath);
  renderTree(listToTree(items), { emptyMessage: "No folder opened yet" });
}

logoutButton.addEventListener("click", () => {
  localStorage.removeItem(TOKEN_KEY);
  redirectToLogin();
});

openSidebarButton.addEventListener("click", () => setSidebarCollapsed(false));
closeSidebarButton.addEventListener("click", () => setSidebarCollapsed(true));
sidebarBackdrop.addEventListener("click", () => setSidebarOpen(false));

navButtons.forEach((button) => {
  button.addEventListener("click", async () => {
    navButtons.forEach((navButton) => navButton.classList.remove("active"));
    button.classList.add("active");
    const action = button.dataset.action;

    if (action === "open") {
      await openServerTarget("");
    }

    if (action === "delete") {
      await deleteCurrentSelection();
    }

    if (action === "search") {
      searchInput.focus();
    }

    if (action === "recent") {
      await loadRecentFiles();
    }

    if (action === "settings") {
      selectedName.textContent = "Settings";
      selectedMeta.textContent = "CFM settings panel";
      previewPanel.textContent = "Settings can be extended here for theme, view mode, or file preferences.";
      setTreeEmpty("No extra settings have been configured yet.");
      setBreadcrumb("Settings");
    }
  });
});

openWorkspaceButton.addEventListener("click", () => openServerTarget(""));
browseFileButton.addEventListener("click", () => localFileInput.click());
browseFolderButton.addEventListener("click", () => localFolderInput.click());
searchButton.addEventListener("click", searchFiles);
searchInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    searchFiles();
  }
});

localFileInput.addEventListener("change", () => {
  const file = localFileInput.files?.[0];
  if (file) {
    previewLocalFile(file);
  }
});

localFolderInput.addEventListener("change", () => {
  if (localFolderInput.files?.length) {
    previewLocalFolder(localFolderInput.files);
  }
});

loadCompanyProfile();
openServerTarget("");
