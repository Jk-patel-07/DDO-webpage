/* Part 1: helpers, icons, state, sidebar decoration, empty state */
(function (ns) {
  "use strict";
  ns.POPUP = document.getElementById("featureConvertPopup");
  if (!ns.POPUP) return;

  // Build HTML-escape replacement strings at runtime to avoid tooling
  // confusion with HTML entity references inside source files.
  var AMP = String.fromCharCode(38);
  var ESC_MAP = {};
  ESC_MAP[AMP] = AMP + "amp;";
  ESC_MAP["<"] = AMP + "lt;";
  ESC_MAP[">"] = AMP + "gt;";
  ESC_MAP['"'] = AMP + "quot;";
  ESC_MAP["'"] = AMP + "#39;";
  function esc(s) {
    if (s === null || s === undefined) s = "";
    s = String(s);
    return s.replace(/[&<>"']/g, function (ch) { return ESC_MAP[ch]; });
  }
  function relTime(ts) {
    if (!ts) return "";
    var d = Date.now() - Number(ts);
    if (isNaN(d) || d < 0) return "";
    var minute = 60000, hour = 3600000, day = 86400000;
    if (d < minute) return "just now";
    if (d < hour) { var m = Math.floor(d / minute); return m + " minute" + (m === 1 ? "" : "s") + " ago"; }
    if (d < day) { var h = Math.floor(d / hour); return h + " hour" + (h === 1 ? "" : "s") + " ago"; }
    var dd = Math.floor(d / day);
    if (dd < 7) return dd + " day" + (dd === 1 ? "" : "s") + " ago";
    try { return new Date(Number(ts)).toLocaleString(); } catch (e) { return ""; }
  }
  ns.esc = esc; ns.relTime = relTime;

  ns.icons = {
    folder: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"></path><path d="M2 10h20"></path></svg>',
    file: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3v4a2 2 0 0 0 2 2h4"></path><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2Z"></path><path d="M9 13h6"></path><path d="M9 17h4"></path></svg>',
    convert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-3.6-7.18"></path><path d="M21 4v5h-5"></path><path d="M3 12a9 9 0 0 0 9 9"></path></svg>',
    history: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7"></path><path d="M3 4v5h5"></path><path d="M12 8v5l3 2"></path></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"></path></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"></path><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><path d="M6 6v14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V6"></path></svg>',
    open: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 14 4 9l5-5"></path><path d="M20 20a8 8 0 0 0-8-8H4"></path></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="6"></circle><path d="m20 20-3.5-3.5"></path></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 5 5L20 7"></path></svg>',
    mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><path d="M12 19v3"></path></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>'
  };

  ns.state = {
    history: [],
    recentProjects: [],
    activeTool: "convert"
  };
  try { var r1 = localStorage.getItem("cfm.convert.history.v1"); if (r1) { var p1 = JSON.parse(r1); if (p1 && Array.isArray(p1.items)) ns.state.history = p1.items; } } catch (e) {}
  try { var r2 = localStorage.getItem("cfm.convert.recentProjects.v1"); if (r2) { var p2 = JSON.parse(r2); if (p2 && Array.isArray(p2.items)) ns.state.recentProjects = p2.items; } } catch (e) {}
  ns.saveHistory = function () { try { localStorage.setItem("cfm.convert.history.v1", JSON.stringify({ items: ns.state.history.slice(0, 50) })); } catch (e) {} };
  ns.saveProjects = function () { try { localStorage.setItem("cfm.convert.recentProjects.v1", JSON.stringify({ items: ns.state.recentProjects.slice(0, 10) })); } catch (e) {} };
  ns.rememberProject = function (label) {
    if (!label) return;
    ns.state.recentProjects = [label].concat(ns.state.recentProjects.filter(function (p) { return p !== label; })).slice(0, 10);
    ns.saveProjects();
  };
  ns.pushHistory = function (entry) {
    if (!entry || !entry.title) return;
    entry.id = entry.id || ("h" + Date.now() + "-" + Math.random().toString(36).slice(2, 6));
    entry.timestamp = entry.timestamp || Date.now();
    ns.state.history = [entry].concat(ns.state.history.filter(function (h) { return h.id !== entry.id; })).slice(0, 50);
    ns.saveHistory();
  };
  ns.openHistoryItem = function (id) {
    var h = ns.state.history.find(function (x) { return x.id === id; });
    if (!h) return;
    var s = document.getElementById("featureSearchInput");
    if (s && h.title) {
      s.value = h.title;
      s.dispatchEvent(new Event("input", { bubbles: true }));
      s.focus();
    }
    if (h.project) {
      var t = document.querySelector(".cfm-convert-project-name");
      if (t) t.textContent = h.project;
    }
  };
  ns.deleteHistoryItem = function (id) {
    ns.state.history = ns.state.history.filter(function (h) { return h.id !== id; });
    ns.saveHistory();
  };
  ns.clearHistory = function () {
    ns.state.history = [];
    ns.saveHistory();
  };
})(window.CFMUI = window.CFMUI || {});

/* decorate sidebar */
(function (ns) {
  "use strict";
  if (!ns.POPUP) return;
  function decorate() {
    var map = [
      { id: "featureSidebarAddFolderButton", icon: ns.icons.folder,  label: "Add Folder", tool: "folder",  tip: "Add a folder to the search target" },
      { id: "featureSidebarAddFileButton",   icon: ns.icons.file,    label: "Add File",   tool: "file",    tip: "Add a file to the search target" },
      { id: "featureSidebarConvertButton",   icon: ns.icons.convert, label: "Convert",   tool: "convert", tip: "Convert / Extract - run the AI search" }
    ];
    map.forEach(function (m) {
      var btn = document.getElementById(m.id);
      if (!btn) return;
      var iconHolder = btn.querySelector(".cfm-convert-sidebar-icon");
      if (iconHolder && !iconHolder.querySelector("svg")) iconHolder.innerHTML = m.icon;
      var spans = btn.querySelectorAll("span");
      for (var i = 0; i < spans.length; i++) {
        var s = spans[i];
        if (!s.classList.contains("cfm-convert-sidebar-icon") && !s.textContent.trim()) s.textContent = m.label;
      }
      if (!btn.getAttribute("data-tooltip")) {
        btn.setAttribute("data-tooltip", m.tip);
        btn.setAttribute("aria-label", m.tip);
      }
      btn.setAttribute("data-tool", m.tool);
    });
  }
  ns.decorateSidebarActions = decorate;
  decorate();
})(window.CFMUI);

/* empty state */
(function (ns) {
  "use strict";
  if (!ns.POPUP) return;
  function ensure() {
    var chatArea = document.getElementById("featureChatArea");
    if (!chatArea) return;
    var emptyState = chatArea.querySelector(".cfm-convert-empty-state");
    if (!emptyState) return;
    var heading = emptyState.querySelector(".cfm-convert-empty-heading");
    if (heading) heading.textContent = "What would you like to extract?";
    var sub = emptyState.querySelector(".cfm-convert-empty-sub");
    if (sub) sub.textContent = "Pick a quick action below or type what you need.";

    if (!emptyState.querySelector(".cfm-convert-empty-card")) {
      var card = document.createElement("div");
      card.className = "cfm-convert-empty-card";
      card.setAttribute("role", "status");
      card.innerHTML = '<strong class="cfm-convert-empty-card-title">No file or folder selected</strong>' +
        '<p class="cfm-convert-empty-card-copy">Select a file or folder to start extracting. ' +
        'Use the buttons on the left or the <kbd>+</kbd> button in the input bar below.</p>';
      emptyState.appendChild(card);
    }

    if (!emptyState.querySelector(".cfm-convert-quick-actions")) {
      var wrap = document.createElement("div");
      wrap.className = "cfm-convert-quick-actions";
      var cards = [
        { id: "qa-component", icon: ns.icons.file,   title: "Extract a component",    copy: "Pull a single component file into a new folder.",  prompt: "Extract this component into a folder" },
        { id: "qa-selected",  icon: ns.icons.check,  title: "Extract selected files", copy: "Bundle the files you have chosen into one folder.", prompt: "Extract the selected files into a folder" },
        { id: "qa-folder",    icon: ns.icons.folder, title: "Extract a folder",       copy: "Move or copy an entire folder with sub-folders.", prompt: "Extract this folder as a feature" },
        { id: "qa-search",    icon: ns.icons.search, title: "Search feature code",    copy: "Ask in plain English for the feature you need.", prompt: "" }
      ];
      var html = "";
      for (var i = 0; i < cards.length; i++) {
        var c = cards[i];
        html += '<button class="cfm-convert-quick-card" type="button" data-quick-action="' + c.id + '" data-quick-prompt="' + ns.esc(c.prompt) + '">' +
          '<span class="cfm-convert-quick-icon" aria-hidden="true">' + c.icon + '</span>' +
          '<span class="cfm-convert-quick-body">' +
          '<strong class="cfm-convert-quick-title">' + ns.esc(c.title) + '</strong>' +
          '<span class="cfm-convert-quick-copy">' + ns.esc(c.copy) + '</span>' +
          '</span></button>';
      }
      wrap.innerHTML = html;
      emptyState.appendChild(wrap);
      wrap.addEventListener("click", function (ev) {
        var cardEl = ev.target.closest("[data-quick-action]");
        if (!cardEl) return;
        var prompt = cardEl.getAttribute("data-quick-prompt") || "";
        var s = document.getElementById("featureSearchInput");
        if (s) {
          s.value = prompt;
          s.dispatchEvent(new Event("input", { bubbles: true }));
          s.focus();
        }
      });
    }
  }
  ns.ensureEmptyStateEnhancements = ensure;
  ensure();
})(window.CFMUI);
/* Part 2: project selector, history drawer, selected files, send button */
(function (ns) {
  "use strict";
  if (!ns.POPUP) return;

  // ---- 3. Project selector dropdown
  function getCurrentProjectLabel() {
    var el = document.getElementById("featureSelectedTargetText");
    if (el && el.textContent.trim()) return el.textContent.trim();
    return "Current project";
  }
  function ensureProjectSelector() {
    var head = ns.POPUP.querySelector(".cfm-convert-head");
    if (!head) return;
    if (head.querySelector(".cfm-convert-project-selector")) return;
    var titleGroup = head.querySelector(".cfm-convert-title-group");
    if (!titleGroup) return;

    var sel = document.createElement("div");
    sel.className = "cfm-convert-project-selector";
    sel.innerHTML =
      '<button class="cfm-convert-project-button" type="button" data-project-toggle aria-haspopup="listbox" aria-expanded="false">' +
      '<span class="cfm-convert-project-label">Current project</span>' +
      '<span class="cfm-convert-project-name" data-project-name>Extract Feature Folder</span>' +
      '<span class="cfm-convert-project-caret" aria-hidden="true">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"></path></svg>' +
      '</span></button>' +
      '<div class="cfm-convert-project-menu hidden" data-project-menu role="listbox">' +
      '<div class="cfm-convert-project-menu-section" data-project-recent></div>' +
      '<div class="cfm-convert-project-menu-foot">' +
      '<button class="cfm-convert-project-open" type="button" data-project-open>' +
      ns.icons.open + '<span>Open folder</span></button>' +
      '</div></div>';

    titleGroup.parentNode.insertBefore(sel, titleGroup.nextSibling);
    titleGroup.style.display = "none";

    var histBtn = document.getElementById("featureRecentLocationsButton");
    if (histBtn) histBtn.style.display = "none";

    var nameHolder = sel.querySelector("[data-project-name]");
    nameHolder.textContent = getCurrentProjectLabel();
    var toggle = sel.querySelector("[data-project-toggle]");
    var menu = sel.querySelector("[data-project-menu]");

    function renderMenu() {
      var recentEl = sel.querySelector("[data-project-recent]");
      var items = ns.state.recentProjects.slice(0, 8);
      var h = '<div class="cfm-convert-project-menu-title">Recent projects</div>';
      if (items.length === 0) {
        h += '<div class="cfm-convert-project-menu-empty">No recent projects yet. Open a folder to get started.</div>';
      } else {
        for (var j = 0; j < items.length; j++) {
          var p = items[j];
          h += '<button class="cfm-convert-project-item" type="button" data-project-pick="' + ns.esc(p) + '" role="option">' +
            '<span class="cfm-convert-project-item-name">' + ns.esc(p) + '</span>' +
            '<span class="cfm-convert-project-item-meta">Recent</span></button>';
        }
      }
      recentEl.innerHTML = h;
    }
    function close() { menu.classList.add("hidden"); toggle.setAttribute("aria-expanded", "false"); }
    function openM() { renderMenu(); menu.classList.remove("hidden"); toggle.setAttribute("aria-expanded", "true"); }
    toggle.addEventListener("click", function (ev) { ev.stopPropagation(); if (menu.classList.contains("hidden")) openM(); else close(); });
    menu.addEventListener("click", function (ev) {
      var pick = ev.target.closest("[data-project-pick]");
      if (pick) {
        var label = pick.getAttribute("data-project-pick");
        nameHolder.textContent = label;
        ns.rememberProject(label);
        close();
        return;
      }
      if (ev.target.closest("[data-project-open]")) {
        var fld = document.getElementById("featureSidebarFolderPicker");
        if (fld) fld.click();
        close();
      }
    });
    document.addEventListener("click", function (ev) { if (!sel.contains(ev.target)) close(); });
  }
  ns.ensureProjectSelector = ensureProjectSelector;
  ensureProjectSelector();

  // ---- 4. History drawer
  function ensureHistoryDrawer() {
    if (ns.POPUP.querySelector(".cfm-convert-history-drawer")) return;
    var head = ns.POPUP.querySelector(".cfm-convert-head");
    if (!head) return;

    var btn = document.createElement("button");
    btn.className = "cfm-convert-history-button";
    btn.type = "button";
    btn.setAttribute("data-history-toggle", "");
    btn.setAttribute("aria-label", "Open history");
    btn.title = "History";
    btn.innerHTML = ns.icons.history;

    var histBtn = document.getElementById("featureRecentLocationsButton");
    if (histBtn) histBtn.style.display = "none";

    head.appendChild(btn);

    var drawer = document.createElement("aside");
    drawer.className = "cfm-convert-history-drawer hidden";
    drawer.setAttribute("aria-label", "History");
    drawer.innerHTML =
      '<div class="cfm-convert-history-drawer-head">' +
      '<div class="cfm-convert-history-drawer-title">' +
      '<span class="cfm-convert-history-drawer-icon" aria-hidden="true">' + ns.icons.history + '</span>' +
      '<h4>History</h4>' +
      '</div>' +
      '<button class="cfm-convert-history-drawer-close" type="button" data-history-close aria-label="Close history">' +
      ns.icons.close +
      '</button>' +
      '</div>' +
      '<p class="cfm-convert-history-drawer-sub">Your recent searches and extracts are saved on this device.</p>' +
      '<div class="cfm-convert-history-drawer-actions">' +
      '<button class="cfm-convert-history-drawer-clear" type="button" data-history-clear>' +
      ns.icons.trash + '<span>Clear all</span></button>' +
      '</div>' +
      '<div class="cfm-convert-history-drawer-list" data-history-list></div>';
    ns.POPUP.appendChild(drawer);

    function render() {
      var list = drawer.querySelector("[data-history-list]");
      if (!ns.state.history.length) {
        list.innerHTML = '<div class="cfm-convert-history-drawer-empty">' +
          '<strong>No history yet</strong>' +
          '<p>Your searches and extracts will appear here.</p></div>';
        return;
      }
      var h = "";
      for (var i = 0; i < ns.state.history.length; i++) {
        var item = ns.state.history[i];
        var fileName = (item.target && item.target.fileName) || item.targetName || item.target || "Untitled";
        var project = item.project || "Current project";
        h += '<article class="cfm-convert-history-card" data-history-id="' + ns.esc(item.id) + '">' +
          '<div class="cfm-convert-history-card-head">' +
          '<span class="cfm-convert-history-card-icon" aria-hidden="true">' + ns.icons.search + '</span>' +
          '<strong class="cfm-convert-history-card-title">' + ns.esc(item.title) + '</strong>' +
          '</div>' +
          '<div class="cfm-convert-history-card-meta">' +
          '<span class="cfm-convert-history-card-target">' + ns.esc(fileName) + '</span>' +
          '<span class="cfm-convert-history-card-time">' + ns.relTime(item.timestamp) + '</span>' +
          '</div>' +
          '<div class="cfm-convert-history-card-project">' + ns.esc(project) + '</div>' +
          '<div class="cfm-convert-history-card-actions">' +
          '<button class="cfm-convert-history-card-reopen" type="button" data-history-reopen="' + ns.esc(item.id) + '">' + ns.icons.open + '<span>Reopen</span></button>' +
          '<button class="cfm-convert-history-card-delete" type="button" data-history-delete="' + ns.esc(item.id) + '" aria-label="Delete entry">' + ns.icons.trash + '</button>' +
          '</div>' +
          '</article>';
      }
      list.innerHTML = h;
    }
    render();

    function open() { drawer.classList.remove("hidden"); render(); }
    function close() { drawer.classList.add("hidden"); }
    btn.addEventListener("click", function (ev) { ev.stopPropagation(); if (drawer.classList.contains("hidden")) open(); else close(); });
    drawer.querySelector("[data-history-close]").addEventListener("click", close);
    drawer.querySelector("[data-history-clear]").addEventListener("click", function () {
      ns.clearHistory();
      render();
    });
    drawer.addEventListener("click", function (ev) {
      var reopen = ev.target.closest("[data-history-reopen]");
      if (reopen) {
        ns.openHistoryItem(reopen.getAttribute("data-history-reopen"));
        close();
        return;
      }
      var del = ev.target.closest("[data-history-delete]");
      if (del) {
        ns.deleteHistoryItem(del.getAttribute("data-history-delete"));
        render();
      }
    });
    ns.renderHistory = render;
  }
  ns.ensureHistoryDrawer = ensureHistoryDrawer;
  ensureHistoryDrawer();

  // ---- 5. Selected files chips
  function ensureSelectedChipsArea() {
    var composer = ns.POPUP.querySelector(".cfm-convert-composer-section");
    if (!composer) return;
    if (composer.querySelector(".cfm-convert-selected-chips")) return;
    var wrap = document.createElement("div");
    wrap.className = "cfm-convert-selected-chips hidden";
    wrap.setAttribute("aria-label", "Selected files and folders");
    wrap.innerHTML =
      '<div class="cfm-convert-selected-chips-head">' +
      '<span class="cfm-convert-selected-chips-title">Selected</span>' +
      '<span class="cfm-convert-selected-chips-count" data-selected-count>0 files - 0 folders</span>' +
      '<button class="cfm-convert-selected-clear" type="button" data-selected-clear>Clear all</button>' +
      '</div>' +
      '<div class="cfm-convert-selected-chips-list" data-selected-list></div>';
    var suggestions = composer.querySelector(".cfm-convert-suggestions");
    if (suggestions && suggestions.parentNode === composer) {
      composer.insertBefore(wrap, suggestions);
    } else {
      composer.insertBefore(wrap, composer.firstChild);
    }
    wrap.querySelector("[data-selected-clear]").addEventListener("click", function () {
      // Soft signal: the existing app exposes removal through its own UI.
      // Clicking the original "Clear all" if present is more reliable than
      // mutating state directly from here. We try the closest clear button.
      var sidebarSummary = document.getElementById("featureSidebarTargetSummary");
      if (sidebarSummary) sidebarSummary.click();
    });
  }
  function renderSelectedChips(targets) {
    var wrap = ns.POPUP.querySelector(".cfm-convert-selected-chips");
    if (!wrap) return;
    var list = wrap.querySelector("[data-selected-list]");
    var count = wrap.querySelector("[data-selected-count]");
    if (!targets || !targets.length) {
      wrap.classList.add("hidden");
      list.innerHTML = "";
      return;
    }
    wrap.classList.remove("hidden");
    var files = 0, folders = 0;
    var h = "";
    for (var i = 0; i < targets.length; i++) {
      var t = targets[i];
      var name = (t && (t.fileName || t.folderName || t.targetPath || t.label)) || ("Target " + (i + 1));
      var isFolder = (t && t.scopeType === "folder") || (typeof name === "string" && !/\.[a-z0-9]{1,5}$/i.test(name));
      if (isFolder) folders++; else files++;
      var icon = isFolder ? ns.icons.folder : ns.icons.file;
      h += '<span class="cfm-convert-selected-chip" data-target-index="' + i + '">' +
        '<span class="cfm-convert-selected-chip-icon" aria-hidden="true">' + icon + '</span>' +
        '<span class="cfm-convert-selected-chip-name" title="' + ns.esc(name) + '">' + ns.esc(name) + '</span>' +
        '<button class="cfm-convert-selected-chip-remove" type="button" aria-label="Remove ' + ns.esc(name) + '">' + ns.icons.close + '</button>' +
        '</span>';
    }
    list.innerHTML = h;
    count.textContent = files + ' file' + (files === 1 ? '' : 's') + ' - ' + folders + ' folder' + (folders === 1 ? '' : 's');
  }
  ns.ensureSelectedChipsArea = ensureSelectedChipsArea;
  ns.renderSelectedChips = renderSelectedChips;
  ensureSelectedChipsArea();

  // ---- 6. Send button enable/disable
  function syncSendState() {
    var send = document.getElementById("runFeaturePreviewButton");
    var input = document.getElementById("featureSearchInput");
    if (!send) return;
    var hasText = input && input.value.trim().length > 0;
    var wrap = ns.POPUP.querySelector(".cfm-convert-selected-chips");
    var hasFiles = wrap && !wrap.classList.contains("hidden") && wrap.querySelectorAll(".cfm-convert-selected-chip").length > 0;
    send.classList.toggle("is-disabled", !(hasText || hasFiles));
    send.setAttribute("aria-disabled", (hasText || hasFiles) ? "false" : "true");
  }
  ns.syncSendState = syncSendState;
  function bindSendState() {
    var input = document.getElementById("featureSearchInput");
    if (input) input.addEventListener("input", syncSendState);
    // We watch the chips area for additions/removals
    var observer = new MutationObserver(syncSendState);
    var wrap = ns.POPUP.querySelector(".cfm-convert-selected-chips");
    if (wrap) {
      observer.observe(wrap, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
    }
    syncSendState();
  }
  bindSendState();

  // ---- 7. Intercept the "Run" button to push history and to be safely disabled
  var runBtn = document.getElementById("runFeaturePreviewButton");
  if (runBtn) {
    runBtn.addEventListener("click", function () {
      if (runBtn.classList.contains("is-disabled")) return;
      var input = document.getElementById("featureSearchInput");
      var title = (input && input.value || "").trim();
      if (!title) return;
      var projectEl = document.querySelector(".cfm-convert-project-name");
      var project = projectEl ? projectEl.textContent : "";
      var wrap = ns.POPUP.querySelector(".cfm-convert-selected-chips");
      var chips = wrap ? wrap.querySelectorAll(".cfm-convert-selected-chip") : [];
      var targetName = chips.length ? (chips.length + " selected") : "Workspace";
      ns.pushHistory({
        title: title,
        project: project,
        target: { fileName: targetName },
        timestamp: Date.now()
      });
      if (project) ns.rememberProject(project);
      if (ns.renderHistory) ns.renderHistory();
    });
  }

  // Re-render chips when the underlying targets change. The original app
  // mutates the sidebar target list each time files are added/removed, so
  // we mirror that into the chips area.
  function mirrorTargets() {
    var list = document.getElementById("featureSidebarTargetList");
    if (!list) return;
    var items = list.querySelectorAll("[data-feature-sidebar-target]");
    var targets = [];
    items.forEach(function (el) {
      var main = el.querySelector(".cfm-convert-sidebar-main");
      var sub = el.querySelector(".cfm-convert-sidebar-sub");
      var name = main ? main.textContent.trim() : "";
      var scope = (el.querySelector(".cfm-convert-sidebar-icon") || {}).textContent || "";
      targets.push({
        fileName: scope === "D" ? name : undefined,
        folderName: scope === "F" ? name : undefined,
        scopeType: scope === "F" ? "folder" : "file",
        targetPath: sub ? sub.textContent.trim() : name
      });
    });
    renderSelectedChips(targets);
    syncSendState();
  }
  ns.mirrorTargets = mirrorTargets;
  var targetList = document.getElementById("featureSidebarTargetList");
  if (targetList) {
    var obs = new MutationObserver(mirrorTargets);
    obs.observe(targetList, { childList: true, subtree: true, characterData: true });
  }
  var summary = document.getElementById("featureSidebarTargetSummary");
  if (summary) {
    new MutationObserver(mirrorTargets).observe(summary, { childList: true, characterData: true, subtree: true });
  }
  mirrorTargets();
})(window.CFMUI || {});
