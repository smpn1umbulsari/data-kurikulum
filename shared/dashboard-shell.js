(function initDashboardShell(global) {
  const shell = global.DashboardShell || {};
  const storage = global.AppUtils || {};
  let presenceHeartbeatTimer = null;
  let presenceVisibilityHandler = null;
  let presenceBeforeUnloadHandler = null;
  let presencePageHideHandler = null;
  let currentPresenceDocId = "";
  const dom = global.AppDom || {};

  function getStorageJson(key, fallback) {
    if (typeof storage.getStorageJson === "function") return storage.getStorageJson(key, fallback);
    try {
      const raw = global.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function setStorageJson(key, value) {
    if (typeof storage.setStorageJson === "function") return storage.setStorageJson(key, value);
    global.localStorage.setItem(key, JSON.stringify(value));
    return value;
  }

  function setDisplay(element, shouldShow) {
    if (!element) return;
    if (typeof dom.toggleDisplay === "function") dom.toggleDisplay(element, shouldShow);
    else element.style.display = shouldShow ? "" : "none";
  }

  function getBodyClassList(doc) {
    return doc?.body?.classList || {
      add() {},
      remove() {},
      toggle() {}
    };
  }

  shell.logout = function logout() {
    shell.stopPresenceTracking().catch(() => {});
    global.localStorage.removeItem("login");
    global.localStorage.removeItem("appUser");
    global.localStorage.removeItem("appSemester");
    global.location.href = "login.html";
  };

  shell.getCurrentAppUser = function getCurrentAppUser() {
    return getStorageJson("appUser", {}) || {};
  };

  shell.getPresenceDocId = function getPresenceDocId(user = shell.getCurrentAppUser()) {
    const source = String(user?.id || user?.username || user?.kode_guru || "").trim();
    return source ? source.replace(/[^a-zA-Z0-9._-]/g, "-") : "";
  };

  shell.isUserOnline = function isUserOnline(user = {}, thresholdMs = 180000) {
    const raw = user?.last_seen_at || user?.updated_at || user?.created_at || "";
    const seenAt = raw ? new Date(raw).getTime() : 0;
    if (!seenAt) return Boolean(user?.online);
    return Date.now() - seenAt <= Number(thresholdMs || 180000);
  };

  shell.getUserPresenceCollection = function getUserPresenceCollection() {
    return global.SupabaseDocuments?.collection ? global.SupabaseDocuments.collection("user_presence") : null;
  };

  shell.getPresenceSnapshot = async function getPresenceSnapshot() {
    const collection = shell.getUserPresenceCollection();
    if (!collection?.orderBy) return [];
    const snap = await collection.orderBy("last_seen_at", "desc").get();
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  };

  shell.getOnlineUsers = async function getOnlineUsers(thresholdMs = 180000) {
    const snapshot = await shell.getPresenceSnapshot();
    return snapshot.filter(user => shell.isUserOnline(user, thresholdMs));
  };

  shell.getOnlineUserCount = async function getOnlineUserCount(thresholdMs = 180000) {
    const users = await shell.getOnlineUsers(thresholdMs);
    return users.length;
  };

  shell.markCurrentUserPresence = async function markCurrentUserPresence(extra = {}) {
    const user = shell.getCurrentAppUser();
    const docId = shell.getPresenceDocId(user);
    if (!docId) return null;
    const collection = shell.getUserPresenceCollection();
    if (!collection) return null;
    const payload = {
      user_id: String(user?.id || user?.username || docId).trim(),
      username: String(user?.username || "").trim(),
      nama: String(user?.nama || "").trim(),
      role: String(user?.role || "").trim(),
      kode_guru: String(user?.kode_guru || "").trim(),
      online: true,
      last_seen_at: new Date().toISOString(),
      session_id: String(user?.session_id || localStorage.getItem("login") || "").trim(),
      page: String(global.location?.hash || global.location?.pathname || "").trim(),
      ...extra
    };
    await collection.doc(docId).set(payload, { merge: true });
    return payload;
  };

  shell.stopPresenceTracking = async function stopPresenceTracking() {
    if (presenceHeartbeatTimer) global.clearInterval(presenceHeartbeatTimer);
    presenceHeartbeatTimer = null;
    const cleanup = async () => {
      const user = shell.getCurrentAppUser();
      const docId = currentPresenceDocId || shell.getPresenceDocId(user);
      const collection = shell.getUserPresenceCollection();
      if (!docId || !collection) return;
      try {
        await collection.doc(docId).set({
          user_id: String(user?.id || user?.username || docId).trim(),
          username: String(user?.username || "").trim(),
          nama: String(user?.nama || "").trim(),
          role: String(user?.role || "").trim(),
          kode_guru: String(user?.kode_guru || "").trim(),
          online: false,
          last_seen_at: new Date().toISOString(),
          page: String(global.location?.hash || global.location?.pathname || "").trim()
        }, { merge: true });
      } catch {
        // noop
      }
    };
    await cleanup();
    if (presenceVisibilityHandler) global.document.removeEventListener("visibilitychange", presenceVisibilityHandler);
    if (presenceBeforeUnloadHandler) global.removeEventListener("beforeunload", presenceBeforeUnloadHandler);
    if (presencePageHideHandler) global.removeEventListener("pagehide", presencePageHideHandler);
    presenceVisibilityHandler = null;
    presenceBeforeUnloadHandler = null;
    presencePageHideHandler = null;
    currentPresenceDocId = "";
  };

  shell.startPresenceTracking = async function startPresenceTracking(options = {}) {
    const user = typeof options.getUser === "function" ? options.getUser() : shell.getCurrentAppUser();
    const role = String(user?.role || "").trim().toLowerCase();
    if (!user?.username && !user?.id) return null;
    if (!["admin", "superadmin", "guru", "koordinator", "urusan"].includes(role)) return null;
    await shell.markCurrentUserPresence({
      online: true,
      page: String(options.page || global.location?.hash || global.location?.pathname || "").trim()
    });
    currentPresenceDocId = shell.getPresenceDocId(user);
    if (presenceHeartbeatTimer) global.clearInterval(presenceHeartbeatTimer);
    presenceHeartbeatTimer = global.setInterval(() => {
      shell.markCurrentUserPresence({
        online: true,
        page: String(options.page || global.location?.hash || global.location?.pathname || "").trim()
      }).catch(() => {});
    }, 30000);
    if (!presenceVisibilityHandler) {
      presenceVisibilityHandler = () => {
        if (global.document.visibilityState === "visible") {
          shell.markCurrentUserPresence({ online: true }).catch(() => {});
        }
      };
      global.document.addEventListener("visibilitychange", presenceVisibilityHandler);
    }
    if (!presenceBeforeUnloadHandler) {
      presenceBeforeUnloadHandler = () => {
        shell.stopPresenceTracking().catch(() => {});
      };
      global.addEventListener("beforeunload", presenceBeforeUnloadHandler);
    }
    if (!presencePageHideHandler) {
      presencePageHideHandler = () => {
        shell.stopPresenceTracking().catch(() => {});
      };
      global.addEventListener("pagehide", presencePageHideHandler);
    }
    return shell.getPresenceDocId(user);
  };

  shell.getCurrentAppRole = function getCurrentAppRole() {
    return shell.getCurrentAppUser().role || "admin";
  };

  shell.canAccessAiPrompt = function canAccessAiPrompt(user = shell.getCurrentAppUser()) {
    const role = String(user?.role || "").trim().toLowerCase();
    if (["admin", "superadmin"].includes(role)) return true;
    return user?.can_generate_prompt !== false;
  };

  shell.getStoredCoordinatorLevels = function getStoredCoordinatorLevels() {
    const parsed = getStorageJson("appKoordinatorLevels", []);
    return Array.isArray(parsed) ? parsed.map(item => String(item || "").trim()).filter(Boolean) : [];
  };

  shell.setStoredCoordinatorLevels = function setStoredCoordinatorLevels(levels) {
    const normalized = [...new Set((Array.isArray(levels) ? levels : []).map(item => String(item || "").trim()).filter(Boolean))];
    return setStorageJson("appKoordinatorLevels", normalized);
  };

  shell.getCurrentCoordinatorLevelsSync = function getCurrentCoordinatorLevelsSync() {
    return shell.getStoredCoordinatorLevels();
  };

  shell.canUseCoordinatorAccess = function canUseCoordinatorAccess() {
    const role = shell.getCurrentAppRole();
    if (role === "koordinator") return true;
    if (role === "guru") return shell.getStoredCoordinatorLevels().length > 0;
    return false;
  };

  shell.refreshCoordinatorLevels = async function refreshCoordinatorLevels(options = {}) {
    if (!["koordinator", "guru"].includes(shell.getCurrentAppRole())) {
      shell.setStoredCoordinatorLevels([]);
      return [];
    }
    const kodeGuru = String(shell.getCurrentAppUser().kode_guru || "").trim();
    if (!kodeGuru) {
      shell.setStoredCoordinatorLevels([]);
      return [];
    }

    const documentsApi = global.SupabaseDocuments;
    if (!documentsApi?.collection) {
      shell.setStoredCoordinatorLevels([]);
      return [];
    }

    try {
      const snapshot = await documentsApi.collection("informasi_urusan").doc("koordinator_kelas").get();
      const data = snapshot?.exists ? snapshot.data() : {};
      const levels = [];
      if (String(data.kelas_7 || "").trim() === kodeGuru) levels.push("7");
      if (String(data.kelas_8 || "").trim() === kodeGuru) levels.push("8");
      if (String(data.kelas_9 || "").trim() === kodeGuru) levels.push("9");
      return shell.setStoredCoordinatorLevels(levels);
    } catch {
      return shell.setStoredCoordinatorLevels([]);
    }
  };

  shell.getSidebarSemesterLabel = function getSidebarSemesterLabel() {
    const semester = getStorageJson("appSemester", {});
    if (semester?.label) return semester.label;
    if (semester?.semester || semester?.tahun) return `${semester.semester || "-"} - ${semester.tahun || "-"}`;
    return "GENAP - 2025/2026";
  };

  shell.updateSidebarSemesterInfo = function updateSidebarSemesterInfo(options = {}) {
    const setText = typeof dom.setText === "function"
      ? dom.setText
      : (idOrElement, value) => {
          const element = typeof idOrElement === "string" ? global.document.getElementById(idOrElement) : idOrElement;
          if (element) element.innerText = value;
          return element;
        };

    setText("sidebarSemesterInfo", shell.getSidebarSemesterLabel());
    const brandTitle = global.document.getElementById("sidebarBrandTitle");
    if (brandTitle) {
      const user = typeof options.getUser === "function" ? options.getUser() : shell.getCurrentAppUser();
      const displayName = String(user?.nama || user?.username || user?.kode_guru || "Dashboard Sekolah").trim() || "Dashboard Sekolah";
      brandTitle.innerText = displayName;
      brandTitle.title = displayName;
    }
    const roleInfo = global.document.getElementById("sidebarRoleInfo");
    if (roleInfo) {
      const role = typeof options.getRole === "function" ? options.getRole() : shell.getCurrentAppRole();
      const hasCoordinatorAccess = typeof options.canUseCoordinatorAccess === "function"
        ? options.canUseCoordinatorAccess()
        : shell.canUseCoordinatorAccess();
      const labelMap = {
        superadmin: "Superadmin",
        admin: "Admin",
        guru: hasCoordinatorAccess ? "Guru + Koordinator" : "Guru",
        koordinator: "Koordinator",
        urusan: "Urusan",
        siswa: "Siswa"
      };
      roleInfo.innerText = labelMap[role] || "Pengguna";
    }
    setText("supabaseProjectInfo", "Supabase");
  };

  shell.canAccessPage = function canAccessPage(page) {
    const role = shell.getCurrentAppRole();
    if (["ai-soal", "generate-perangkat-pembelajaran"].includes(page) && !shell.canAccessAiPrompt()) return false;
    if (["admin", "superadmin"].includes(role)) return true;
    if (["admin-user", "admin-hierarki"].includes(page)) return false;
    if (role === "guru") {
      if (shell.canUseCoordinatorAccess()) {
        return ["input", "lihat", "kelas", "kelas-bayangan-siswa", "nilai-input", "nilai-input-guru", "rekap-nilai", "nilai-rapor", "wali-kehadiran", "wali-kelengkapan", "ai-soal", "generate-perangkat-pembelajaran"].includes(page);
      }
      return ["nilai-input-guru", "nilai-rapor", "wali-kehadiran", "wali-kelengkapan", "ai-soal", "generate-perangkat-pembelajaran"].includes(page);
    }
    if (role === "koordinator") return ["input", "lihat", "kelas", "kelas-bayangan-siswa", "nilai-input", "nilai-input-guru", "rekap-nilai", "wali-kehadiran", "wali-kelengkapan", "ai-soal", "generate-perangkat-pembelajaran"].includes(page);
    if (role === "urusan") return !["guru-input", "guru-lihat", "input", "lihat", "nilai-input", "nilai-rapor"].includes(page) || ["ai-soal", "generate-perangkat-pembelajaran"].includes(page);
    return false;
  };

  shell.applyRoleAccess = function applyRoleAccess(options = {}) {
    const role = typeof options.getRole === "function" ? options.getRole() : shell.getCurrentAppRole();
    const doc = options.document || global.document;
    doc.querySelectorAll(".role-menu").forEach(menu => {
      setDisplay(menu, menu.classList.contains(`role-${role}`) || (role === "superadmin" && menu.classList.contains("role-admin")));
    });

    const waliMenu = doc.getElementById("menuWaliKelas");
    const nilaiMenu = doc.getElementById("menuNilaiGuru");
    const siswaKoordinatorMenu = doc.getElementById("menuSiswaKoordinator");
    const kurikulumKoordinatorMenu = doc.getElementById("menuKurikulumKoordinator");
    const setMenuDisplay = (menu, shouldShow) => setDisplay(menu, shouldShow);
    const canAccessAiPrompt = shell.canAccessAiPrompt(typeof options.getUser === "function" ? options.getUser() : shell.getCurrentAppUser());

    doc.querySelectorAll("[data-ai-prompt-menu='true']").forEach(button => {
      setDisplay(button, canAccessAiPrompt);
    });

    if (!waliMenu) return Promise.resolve();
    if (["admin", "superadmin"].includes(role)) {
      setMenuDisplay(waliMenu, true);
      return Promise.resolve();
    }
    if (role === "koordinator") {
      const getCollectionQuery = options.getCollectionQuery;
      const kodeGuru = String((typeof options.getUser === "function" ? options.getUser() : shell.getCurrentAppUser()).kode_guru || "").trim();
      const ownWaliPromise = kodeGuru && typeof getCollectionQuery === "function"
        ? getCollectionQuery("kelas").where("kode_guru", "==", kodeGuru).limit(1).get()
        : Promise.resolve({ empty: true });
      return Promise.all([
        shell.refreshCoordinatorLevels(),
        ownWaliPromise
      ])
        .then(([levels, waliSnapshot]) => {
          setMenuDisplay(waliMenu, levels.length > 0 || !waliSnapshot.empty);
        })
        .catch(() => {
          setMenuDisplay(waliMenu, false);
        });
    }

    setMenuDisplay(waliMenu, false);
    if (role === "guru") {
      const getCollectionQuery = options.getCollectionQuery;
      const kodeGuru = String((typeof options.getUser === "function" ? options.getUser() : shell.getCurrentAppUser()).kode_guru || "").trim();
      if (!kodeGuru || typeof getCollectionQuery !== "function") return Promise.resolve();

      return Promise.all([
        getCollectionQuery("kelas").where("kode_guru", "==", kodeGuru).limit(1).get(),
        shell.refreshCoordinatorLevels()
      ])
        .then(([snapshot, coordinatorLevels]) => {
          const hasCoordinatorAccess = Array.isArray(coordinatorLevels) && coordinatorLevels.length > 0;
          setMenuDisplay(waliMenu, !snapshot.empty || hasCoordinatorAccess);
          setMenuDisplay(nilaiMenu, true);
          setMenuDisplay(siswaKoordinatorMenu, hasCoordinatorAccess);
          setMenuDisplay(kurikulumKoordinatorMenu, hasCoordinatorAccess);
        })
        .catch(() => {
          setMenuDisplay(waliMenu, false);
          setMenuDisplay(nilaiMenu, true);
          setMenuDisplay(siswaKoordinatorMenu, false);
          setMenuDisplay(kurikulumKoordinatorMenu, false);
        });
    }

    setMenuDisplay(siswaKoordinatorMenu, false);
    setMenuDisplay(kurikulumKoordinatorMenu, false);
    return Promise.resolve();
  };

  shell.toggleSidebar = function toggleSidebar(forceClose = false, options = {}) {
    const doc = options.document || global.document;
    const bodyClassList = getBodyClassList(doc);
    if (forceClose) {
      if (typeof dom.toggleBodyClass === "function") dom.toggleBodyClass("sidebar-collapsed", true);
      else bodyClassList.add("sidebar-collapsed");
      return true;
    }
    bodyClassList.toggle("sidebar-collapsed");
    return true;
  };

  shell.toggleMenu = function toggleMenu(id, buttonEl, options = {}) {
    const doc = options.document || global.document;
    const menu = doc.getElementById(id);
    if (!menu) return false;
    const getStyle = typeof options.getComputedStyle === "function" ? options.getComputedStyle : global.getComputedStyle;
    const currentDisplay = getStyle(menu).display;
    const isOpen = currentDisplay !== "none";
    menu.style.display = isOpen ? "none" : "block";
    if (buttonEl?.classList?.toggle) buttonEl.classList.toggle("active", !isOpen);
    return !isOpen;
  };

  shell.syncResponsiveSidebar = function syncResponsiveSidebar(options = {}) {
    const doc = options.document || global.document;
    const width = Number(options.innerWidth ?? global.innerWidth ?? 0);
    const bodyClassList = getBodyClassList(doc);
    if (width <= 1180) bodyClassList.add("sidebar-collapsed");
    else bodyClassList.remove("sidebar-collapsed");
    return width <= 1180;
  };

  shell.bootstrap = function bootstrap(options = {}) {
    const role = typeof options.getRole === "function" ? options.getRole() : shell.getCurrentAppRole();
    const ensureActiveSemesterDataAvailable = options.ensureActiveSemesterDataAvailable;
    const renderHome = typeof options.renderHome === "function" ? options.renderHome : () => {};
    const applyRoleAccess = typeof options.applyRoleAccess === "function" ? options.applyRoleAccess : () => Promise.resolve();
    const updateSidebarSemesterInfo = typeof options.updateSidebarSemesterInfo === "function"
      ? options.updateSidebarSemesterInfo
      : () => shell.updateSidebarSemesterInfo();
    const refreshCoordinatorLevels = typeof options.refreshCoordinatorLevels === "function"
      ? options.refreshCoordinatorLevels
      : () => shell.refreshCoordinatorLevels();
    const onError = typeof options.onError === "function" ? options.onError : error => global.console?.error?.(error);

    const finalize = () => Promise.resolve(applyRoleAccess())
      .finally(() => {
        updateSidebarSemesterInfo();
      })
      .then(() => {
        if (["admin", "superadmin", "guru", "koordinator", "urusan"].includes(role)) {
          shell.startPresenceTracking({
            getUser: typeof options.getUser === "function" ? options.getUser : () => shell.getCurrentAppUser(),
            page: global.location?.hash || global.location?.pathname || ""
          }).catch(() => {});
        }
        if (typeof ensureActiveSemesterDataAvailable === "function") {
          return ensureActiveSemesterDataAvailable()
            .catch(onError)
            .finally(() => renderHome());
        }
        renderHome();
        return null;
      });

    if (["koordinator", "guru"].includes(role)) {
      return Promise.resolve(refreshCoordinatorLevels())
        .catch(() => [])
        .finally(finalize);
    }

    return finalize();
  };

  global.DashboardShell = shell;
})(window);
