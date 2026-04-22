(function initGuruOffline(global) {
  if (global.GuruOffline) return;

  const STORAGE_PREFIX = "guruSpenturiOffline";
  const CONNECTIVITY_TIMEOUT_MS = 1200;
  const CONNECTIVITY_CHECK_INTERVAL_MS = 15000;
  let knownOnline = global.navigator?.onLine !== false;
  let connectivityCheckTimer = 0;
  let connectivityCheckInFlight = null;

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

  function getConnectivityProbeUrl() {
    const baseUrl = String(global.supabaseConfig?.url || "").replace(/\/+$/, "");
    return baseUrl ? `${baseUrl}/auth/v1/health` : "";
  }

  function setKnownOnline(value) {
    const nextOnline = Boolean(value);
    const changed = knownOnline !== nextOnline;
    knownOnline = nextOnline;
    if (changed) {
      renderStatus();
      global.dispatchEvent?.(new CustomEvent("guru-spenturi-connectivity-change", {
        detail: { online: knownOnline }
      }));
      if (knownOnline) {
        global.dispatchEvent?.(new CustomEvent("guru-spenturi-online"));
      }
    }
    return knownOnline;
  }

  function isOnline() {
    if (global.navigator?.onLine === false) return false;
    return knownOnline;
  }

  function markOffline() {
    return setKnownOnline(false);
  }

  function markOnline() {
    if (global.navigator?.onLine === false) return setKnownOnline(false);
    return setKnownOnline(true);
  }

  async function checkConnectivity(options = {}) {
    if (global.navigator?.onLine === false) return markOffline();
    if (connectivityCheckInFlight && !options.force) return connectivityCheckInFlight;
    const probeUrl = getConnectivityProbeUrl();
    if (!probeUrl || !global.fetch) return markOnline();

    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timeoutId = controller
      ? global.setTimeout(() => controller.abort(), Number(options.timeoutMs) || CONNECTIVITY_TIMEOUT_MS)
      : 0;
    connectivityCheckInFlight = global.fetch(probeUrl, {
      method: "HEAD",
      cache: "no-store",
      signal: controller?.signal
    })
      .then(response => setKnownOnline(Boolean(response && response.status < 500)))
      .catch(() => markOffline())
      .finally(() => {
        if (timeoutId) global.clearTimeout(timeoutId);
        connectivityCheckInFlight = null;
      });
    return connectivityCheckInFlight;
  }

  function loadNilaiDraft(assignmentKey, user = getCurrentUser()) {
    const key = buildKey("nilai", assignmentKey, user);
    const draft = safeJsonParse(global.localStorage.getItem(key), null);
    if (draft && !hasNilaiDraftRows(draft)) {
      global.localStorage.removeItem(key);
      renderStatus();
      return null;
    }
    return draft;
  }

  function hasNilaiDraftRows(draft) {
    return Array.isArray(draft?.rows) && draft.rows.length > 0;
  }

  function saveNilaiDraft(assignmentKey, draft, user = getCurrentUser()) {
    if (!hasNilaiDraftRows(draft)) {
      clearNilaiDraft(assignmentKey, user);
      return null;
    }
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

  function loadNilaiAssignmentCache(assignmentKey, user = getCurrentUser()) {
    return safeJsonParse(global.localStorage.getItem(buildKey("nilai-cache", assignmentKey, user)), null);
  }

  function saveNilaiAssignmentCache(assignmentKey, cache, user = getCurrentUser()) {
    const payload = {
      version: 1,
      appName: "Guru Spenturi",
      savedAt: new Date().toISOString(),
      userKey: getUserKey(user),
      assignmentKey,
      ...cache
    };
    global.localStorage.setItem(buildKey("nilai-cache", assignmentKey, user), JSON.stringify(payload));
    return payload;
  }

  function countNilaiDrafts(user = getCurrentUser()) {
    return listNilaiDrafts(user).length;
  }

  function listNilaiDrafts(user = getCurrentUser()) {
    const prefix = buildKey("nilai", "", user).replace(/:global$/, ":");
    const drafts = [];
    const emptyDraftKeys = [];
    for (let index = 0; index < global.localStorage.length; index += 1) {
      const key = global.localStorage.key(index) || "";
      if (!key.startsWith(prefix)) continue;
      const draft = safeJsonParse(global.localStorage.getItem(key), null);
      if (!draft?.assignmentKey || !hasNilaiDraftRows(draft)) {
        emptyDraftKeys.push(key);
        continue;
      }
      drafts.push({
        key,
        assignmentKey: draft.assignmentKey,
        savedAt: draft.savedAt || "",
        rows: draft.rows.length,
        draft
      });
    }
    emptyDraftKeys.forEach(key => global.localStorage.removeItem(key));
    return drafts.sort((a, b) => String(a.savedAt).localeCompare(String(b.savedAt)));
  }

  async function prepareReadCache(collections = [], options = {}) {
    const documents = global.SupabaseDocuments;
    if (!documents?.collection) throw new Error("Penyimpanan data belum siap.");
    const uniqueCollections = [...new Set(collections.map(item => String(item || "").trim()).filter(Boolean))];
    let totalRows = 0;
    for (let index = 0; index < uniqueCollections.length; index += 1) {
      const collectionName = uniqueCollections[index];
      options.onProgress?.({
        collectionName,
        index: index + 1,
        total: uniqueCollections.length
      });
      const snapshot = await documents.collection(collectionName).get();
      totalRows += Number(snapshot?.size || snapshot?.docs?.length || 0);
    }
    try {
      global.localStorage.setItem(buildKey("read-cache", "last", getCurrentUser()), JSON.stringify({
        savedAt: new Date().toISOString(),
        collections: uniqueCollections,
        totalRows
      }));
    } catch {
      // status cache bukan data utama
    }
    renderStatus();
    return uniqueCollections.length;
  }

  function renderStatus() {
    const pill = global.document?.getElementById("guruOfflineStatusPill");
    const online = isOnline();
    const pendingCount = countNilaiDrafts();
    const cacheInfo = safeJsonParse(global.localStorage.getItem(buildKey("read-cache", "last", getCurrentUser())), null);
    const cacheTime = cacheInfo?.savedAt
      ? new Date(cacheInfo.savedAt).toLocaleString("id-ID")
      : "";
    const label = pendingCount
      ? online ? `Online | ${pendingCount} draft tertunda` : `Offline | ${pendingCount} draft aman`
      : online ? "Online | tanpa draft" : "Offline | cache lokal";
    const detail = [
      online ? "Koneksi aktif." : "Mode offline aktif, data dibaca dari cache bila tersedia.",
      pendingCount ? `${pendingCount} draft nilai menunggu sinkron otomatis.` : "Tidak ada draft nilai tertunda.",
      cacheTime ? `Cache offline terakhir: ${cacheTime}.` : "Cache offline belum disiapkan."
    ].join(" ");
    if (pill) {
      pill.classList.toggle("is-offline", !online);
      pill.classList.toggle("has-draft", pendingCount > 0);
      pill.textContent = label;
      pill.title = detail;
    }
  }

  function init() {
    global.addEventListener?.("online", () => {
      markOnline();
      checkConnectivity({ force: true });
    });
    global.addEventListener?.("offline", markOffline);
    global.document?.addEventListener?.("visibilitychange", () => {
      if (!global.document.hidden) checkConnectivity({ force: true });
    });
    connectivityCheckTimer = global.setInterval?.(() => checkConnectivity(), CONNECTIVITY_CHECK_INTERVAL_MS) || 0;
    if (global.document?.readyState === "loading") {
      global.document.addEventListener("DOMContentLoaded", () => {
        renderStatus();
        checkConnectivity({ force: true });
      }, { once: true });
    } else {
      renderStatus();
      checkConnectivity({ force: true });
    }
  }

  global.GuruOffline = {
    appName: "Guru Spenturi",
    isOnline,
    markOffline,
    markOnline,
    checkConnectivity,
    loadNilaiDraft,
    saveNilaiDraft,
    clearNilaiDraft,
    listNilaiDrafts,
    loadNilaiAssignmentCache,
    saveNilaiAssignmentCache,
    countNilaiDrafts,
    prepareReadCache,
    renderStatus,
    init
  };

  init();
})(window);
