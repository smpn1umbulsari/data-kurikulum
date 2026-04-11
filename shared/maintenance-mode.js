(function initMaintenanceMode(global) {
  if (global.MaintenanceMode) return;

  const CACHE_KEY = "appMaintenanceState";
  const DOC_PATH = { collection: "settings", doc: "maintenance" };

  function getDefaultState() {
    return {
      enabled: false,
      title: "Sistem Sedang Dalam Pemeliharaan",
      message: "Kami sedang melakukan pembaruan agar layanan kembali lebih stabil, cepat, dan nyaman digunakan. Silakan coba beberapa saat lagi.",
      updated_at: null
    };
  }

  function normalizeState(data = {}) {
    const fallback = getDefaultState();
    return {
      enabled: data.enabled === true,
      title: String(data.title || fallback.title).trim() || fallback.title,
      message: String(data.message || fallback.message).trim() || fallback.message,
      updated_at: data.updated_at || null
    };
  }

  function readCache() {
    try {
      return normalizeState(JSON.parse(global.localStorage.getItem(CACHE_KEY) || "{}"));
    } catch {
      return getDefaultState();
    }
  }

  function writeCache(state) {
    const normalized = normalizeState(state);
    try {
      global.localStorage.setItem(CACHE_KEY, JSON.stringify(normalized));
    } catch {}
    return normalized;
  }

  async function load(options = {}) {
    if (!options.force) {
      const cached = readCache();
      if (cached.updated_at || cached.enabled) return cached;
    }

    if (!global.db?.collection) {
      return readCache();
    }

    try {
      const snapshot = await global.db.collection(DOC_PATH.collection).doc(DOC_PATH.doc).get();
      const state = normalizeState(snapshot.exists ? snapshot.data() : {});
      return writeCache(state);
    } catch (error) {
      console.error("Gagal memuat maintenance mode", error);
      return readCache();
    }
  }

  async function save(state) {
    const normalized = normalizeState({
      ...state,
      updated_at: new Date().toISOString()
    });

    if (!global.db?.collection) {
      return writeCache(normalized);
    }

    await global.db.collection(DOC_PATH.collection).doc(DOC_PATH.doc).set(normalized, { merge: true });
    return writeCache(normalized);
  }

  function isAdminRole(role = "") {
    return String(role || "").trim().toLowerCase() === "admin";
  }

  function goToMaintenance() {
    if (!String(global.location.pathname || "").toLowerCase().endsWith("/maintenance.html") &&
        !String(global.location.pathname || "").toLowerCase().endsWith("\\maintenance.html") &&
        !String(global.location.pathname || "").toLowerCase().endsWith("maintenance.html")) {
      global.location.replace("maintenance.html");
    }
  }

  global.MaintenanceMode = {
    getDefaultState,
    normalizeState,
    peekCached: readCache,
    load,
    save,
    isAdminRole,
    goToMaintenance
  };
})(window);
