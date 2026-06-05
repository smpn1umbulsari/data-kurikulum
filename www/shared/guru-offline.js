(function initGuruOffline(global) {
  if (global.GuruOffline) return;

  const STORAGE_PREFIX = "guruSpenturiOffline";

  function safeJsonParse(value, fallback) {
    try {
      const parsed = JSON.parse(value || "");
      return parsed === undefined ? fallback : parsed;
    } catch {
      return fallback;
    }
  }

  function getCurrentUser() {
    if (global.DashboardShell?.getCurrentAppUser) return global.DashboardShell.getCurrentAppUser() || {};
    return safeJsonParse(global.localStorage.getItem("appUser"), {}) || {};
  }

  function getUserKey(user = getCurrentUser()) {
    return String(user.kode_guru || user.username || user.id || "unknown")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-") || "unknown";
  }

  function buildKey(scope, assignmentKey = "", user = getCurrentUser()) {
    return [
      STORAGE_PREFIX,
      scope,
      getUserKey(user),
      String(assignmentKey || "global").trim()
    ].join(":");
  }

  function isOnline() {
    return global.navigator?.onLine !== false;
  }

  function loadNilaiDraft(assignmentKey, user = getCurrentUser()) {
    return safeJsonParse(global.localStorage.getItem(buildKey("nilai", assignmentKey, user)), null);
  }

  function saveNilaiDraft(assignmentKey, draft, user = getCurrentUser()) {
    const payload = {
      version: 1,
      appName: "Guru Spenturi",
      savedAt: new Date().toISOString(),
      userKey: getUserKey(user),
      assignmentKey,
      ...draft
    };
    global.localStorage.setItem(buildKey("nilai", assignmentKey, user), JSON.stringify(payload));
    renderStatus();
    return payload;
  }

  function clearNilaiDraft(assignmentKey, user = getCurrentUser()) {
    global.localStorage.removeItem(buildKey("nilai", assignmentKey, user));
    renderStatus();
  }

  function listNilaiDrafts(user = getCurrentUser()) {
    const prefix = buildKey("nilai", "", user).replace(/:global$/, ":");
    const drafts = [];
    for (let index = 0; index < global.localStorage.length; index += 1) {
      const key = global.localStorage.key(index) || "";
      if (!key.startsWith(prefix)) continue;
      const draft = safeJsonParse(global.localStorage.getItem(key), null);
      if (!draft?.assignmentKey || !Array.isArray(draft?.rows) || !draft.rows.length) continue;
      drafts.push({
        key,
        assignmentKey: draft.assignmentKey,
        savedAt: draft.savedAt || "",
        rows: draft.rows.length,
        draft
      });
    }
    return drafts.sort((a, b) => String(b.savedAt || "").localeCompare(String(a.savedAt || "")));
  }

  function countNilaiDrafts(user = getCurrentUser()) {
    return listNilaiDrafts(user).length;
  }

  function renderStatus() {
    const pill = global.document?.getElementById("guruOfflineStatusPill");
    if (!pill) return;
    const online = isOnline();
    const pendingCount = countNilaiDrafts();
    pill.classList.toggle("is-offline", !online);
    pill.classList.toggle("has-draft", pendingCount > 0);
    pill.textContent = `${online ? "Online" : "Offline"}${pendingCount ? ` | ${pendingCount} draft` : ""}`;
    pill.title = pendingCount
      ? `${pendingCount} draft nilai tersimpan di perangkat ini.`
      : "Belum ada draft nilai offline di perangkat ini.";
  }

  function init() {
    global.addEventListener?.("online", renderStatus);
    global.addEventListener?.("offline", renderStatus);
    if (global.document?.readyState === "loading") {
      global.document.addEventListener("DOMContentLoaded", renderStatus, { once: true });
    } else {
      renderStatus();
    }
  }

  global.GuruOffline = {
    appName: "Guru Spenturi",
    isOnline,
    loadNilaiDraft,
    saveNilaiDraft,
    clearNilaiDraft,
    listNilaiDrafts,
    countNilaiDrafts,
    renderStatus,
    init
  };

  init();
})(window);
