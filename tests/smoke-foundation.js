const fs = require("fs");
const path = require("path");
const vm = require("vm");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function createWindowMock() {
  const storage = new Map();
  const documentElements = new Map();
  const bodyClasses = new Set();
  const openedWindows = [];
  const createSnapshotDocs = (rows = [{ id: "1", nama: "A" }]) => rows.map(row => ({
    id: row.id || "1",
    data: () => ({ ...row })
  }));
  const createQuerySnapshot = (rows = [{ id: "1", nama: "A" }]) => ({
    docs: createSnapshotDocs(rows),
    empty: rows.length === 0,
    size: rows.length
  });
  const createDocSnapshot = (data = { kelas_7: "G001", kelas_8: "", kelas_9: "" }, id = "doc1") => ({
    id,
    exists: true,
    data: () => ({ ...data })
  });
  const createQueryRef = (rows = [{ id: "1", nama: "A" }]) => ({
    where() {
      return createQueryRef(rows);
    },
    orderBy() {
      return createQueryRef(rows);
    },
    limit() {
      return createQueryRef(rows);
    },
    get() {
      return Promise.resolve(createQuerySnapshot(rows));
    },
    onSnapshot(callback) {
      callback(createQuerySnapshot(rows));
      return () => {};
    },
    doc(id = "doc1") {
      return {
        id,
        get() {
          return Promise.resolve(createDocSnapshot({ kelas_7: "G001", kelas_8: "", kelas_9: "" }, id));
        },
        set() {
          return Promise.resolve();
        },
        update() {
          return Promise.resolve();
        },
        onSnapshot(callback) {
          callback(createDocSnapshot({ kelas_7: "G001" }, id));
          return () => {};
        },
        delete() {
          return Promise.resolve();
        }
      };
    }
  });
  const createDomNode = () => ({
    style: {},
    className: "",
    id: "",
    innerHTML: "",
    innerText: "",
    classList: {
      contains() {
        return false;
      },
      toggle() {}
    },
    querySelector() {
      return { textContent: "" };
    }
  });
  const window = {
    localStorage: {
      getItem(key) {
        return storage.has(key) ? storage.get(key) : null;
      },
      setItem(key, value) {
        storage.set(key, String(value));
      },
      removeItem(key) {
        storage.delete(key);
      }
    },
    document: {
      body: {
        appended: [],
        classList: {
          add(name) {
            bodyClasses.add(name);
          },
          remove(name) {
            bodyClasses.delete(name);
          },
          toggle(name, force) {
            if (typeof force === "boolean") {
              if (force) bodyClasses.add(name);
              else bodyClasses.delete(name);
              return force;
            }
            if (bodyClasses.has(name)) {
              bodyClasses.delete(name);
              return false;
            }
            bodyClasses.add(name);
            return true;
          },
          contains(name) {
            return bodyClasses.has(name);
          }
        },
        appendChild(node) {
          this.appended.push(node);
        }
      },
      createElement() {
        return createDomNode();
      },
      getElementById(id) {
        if (!documentElements.has(id)) documentElements.set(id, createDomNode());
        return documentElements.get(id);
      },
      querySelectorAll() {
        return [];
      }
    },
    addEventListener() {},
    getComputedStyle() {
      return { display: "none" };
    },
    location: { href: "" },
    Swal: { fire() {} },
    console,
    CSS: { escape: value => String(value) },
    setTimeout,
    clearTimeout,
    open() {
      const opened = {
        printed: false,
        focused: false,
        closed: false,
        loadHandler: null,
        document: {
          title: "",
          written: "",
          open() {},
          write(value) {
            this.written += String(value || "");
          },
          close() {}
        },
        addEventListener(eventName, handler) {
          if (eventName === "load") this.loadHandler = handler;
        },
        focus() {
          this.focused = true;
        },
        print() {
          this.printed = true;
        },
        close() {
          this.closed = true;
        }
      };
      openedWindows.push(opened);
      return opened;
    }
  };

  window.window = window;
  window.SupabaseDocuments = {
    client: null,
    table: "app_documents",
    collection(name) {
      return window.db.collection(name);
    },
    batch() {
      return window.db.batch();
    }
  };
  window.db = {
    collection() {
      return createQueryRef();
    },
    batch() {
      return {
        set() {},
        update() {},
        delete() {},
        commit() {
          return Promise.resolve();
        }
      };
    }
  };
  window.SupabaseDocuments = {
    collection() {
      return createQueryRef();
    },
    batch() {
      return window.db.batch();
    }
  };
  window.listenSiswa = callback => {
    callback([{ nama: "A" }]);
    return () => {};
  };
  window.loadKepalaSekolahTtdSettings = () => Promise.resolve();
  window.__openedWindows = openedWindows;
  return window;
}

