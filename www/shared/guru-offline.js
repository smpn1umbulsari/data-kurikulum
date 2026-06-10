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

  function getActiveTermId() {
    if (typeof global.getActiveTermId === "function") return global.getActiveTermId();
    try {
      return JSON.parse(global.localStorage.getItem("appSemester") || "{}")?.id || "legacy";
    } catch {
      return "legacy";
    }
  }

  function getOfflineCollectionPaths() {
    const termId = getActiveTermId();
    const semesterPrefix = termId && termId !== "legacy" ? `semester_data/${termId}/` : "";
    return [
      `${semesterPrefix}siswa`,
      `${semesterPrefix}kelas`,
      "guru",
      "mapel",
      "mapel_bayangan",
      "mengajar",
      "mengajar_bayangan",
      "tugas_tambahan",
      "guru_tugas_tambahan",
      "nilai",
      "settings",
      "informasi_urusan"
    ];
  }

  async function prepareData(options = {}) {
    if (!isOnline()) throw new Error("Perangkat sedang offline");
    const documentsApi = global.SupabaseDocuments;
    if (!documentsApi?.refreshCollection) throw new Error("Cache offline belum siap");

    const collections = options.collections || getOfflineCollectionPaths();
    const result = [];
    for (const collectionPath of collections) {
      const rows = await documentsApi.refreshCollection(collectionPath);
      result.push({ collectionPath, rows: rows.length });
    }
    renderStatus();
    return result;
  }

  async function prepareGuruOfflineData() {
    try {
      if (global.Swal?.fire) {
        global.Swal.fire({
          title: "Menyiapkan data offline...",
          html: "Mengambil data siswa, kelas, pembagian mengajar, dan nilai terbaru.",
          allowOutsideClick: false,
          didOpen: () => global.Swal.showLoading(),
        });
      }
      const result = await prepareData();
      const nilaiRows = result.find((item) => item.collectionPath === "nilai")?.rows || 0;
      if (global.Swal?.fire) {
        global.Swal.fire(
          "Data offline siap",
          `${nilaiRows} baris nilai sudah diperbarui di cache offline perangkat ini.`,
          "success",
        );
      }
      return result;
    } catch (error) {
      console.error("prepareGuruOfflineData failed", error);
      if (global.Swal?.fire) {
        global.Swal.fire(
          "Gagal menyiapkan offline",
          error?.message || "Data offline belum berhasil diperbarui.",
          "error",
        );
      }
      throw error;
    }
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
    prepareData,
    renderStatus,
    init
  };

  global.prepareGuruOfflineData = prepareGuruOfflineData;

  init();
})(window);
