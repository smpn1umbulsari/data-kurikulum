(function initDashboardShell(global) {
  const shell = global.DashboardShell || {};
  const storage = global.AppUtils || {};
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
    global.localStorage.removeItem("login");
    global.localStorage.removeItem("appUser");
    global.localStorage.removeItem("appSemester");
    global.location.href = "login.html";
  };

  shell.getCurrentAppUser = function getCurrentAppUser() {
    return getStorageJson("appUser", {}) || {};
  };

  shell.getCurrentAppRole = function getCurrentAppRole() {
    return shell.getCurrentAppUser().role || "admin";
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
    const roleInfo = global.document.getElementById("sidebarRoleInfo");
    if (roleInfo) {
      const role = typeof options.getRole === "function" ? options.getRole() : shell.getCurrentAppRole();
      const hasCoordinatorAccess = typeof options.canUseCoordinatorAccess === "function"
        ? options.canUseCoordinatorAccess()
        : shell.canUseCoordinatorAccess();
      const labelMap = {
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
    if (role === "admin") return true;
    if (["admin-user", "admin-hierarki"].includes(page)) return false;
    if (role === "guru") {
      if (shell.canUseCoordinatorAccess()) {
        return ["input", "lihat", "kelas-bayangan-siswa", "nilai-input", "nilai-input-guru", "rekap-nilai", "nilai-rapor", "wali-kehadiran", "wali-kelengkapan"].includes(page);
      }
      return ["nilai-input-guru", "nilai-rapor", "wali-kehadiran", "wali-kelengkapan"].includes(page);
    }
    if (role === "koordinator") return ["input", "lihat", "kelas-bayangan-siswa", "nilai-input", "nilai-input-guru", "rekap-nilai", "wali-kehadiran", "wali-kelengkapan"].includes(page);
    if (role === "urusan") return !["guru-input", "guru-lihat", "input", "lihat", "nilai-input", "nilai-rapor"].includes(page);
    return false;
  };

  shell.applyRoleAccess = function applyRoleAccess(options = {}) {
    const role = typeof options.getRole === "function" ? options.getRole() : shell.getCurrentAppRole();
    const doc = options.document || global.document;
    doc.querySelectorAll(".role-menu").forEach(menu => {
      setDisplay(menu, menu.classList.contains(`role-${role}`));
    });

    const waliMenu = doc.getElementById("menuWaliKelas");
    const nilaiMenu = doc.getElementById("menuNilaiGuru");
    const siswaKoordinatorMenu = doc.getElementById("menuSiswaKoordinator");
    const kurikulumKoordinatorMenu = doc.getElementById("menuKurikulumKoordinator");
    const setMenuDisplay = (menu, shouldShow) => setDisplay(menu, shouldShow);

    if (!waliMenu) return Promise.resolve();
    if (role === "admin") {
      setMenuDisplay(waliMenu, true);
      return Promise.resolve();
    }
    if (role === "koordinator") {
      return shell.refreshCoordinatorLevels()
        .then(levels => {
          setMenuDisplay(waliMenu, levels.length > 0);
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