function runFileInContext(context, relativePath) {
  const fullPath = path.join(process.cwd(), relativePath);
  const code = fs.readFileSync(fullPath, "utf8");
  vm.runInContext(code, context, { filename: relativePath });
}

async function main() {
  const window = createWindowMock();
  const context = vm.createContext(window);
  const files = [
    "shared/app-utils.js",
    "shared/app-dom.js",
    "shared/app-loading.js",
    "shared/app-lifecycle.js",
    "shared/app-print.js",
    "shared/app-router.js",
    "shared/dashboard-shell.js",
    "shared/dashboard-data.js",
    "shared/dashboard-module-loader.js",
    "shared/dashboard-home-data.js",
    "shared/dashboard-home.js",
    "shared/dashboard-routes.js",
    "Admin/admin-users-identity.js",
    "Admin/admin-users-service.js",
    "Admin/admin-users-view.js",
    "Asesmen/pembagian-ruang-store.js",
    "Asesmen/administrasi-settings.js",
    "Asesmen/pembagian-ruang-service.js",
    "Asesmen/pembagian-ruang-view.js",
    "Nilai/nilai-data.js",
    "Nilai/nilai.js",
    "Nilai/rapor.js",
    "WaliKelas/wali-kelas-service.js",
    "WaliKelas/wali-kelas-view.js",
    "WaliKelas/wali-kelas.js"
  ];

  files.forEach(file => runFileInContext(context, file));

  assert(typeof window.AppUtils?.escapeHtml === "function", "AppUtils.escapeHtml missing");
  assert(window.AppUtils.escapeHtml("<b>") === "&lt;b&gt;", "AppUtils.escapeHtml failed");
  assert(window.AppUtils.parseKelas("7a").kelas === "7 A", "AppUtils.parseKelas failed");

  assert(typeof window.AppDom?.setText === "function", "AppDom.setText missing");
  const fakeEl = { innerText: "" };
  window.AppDom.setText(fakeEl, "ok");
  assert(fakeEl.innerText === "ok", "AppDom.setText failed");

  assert(typeof window.AppLoading?.set === "function", "AppLoading.set missing");
  window.AppLoading.set("smoke", true, { title: "Tes", message: "Jalan" });
  window.AppLoading.set("smoke", false, {});

  assert(typeof window.AppLifecycle?.clearPageSubscriptions === "function", "AppLifecycle.clearPageSubscriptions missing");
  window.clearWaliKelasListeners = () => {};
  window.AppLifecycle.clearPageSubscriptions();

  assert(typeof window.AppPrint?.openHtml === "function", "AppPrint.openHtml missing");
  const printedWindow = window.AppPrint.openHtml("<html><body>Print</body></html>", {
    documentTitle: "Tes Print",
    autoPrint: false
  });
  assert(printedWindow && /Print/.test(printedWindow.document.written), "AppPrint.openHtml failed to write html");
  assert(printedWindow.document.title === "Tes Print", "AppPrint.openHtml failed to set title");

  assert(typeof window.AppRouter?.register === "function", "AppRouter.register missing");
  const content = { innerHTML: "" };
  const pageTitle = { innerText: "" };
  window.AppRouter.register("x", { title: "X", render: () => "<div>x</div>" });
  assert(window.AppRouter.navigate("x", { content, pageTitle }), "AppRouter.navigate failed");
  assert(content.innerHTML === "<div>x</div>", "AppRouter did not render");
  assert(pageTitle.innerText === "X", "AppRouter did not update title");
  assert(typeof window.DashboardRoutes?.register === "function", "DashboardRoutes.register missing");
  assert(window.DashboardRoutes.register(window.AppRouter) === true, "DashboardRoutes.register failed");
  assert(window.AppRouter.has("mapel"), "DashboardRoutes did not register mapel");
  assert(typeof window.DashboardData?.getCollectionQuery === "function", "DashboardData.getCollectionQuery missing");
  assert(typeof window.DashboardData.getCollectionQuery("guru")?.onSnapshot === "function", "DashboardData.getCollectionQuery failed");

  assert(typeof window.DashboardShell?.getCurrentAppRole === "function", "DashboardShell.getCurrentAppRole missing");
  window.localStorage.setItem("appUser", JSON.stringify({ role: "guru", kode_guru: "G001" }));
  assert(window.DashboardShell.getCurrentAppRole() === "guru", "DashboardShell.getCurrentAppRole failed");
  const levels = await window.DashboardShell.refreshCoordinatorLevels({ db: window.db });
  assert(Array.isArray(levels) && levels.includes("7"), "DashboardShell.refreshCoordinatorLevels failed");
  assert(window.DashboardShell.canUseCoordinatorAccess() === true, "DashboardShell.canUseCoordinatorAccess failed");
  window.DashboardShell.updateSidebarSemesterInfo();
  assert(window.document.getElementById("supabaseProjectInfo").innerText === "Supabase", "DashboardShell.updateSidebarSemesterInfo failed");
  window.DashboardShell.toggleSidebar(false, { document: window.document });
  assert(window.document.body.classList.contains("sidebar-collapsed"), "DashboardShell.toggleSidebar failed");
  window.DashboardShell.syncResponsiveSidebar({ document: window.document, innerWidth: 1400 });
  assert(!window.document.body.classList.contains("sidebar-collapsed"), "DashboardShell.syncResponsiveSidebar failed");
  let bootstrapRendered = 0;
  await window.DashboardShell.bootstrap({
    getRole: () => "admin",
    applyRoleAccess: () => Promise.resolve(),
    updateSidebarSemesterInfo: () => {},
    ensureActiveSemesterDataAvailable: () => Promise.resolve(),
    renderHome: () => {
      bootstrapRendered += 1;
    },
    onError: error => {
      throw error;
    }
  });
  assert(bootstrapRendered === 1, "DashboardShell.bootstrap failed");

  assert(typeof window.DashboardHome?.renderMainHome === "function", "DashboardHome.renderMainHome missing");
  assert(/home-summary-panel|Rangkuman Input/.test(window.DashboardHome.renderMainHome()), "DashboardHome.renderMainHome failed");
  assert(/home-summary-panel|Guru/.test(window.DashboardHome.renderGuruHome()), "DashboardHome.renderGuruHome failed");
  assert(/home-summary-panel|Guru \+ Koordinator|Koordinator/.test(window.DashboardHome.renderKoordinatorHome(["7", "8"])), "DashboardHome.renderKoordinatorHome failed");
  assert(/Rekap Nilai/.test(window.DashboardHome.renderRekapNilaiPlaceholder(["7"])), "DashboardHome.renderRekapNilaiPlaceholder failed");
  assert(typeof window.DashboardHome.renderHomePage === "function", "DashboardHome.renderHomePage missing");
  const homeContent = { innerHTML: "" };
  const homeTitle = { innerText: "" };
  let homeStatsLoaded = 0;
  window.DashboardHome.renderHomePage({
    content: homeContent,
    pageTitle: homeTitle,
    role: "admin",
    hasCoordinatorAccess: () => false,
    loadHomeStats: () => {
      homeStatsLoaded += 1;
    }
  });
  assert(/home-summary-panel|Rangkuman Input/.test(homeContent.innerHTML), "DashboardHome.renderHomePage failed");
  assert(homeStatsLoaded === 1, "DashboardHome.renderHomePage did not load stats");

  assert(typeof window.AsesmenRuangStore?.save === "function", "AsesmenRuangStore.save missing");
  const saved = window.AsesmenRuangStore.save("smoke-store", {
    jumlahRuangUjian: 3,
    draftJumlahRuangUjian: 4,
    pembagianKelasAsesmen: "manual",
    draftPembagianKelasAsesmen: "20siswa",
    appliedLevels: ["7", "8"],
    asesmenLevelSettings: {
      7: { mode: "manual", order: "za", roomRanges: [{ start: "1", end: "2" }, { start: "3", end: "4" }], manualCounts: ["10", "10", "10"] },
      8: {},
      9: {}
    },
    draftAsesmenLevelSettings: {
      7: { mode: "20siswa", order: "az", roomRanges: [{ start: "", end: "" }, { start: "", end: "" }], manualCounts: ["5"] },
      8: {},
      9: {}
    }
  });
  assert(saved.jumlahRuangUjian === 3, "AsesmenRuangStore.save failed");

  const loaded = window.AsesmenRuangStore.load("smoke-store", {
    jumlahRuangUjian: 1,
    pembagianKelasAsesmen: "setengah",
    asesmenLevelSettings: { 7: {}, 8: {}, 9: {} }
  });
  assert(loaded && loaded.jumlahRuangUjian === 3, "AsesmenRuangStore.load failed");
  assert(loaded.asesmenLevelSettings[7].mode === "manual", "AsesmenRuangStore.load mode failed");

  assert(typeof window.AsesmenAdministrasiSettings?.set === "function", "AsesmenAdministrasiSettings.set missing");
  window.AsesmenAdministrasiSettings.set("Judul", "Asesmen");
  assert(window.AsesmenAdministrasiSettings.get("Judul") === "Asesmen", "AsesmenAdministrasiSettings get/set failed");

  assert(typeof window.AsesmenRuangService?.loadPembagianRuang === "function", "AsesmenRuangService.loadPembagianRuang missing");
  let pembagianRenderCount = 0;
  const unsubscribe = window.AsesmenRuangService.loadPembagianRuang(null, {
    onData: rows => assert(Array.isArray(rows), "AsesmenRuangService rows invalid"),
    onRender: () => {
      pembagianRenderCount += 1;
    }
  });
  assert(typeof unsubscribe === "function", "AsesmenRuangService did not return unsubscribe");
  assert(pembagianRenderCount === 1, "AsesmenRuangService render callback failed");

  assert(typeof window.AsesmenRuangView?.renderPembagianPage === "function", "AsesmenRuangView.renderPembagianPage missing");
  const html = window.AsesmenRuangView.renderPembagianPage({
    draftJumlahRuangUjian: 2,
    draftPembagianKelasAsesmen: "manual",
    draftSettings: {
      7: { mode: "manual", order: "az", roomRanges: [{ start: "", end: "" }, { start: "", end: "" }], manualCounts: ["10", "10"] },
      8: { mode: "setengah", order: "az", roomRanges: [{ start: "", end: "" }, { start: "", end: "" }], manualCounts: [] },
      9: { mode: "20siswa", order: "za", roomRanges: [{ start: "", end: "" }, { start: "", end: "" }], manualCounts: [] }
    },
    jumlahRuangUjian: 2,
    escape: window.AppUtils.escapeHtml,
    getStudentCount: level => Number(level) * 10
  });
  assert(/Pembagian Ruang/.test(html), "AsesmenRuangView missing page title");
  assert(/Set Kelas 7/.test(html), "AsesmenRuangView missing level panel");
  const tempelRowsHtml = vm.runInContext(`
    (function() {
      function escapeAsesmenHtml(value) {
        return window.AppUtils.escapeHtml(value);
      }
      ${fs.readFileSync(path.join(process.cwd(), "Asesmen/pembagian-ruang-v2.js"), "utf8").match(/function renderTempelKacaRows\(students = \[\]\) \{[\s\S]*?\n\}/)[0]}
      return renderTempelKacaRows([{ nama: "Ani", kelasParts: { kelas: "7 A" } }]);
    })()
  `, context);
  assert(/Ani/.test(tempelRowsHtml), "renderTempelKacaRows failed");
  assert(/<td class="tempel-no">1<\/td>/.test(tempelRowsHtml), "renderTempelKacaRows numbering failed");

  assert(typeof window.AdminUsersIdentity?.makeGuruUsername === "function", "AdminUsersIdentity.makeGuruUsername missing");
  const guru = { nama: "Emi Masturoh S.Pd", nip: "", kode_guru: "G001" };
  assert(window.AdminUsersIdentity.makeGuruUsername(guru) === "emimasturoh", "AdminUsersIdentity.makeGuruUsername failed");
  const userRows = [
    { id: "u1", nama: "Emi Masturoh", username: "emimasturoh", password: "abc", role: "guru", sumber: "guru" }
  ];
  const linkedUser = window.AdminUsersIdentity.getUserByGuru(guru, userRows);
  assert(linkedUser && linkedUser.username === "emimasturoh", "AdminUsersIdentity.getUserByGuru failed");

  assert(typeof window.AdminUsersView?.renderUserRows === "function", "AdminUsersView.renderUserRows missing");
  const userTableHtml = window.AdminUsersView.renderUserRows({
    users: userRows,
    currentEditId: "u1",
    roles: ["admin", "guru"],
    defaultPassword: "guruspenturi",
    escape: window.AppUtils.escapeHtml,
    makeUserDocId: value => value
  });
  assert(/Emi Masturoh/.test(userTableHtml), "AdminUsersView.renderUserRows missing user name");
  assert(/Simpan/.test(userTableHtml), "AdminUsersView.renderUserRows missing edit action");

  const userPageHtml = window.AdminUsersView.renderUserPage({
    defaultPassword: "guruspenturi",
    roles: ["admin", "guru", "siswa"]
  });
  assert(/Daftar User/.test(userPageHtml), "AdminUsersView.renderUserPage missing title");
  assert(/Tambah User/.test(userPageHtml), "AdminUsersView.renderUserPage missing create action");
  assert(typeof window.AdminUsersService?.syncGuruUsers === "function", "AdminUsersService.syncGuruUsers missing");
  const syncResult = await window.AdminUsersService.syncGuruUsers({
    guruList: [{ nama: "Emi Masturoh", kode_guru: "G001", nip: "" }],
    getUserByGuru: () => null,
    prepareGuruUser: row => ({ nama: row.nama, username: "emimasturoh", role: "guru" }),
    makeUserDocId: value => value
  });
  assert(syncResult.added === 1, "AdminUsersService.syncGuruUsers failed");
  const adminRealtime = window.AdminUsersService.loadRealtimeUsers({
    includeSiswa: true,
    getKoordinatorDocRef: () => ({
      onSnapshot(callback) {
        callback({ exists: true, id: "doc1", data: () => ({ kelas_7: "G001" }) });
        return () => {};
      }
    }),
    onGuruData: rows => assert(Array.isArray(rows), "AdminUsersService guru rows invalid"),
    onUserData: rows => assert(Array.isArray(rows), "AdminUsersService user rows invalid"),
    onSiswaData: rows => assert(Array.isArray(rows), "AdminUsersService siswa rows invalid"),
    onKoordinatorData: data => assert(data.kelas_7 === "G001", "AdminUsersService koordinator data invalid")
  });
  assert(typeof adminRealtime.guru === "function", "AdminUsersService realtime unsubscribe missing");

  assert(typeof window.WaliKelasService?.getDefaultReadyState === "function", "WaliKelasService.getDefaultReadyState missing");
  const readyState = window.WaliKelasService.getDefaultReadyState();
  assert(readyState.siswa === false && readyState.rekap === false, "WaliKelasService ready state invalid");
  let waliRenderCount = 0;
  const waliRealtime = window.WaliKelasService.loadRealtime("kehadiran", {
    clearListeners() {},
    setCurrentPage() {},
    setReadyState() {},
    renderLoading() {},
    renderActivePage() { waliRenderCount += 1; },
    onSiswa() {},
    onKelas() {},
    onMapel() {},
    onMengajar() {},
    onGuru() {},
    onNilai() {},
    onKehadiran() {},
    onRekap() {},
    markReady() {}
  });
  await new Promise(resolve => setTimeout(resolve, 0));
  assert(typeof waliRealtime.siswa === "function", "WaliKelasService subscriber missing");
  assert(waliRenderCount > 0, "WaliKelasService render callback failed");
  assert(typeof window.WaliKelasView?.renderPageShell === "function", "WaliKelasView.renderPageShell missing");
  assert(/Memuat data wali kelas/.test(window.WaliKelasView.renderPageShell()), "WaliKelasView.renderPageShell failed");
  const waliHeaderHtml = window.WaliKelasView.renderHeader({
    title: "Kehadiran Siswa",
    description: "Deskripsi",
    extraActions: "<button>x</button>",
    selectOptionsHtml: "<option>7 A</option>",
    escape: window.AppUtils.escapeHtml
  });
  assert(/Kehadiran Siswa/.test(waliHeaderHtml), "WaliKelasView.renderHeader missing title");
  const waliKehadiranHtml = window.WaliKelasView.renderKehadiranTable({
    kelas: "7 A",
    students: [{ nipd: "001", nama: "Ani", kelas: "7 A" }],
    getCounts: () => ({ S: 1, I: 0, A: 2 }),
    escape: window.AppUtils.escapeHtml
  });
  assert(/Ani/.test(waliKehadiranHtml), "WaliKelasView.renderKehadiranTable missing student");
  const waliKelengkapanHtml = window.WaliKelasView.renderKelengkapanTable({
    kelas: "7 A",
    assignments: [{ mapel_kode: "MTK", guru_kode: "G001" }],
    escape: window.AppUtils.escapeHtml,
    getMapelName: () => "Matematika",
    getGuruName: () => "Budi",
    getNilaiCount: () => ({ count: 10, total: 20 }),
    getCompletenessClass: () => "wali-complete-yellow",
    formatCompletenessText: (count, total) => `${count}/${total}`
  });
  assert(/Matematika/.test(waliKelengkapanHtml), "WaliKelasView.renderKelengkapanTable missing mapel");
  assert(typeof window.getWaliNilaiCount === "function", "getWaliNilaiCount missing");
  const prevWaliSiswa = typeof semuaDataWaliSiswa !== "undefined" ? semuaDataWaliSiswa : null;
  const prevWaliMapel = typeof semuaDataWaliMapel !== "undefined" ? semuaDataWaliMapel : null;
  const prevWaliNilai = typeof semuaDataWaliNilai !== "undefined" ? semuaDataWaliNilai : null;
  try {
    semuaDataWaliSiswa = [{
      nipd: "001",
      nama: "Ani",
      kelas: "7 A",
      kelas_bayangan: "7 A",
      agama: "islam"
    }];
    semuaDataWaliMapel = [{
      kode_mapel: "PAI",
      nama_mapel: "Pendidikan Agama",
      induk_mapel: "PABP",
      agama: "islam"
    }];
    semuaDataWaliNilai = [{
      id: "legacy-001",
      term_id: typeof getActiveTermId === "function" ? getActiveTermId() : "legacy",
      kelas: "7 A",
      nipd: "001",
      mapel_kode: "PAI",
      nilai: 88
    }];
    const waliCount = window.getWaliNilaiCount("7 A", "PAI", "uh_1");
    assert(typeof waliCount?.count === "number" && typeof waliCount?.total === "number", "getWaliNilaiCount should return count metadata for UH 1");
  } finally {
    if (prevWaliSiswa !== null) semuaDataWaliSiswa = prevWaliSiswa;
    if (prevWaliMapel !== null) semuaDataWaliMapel = prevWaliMapel;
    if (prevWaliNilai !== null) semuaDataWaliNilai = prevWaliNilai;
  }
  assert(
    window.makeNilaiAssignmentHydrationKey({ tingkat: "7", rombel: "A", mapel_kode: "PAI", guru_kode: "G001" }) !==
    window.makeNilaiAssignmentHydrationKey({ tingkat: "7", rombel: "A", mapel_kode: "PAI", guru_kode: "G002" }),
    "makeNilaiAssignmentHydrationKey should include guru_kode"
  );

  assert(typeof window.getRaporKelasList === "function", "getRaporKelasList missing");
  assert(typeof window.getNilaiAssignmentsForClass === "function", "getNilaiAssignmentsForClass missing");
  const prevRaporSiswa = typeof semuaDataRaporSiswa !== "undefined" ? semuaDataRaporSiswa : null;
  const prevRaporKelas = typeof semuaDataRaporKelas !== "undefined" ? semuaDataRaporKelas : null;
  const prevNilaiSiswa = typeof semuaDataNilaiSiswa !== "undefined" ? semuaDataNilaiSiswa : null;
  const prevNilaiMapel = typeof semuaDataNilaiMapel !== "undefined" ? semuaDataNilaiMapel : null;
  const prevNilaiMengajar = typeof semuaDataNilaiMengajar !== "undefined" ? semuaDataNilaiMengajar : null;
  const prevNilaiKelas = typeof semuaDataNilaiKelas !== "undefined" ? semuaDataNilaiKelas : null;
  const prevAppUser = window.localStorage.getItem("appUser");
  const prevCoordinatorLevels = window.localStorage.getItem("appKoordinatorLevels");
  try {
    window.localStorage.setItem("appUser", JSON.stringify({ role: "koordinator", kode_guru: "G009" }));
    window.localStorage.setItem("appKoordinatorLevels", JSON.stringify(["9"]));
    semuaDataRaporSiswa = [{
      nipd: "002",
      nama: "Budi",
      kelas: "7 B",
      kelas_bayangan: "7 B",
      agama: "islam"
    }];
    semuaDataRaporKelas = [{
      kelas: "7 B",
      kode_guru: "G009"
    }];
    const raporClasses = window.getRaporKelasList();
    assert(Array.isArray(raporClasses), "getRaporKelasList should return an array");

    semuaDataNilaiSiswa = [{
      nipd: "002",
      nama: "Budi",
      kelas: "7 B",
      kelas_bayangan: "7 B",
      agama: "islam"
    }];
    semuaDataNilaiMapel = [{
      kode_mapel: "MTK",
      nama_mapel: "Matematika"
    }];
    semuaDataNilaiMengajar = [{
      tingkat: "7",
      rombel: "B",
      mapel_kode: "MTK",
      guru_kode: "G777"
    }];
    semuaDataNilaiKelas = [{
      kelas: "7 B",
      kode_guru: "G009"
    }];
    const nilaiAssignments = window.getNilaiAssignmentsForClass("7", "B");
    assert(Array.isArray(nilaiAssignments), "getNilaiAssignmentsForClass should return an array");
  } finally {
    if (prevRaporSiswa !== null) semuaDataRaporSiswa = prevRaporSiswa;
    if (prevRaporKelas !== null) semuaDataRaporKelas = prevRaporKelas;
    if (prevNilaiSiswa !== null) semuaDataNilaiSiswa = prevNilaiSiswa;
    if (prevNilaiMapel !== null) semuaDataNilaiMapel = prevNilaiMapel;
    if (prevNilaiMengajar !== null) semuaDataNilaiMengajar = prevNilaiMengajar;
    if (prevNilaiKelas !== null) semuaDataNilaiKelas = prevNilaiKelas;
    if (prevAppUser === null) window.localStorage.removeItem("appUser");
    else window.localStorage.setItem("appUser", prevAppUser);
    if (prevCoordinatorLevels === null) window.localStorage.removeItem("appKoordinatorLevels");
    else window.localStorage.setItem("appKoordinatorLevels", prevCoordinatorLevels);
  }

  const dashboardHtml = fs.readFileSync(path.join(process.cwd(), "dashboard.html"), "utf8");
  const requiredScripts = [
    "shared/app-utils.js",
    "shared/app-dom.js",
    "shared/app-loading.js",
    "shared/app-lifecycle.js",
    "shared/app-print.js",
    "shared/app-router.js",
    "shared/dashboard-shell.js",
    "shared/dashboard-data.js",
    "shared/dashboard-module-loader.js",
    "shared/dashboard-home-data.js",
    "shared/dashboard-home.js",
    "shared/dashboard-routes.js",
    "inline-notification.js",
    "ttd-ks.js",
    "Semester/semester.js"
  ];
  requiredScripts.forEach(item => {
    assert(dashboardHtml.includes(item), `dashboard.html missing script ${item}`);
  });
  const indexes = requiredScripts.map(item => dashboardHtml.indexOf(item));
  for (let index = 1; index < indexes.length; index += 1) {
    assert(indexes[index] > indexes[index - 1], `dashboard.html script order invalid near ${requiredScripts[index]}`);
  }

  console.log("SMOKE TEST OK");
}

main().catch(error => {
  console.error(error.message || error);
  process.exit(1);
});
