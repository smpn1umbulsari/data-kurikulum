(function initDashboardHome(global) {
  if (global.DashboardHome) return;

  function getDocumentsApi() {
    return global.SupabaseDocuments;
  }

  function escapeHtml(value) {
    return global.AppUtils?.escapeHtml ? global.AppUtils.escapeHtml(value) : String(value ?? "");
  }

  function getKelasParts(kelasValue = "") {
    return global.AppUtils?.parseKelas ? global.AppUtils.parseKelas(kelasValue) : { tingkat: "", rombel: "", kelas: String(kelasValue || "") };
  }

  function getSiswaKelasBayanganParts(siswa) {
    return global.AppUtils?.getPrimaryKelasParts ? global.AppUtils.getPrimaryKelasParts(siswa) : getKelasParts(siswa.kelas);
  }

  function getJenisKelamin(siswa) {
    const raw = String(siswa.jenis_kelamin || siswa.jk || siswa.gender || siswa.kelamin || "").trim().toLowerCase();
    if (["l", "lk", "laki", "laki-laki", "laki laki", "1"].includes(raw)) return "L";
    if (["p", "pr", "perempuan", "2"].includes(raw)) return "P";
    return "";
  }

  function getMapelName(mapelList, mapelKode) {
    const target = String(mapelKode || "").trim().toUpperCase();
    const mapel = mapelList.find(item => String(item.kode_mapel || item.id || "").trim().toUpperCase() === target);
    return mapel?.nama_mapel || mapel?.kode_mapel || mapelKode || "-";
  }

  function getMapelJp(mapelList, mapelKode) {
    const target = String(mapelKode || "").trim().toUpperCase();
    const mapel = mapelList.find(item => String(item.kode_mapel || item.id || "").trim().toUpperCase() === target);
    return Number(mapel?.jp || 0);
  }

  function formatGuruName(guru, fallbackUser = {}) {
    if (guru && typeof global.formatNamaGuru === "function") return global.formatNamaGuru(guru);
    return guru?.nama || fallbackUser.nama || fallbackUser.guru_nama || fallbackUser.username || "Guru";
  }

  function getTugasNames(assignment, tugasList) {
    const slots = [
      ["utama_id", "utama_nama"],
      ["ekuivalen_1_id", "ekuivalen_1_nama"],
      ["ekuivalen_2_id", "ekuivalen_2_nama"],
      ["ekuivalen_3_id", "ekuivalen_3_nama"],
      ["sekolah_1_id", "sekolah_1_nama"],
      ["sekolah_2_id", "sekolah_2_nama"],
      ["sekolah_3_id", "sekolah_3_nama"]
    ];
    return slots.map(([idField, nameField]) => {
      const id = assignment?.[idField] || "";
      const tugas = tugasList.find(item => item.id === id);
      return assignment?.[nameField] || tugas?.nama || "";
    }).filter(Boolean);
  }

  function isPresenceOnline(record = {}, thresholdMs = 180000) {
    if (typeof global.DashboardShell?.isUserOnline === "function") {
      return global.DashboardShell.isUserOnline(record, thresholdMs);
    }
    const raw = record?.last_seen_at || record?.updated_at || record?.created_at || "";
    const seenAt = raw ? new Date(raw).getTime() : 0;
    if (!seenAt) return Boolean(record?.online);
    return Boolean(record?.online) && Date.now() - seenAt <= Number(thresholdMs || 180000);
  }

  function formatPresenceAge(value) {
    const seenAt = value ? new Date(value).getTime() : 0;
    if (!seenAt) return "Belum terdeteksi";
    const diff = Math.max(0, Date.now() - seenAt);
    if (diff < 60000) return "Baru saja";
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes} menit lalu`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} jam lalu`;
    const days = Math.floor(hours / 24);
    return `${days} hari lalu`;
  }

  function getPresenceUserLabel(record = {}) {
    return record?.nama || record?.username || record?.kode_guru || "User";
  }

  async function loadRecentPresenceRows(limit = 25) {
    if (global.DashboardHomeData?.loadPresenceRows) {
      return global.DashboardHomeData.loadPresenceRows(limit);
    }
    const documentsApi = getDocumentsApi();
    if (documentsApi?.client?.from && documentsApi.table) {
      const { data, error } = await documentsApi.client
        .from(documentsApi.table)
        .select("id,data,updated_at")
        .eq("collection_path", "user_presence")
        .order("updated_at", { ascending: false })
        .limit(limit);

      if (!error) {
        return (data || []).map(row => ({ id: row.id, ...row.data }));
      }
    }

    const snapshot = await documentsApi.collection("user_presence").orderBy("last_seen_at", "desc").limit(limit).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  function renderMainHome() {
    return `
      <section class="dashboard-hero">
        <div class="dashboard-hero-copy">
          <span class="dashboard-eyebrow">Ringkasan Data</span>
          <h2>Guru, siswa, rombel, mapel, dan pembagian mengajar dalam satu pantauan.</h2>
          <p id="homeUpdatedAt">Memuat data terbaru...</p>
          <div class="dashboard-hero-actions">
            <button class="btn-secondary" onclick="loadPage('mengajar')">Buka Pembagian</button>
            <button class="btn-secondary" onclick="loadPage('tugas-tambahan')">Buka Tugas Tambahan</button>
            <button class="btn-secondary" onclick="loadPage('guru-lihat')">Buka Data Guru</button>
          </div>
        </div>
        <div class="dashboard-hero-panel">
          <div class="dashboard-stat"><span>Jumlah Guru</span><strong id="homeGuruCount">...</strong></div>
          <div class="dashboard-stat"><span>Jumlah Rombel</span><strong id="homeKelasCount">...</strong></div>
          <div class="dashboard-stat"><span>Total Siswa</span><strong id="homeSiswaCount">...</strong></div>
        </div>
      </section>
      <section class="dashboard-card-lite dashboard-online-card">
        <span class="dashboard-card-label">User Online</span>
        <h3 id="homeOnlineCount">0 user</h3>
        <div id="homeOnlineList" class="dashboard-mini-list"><span>Memuat user online...</span></div>
      </section>
      <section class="dashboard-grid">
        <article class="dashboard-card-lite"><span class="dashboard-card-label">Pembelajaran</span><h3 id="homeMapelCount">0 mapel</h3><p id="homeMengajarCount">0 pembagian mengajar tersimpan</p></article>
        <article class="dashboard-card-lite"><span class="dashboard-card-label">Kelas</span><h3 id="homeWaliCount">0 wali kelas</h3><p id="homeKelasBayanganInfo">Kelas real belum dihitung</p></article>
        <article class="dashboard-card-lite"><span class="dashboard-card-label">Tugas Tambahan</span><h3 id="homeTugasTambahanCount">0 tugas</h3><p id="homeTugasTambahanInfo">Tugas tambahan terdaftar</p></article>
        <article class="dashboard-card-lite"><span class="dashboard-card-label">Sebaran Siswa</span><div id="homeSiswaByLevel" class="dashboard-mini-list"><span>Memuat sebaran siswa...</span></div></article>
      </section>
    `;
  }

  function renderGuruHome() {
    return `
      <section class="dashboard-hero">
        <div class="dashboard-hero-copy">
          <span class="dashboard-eyebrow">Ringkasan Guru</span>
          <h2 id="guruHomeName">Memuat data guru...</h2>
          <p id="guruHomeUpdatedAt">Memuat tugas mengajar, tugas tambahan, dan kelas wali.</p>
          <div class="dashboard-hero-actions">
            <button class="btn-secondary" onclick="loadPage('nilai-input-guru')">Input Nilai</button>
            <button class="btn-secondary" onclick="loadPage('wali-kehadiran')">Kehadiran Siswa</button>
            <button class="btn-secondary" onclick="loadPage('wali-kelengkapan')">Kelengkapan Nilai</button>
          </div>
        </div>
        <div class="dashboard-hero-panel">
          <div class="dashboard-stat"><span>Tugas Mengajar</span><strong id="guruHomeMengajarCount">...</strong></div>
          <div class="dashboard-stat"><span>Tugas Tambahan</span><strong id="guruHomeTugasCount">...</strong></div>
          <div class="dashboard-stat"><span>Kelas Wali</span><strong id="guruHomeWaliKelas">...</strong></div>
        </div>
      </section>
      <section class="dashboard-grid">
        <article class="dashboard-card-lite home-teaching-panel">
          <div class="home-panel-head">
            <div>
              <span class="dashboard-card-label">Tugas Mengajar</span>
              <h3 id="guruHomeMengajarCountLabel">Memuat tugas mengajar...</h3>
            </div>
            <div class="home-panel-note">Kelas Real dan JP Real diambil dari kelas bayangan.</div>
          </div>
          <div id="guruHomeMengajarTable" class="table-container home-teaching-table-wrap"><div class="empty-panel">Memuat tugas mengajar...</div></div>
        </article>
        <article class="dashboard-card-lite"><span class="dashboard-card-label">Tugas Tambahan</span><h3 id="guruHomeTugasCardCount">0 tugas</h3><div id="guruHomeTugasList" class="dashboard-mini-list"><span>Memuat tugas tambahan...</span></div></article>
        <article class="dashboard-card-lite"><span class="dashboard-card-label">Informasi Wali Kelas</span><h3 id="guruHomeWaliSummary">Bukan wali kelas</h3><div id="guruHomeWaliInfo" class="dashboard-mini-list"><span>Data wali kelas akan tampil jika tersedia.</span></div></article>
        <article class="dashboard-card-lite"><span class="dashboard-card-label">Akses Cepat</span><div class="dashboard-mini-list"><span><strong>Nilai</strong><b>UH1, UH2, UH3, PTS</b></span><span><strong>Kehadiran</strong><b>S, I, A</b></span><span><strong>Kelengkapan</strong><b>per mapel</b></span></div></article>
      </section>
    `;
  }

  function renderKoordinatorHome(levels = []) {
    return `
      <section class="dashboard-hero">
        <div class="dashboard-hero-copy">
          <span class="dashboard-eyebrow">Koordinator</span>
          <h2>Area kerja jenjang ${escapeHtml(levels.length ? levels.join(", ") : "-")}.</h2>
          <p>Akses dibatasi ke data siswa, nilai, wali kelas, dan kelas real sesuai jenjang yang Anda koordinasi serta kelas yang Anda pegang sebagai wali kelas.</p>
          <div class="dashboard-hero-actions">
            <button class="btn-secondary" onclick="loadPage('lihat')">Data Siswa</button>
            <button class="btn-secondary" onclick="loadPage('nilai-input')">Nilai</button>
            <button class="btn-secondary" onclick="loadPage('wali-kelengkapan')">Wali Kelas</button>
          </div>
        </div>
        <div class="dashboard-hero-panel">
          <div class="dashboard-stat"><span>Jenjang Aktif</span><strong>${escapeHtml(levels.length ? levels.join(", ") : "-")}</strong></div>
          <div class="dashboard-stat"><span>Kelas Real</span><strong>Tersedia</strong></div>
          <div class="dashboard-stat"><span>Status Akses</span><strong>Koordinator</strong></div>
        </div>
      </section>
    `;
  }

  function renderRekapNilaiPlaceholder(levels = []) {
    return `
      <div class="card">
        <div class="kelas-bayangan-head nilai-page-head">
          <div>
            <span class="dashboard-eyebrow">Nilai</span>
            <h2>Rekap Nilai</h2>
            <p>Halaman ini sedang disiapkan${levels.length ? ` untuk jenjang ${escapeHtml(levels.join(", "))}` : ""}.</p>
          </div>
        </div>
        <div class="empty-panel">Menu rekap nilai masih dikosongkan dulu sesuai permintaan.</div>
      </div>
    `;
  }

  function renderGuruHomePage(options = {}) {
    if (options.pageTitle) options.pageTitle.innerText = "Beranda Guru";
    if (options.content) options.content.innerHTML = renderGuruHome();
    options.loadGuruHomeStats?.();
  }

  function renderKoordinatorHomePage(options = {}) {
    const levels = typeof options.getCoordinatorLevels === "function" ? options.getCoordinatorLevels() : [];
    if (options.pageTitle) options.pageTitle.innerText = "Beranda Koordinator";
    if (options.content) options.content.innerHTML = renderKoordinatorHome(levels);
  }

  function renderHomePage(options = {}) {
    const role = String(options.role || "");
    const hasCoordinatorAccess = typeof options.hasCoordinatorAccess === "function"
      ? options.hasCoordinatorAccess()
      : Boolean(options.hasCoordinatorAccess);

    if (options.pageTitle) options.pageTitle.innerText = "Beranda Dashboard";

    if (role === "guru" && !hasCoordinatorAccess) {
      renderGuruHomePage(options);
      return "guru";
    }

    if ((role === "guru" && hasCoordinatorAccess) || role === "koordinator") {
      renderKoordinatorHomePage(options);
      return "koordinator";
    }

    if (options.content) options.content.innerHTML = renderMainHome();
    options.loadHomeStats?.();
    return "dashboard";
  }

  async function loadHomeStats(options = {}) {
    const setText = (id, value) => global.AppDom?.setText?.(id, value);
    try {
      const documentsApi = getDocumentsApi();
      const [guruSnap, siswaSnap, kelasSnap, mapelAsliSnap, mengajarAsliSnap, mapelSnap, mengajarSnap, tugasSnap, presenceRows] = await Promise.all([
        documentsApi.collection("guru").get(),
        options.getCollectionQuery("siswa").get(),
        options.getCollectionQuery("kelas").get(),
        documentsApi.collection("mapel").get(),
        documentsApi.collection("mengajar").get(),
        documentsApi.collection("tugas_tambahan").get(),
        loadRecentPresenceRows(25)
      ]);
      const guru = guruSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const siswa = siswaSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const kelas = kelasSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const mapelAsli = mapelAsliSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const mengajarAsli = mengajarAsliSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const mapel = mapelSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const mengajar = mengajarSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const tugas = tugasSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const siswaByLevel = { 7: 0, 8: 0, 9: 0, lain: 0 };
      siswa.forEach(item => {
        const level = getKelasParts(item.kelas).tingkat;
        if (siswaByLevel[level] !== undefined) siswaByLevel[level] += 1;
        else siswaByLevel.lain += 1;
      });

      const roleAssignmentsAsli = getHomeVisibleAssignments(options, { mengajarBayangan: mengajarAsli, kelas });
      const teachingRows = buildTeachingComparisonRows(roleAssignmentsAsli, mapelAsli, getHomeVisibleAssignments(options, { mengajarBayangan: mengajar, kelas }), mapel);
      const waliCount = kelas.filter(item => String(item.kode_guru || "").trim() || String(item.wali_kelas || "").trim()).length;
      const kelasBayanganCount = siswa.filter(item => String(item.kelas_bayangan || "").trim()).length;
      const onlineUsers = presenceRows
        .filter(item => isPresenceOnline(item))
        .sort((a, b) => new Date(b.last_seen_at || 0).getTime() - new Date(a.last_seen_at || 0).getTime())
        .slice(0, 10);

      setText("homeGuruCount", `${guru.length}`);
      setText("homeKelasCount", `${kelas.length}`);
      setText("homeSiswaCount", `${siswa.length}`);
      setText("homeMapelCount", `${mapel.length} mapel`);
      setText("homeMengajarCount", `${mengajar.length} pembagian mengajar tersimpan`);
      setText("homeWaliCount", `${waliCount}/${kelas.length} wali kelas`);
      setText("homeKelasBayanganInfo", `${kelasBayanganCount} siswa memiliki kelas real manual`);
      setText("homeTugasTambahanCount", `${tugas.length} tugas`);
      setText("homeTugasTambahanInfo", `${tugas.length} tugas tambahan terdaftar`);
      setText("homeOnlineCount", `${onlineUsers.length} user online`);
      setText("homeUpdatedAt", `Data dimuat ${global.AppUtils?.formatDateTimeId ? global.AppUtils.formatDateTimeId(new Date()) : new Date().toLocaleString("id-ID")}`);
      if (options.role === "guru" || options.role === "koordinator" || options.role === "guruadmin" || options.role === "superadmin") {
        const teachingTitle = document.getElementById("homeTeachingTitle");
        const teachingTable = document.getElementById("homeTeachingTable");
        if (teachingTitle && teachingTable) {
          teachingTitle.innerText = `${teachingRows.length} mapel diajar`;
          teachingTable.innerHTML = renderTeachingTable(teachingRows, "Belum ada tugas mengajar yang bisa ditampilkan.");
        }
      }
      global.AppDom?.setHtml?.("homeSiswaByLevel", `
        <span><strong>Kelas 7</strong><b>${siswaByLevel[7]} siswa</b></span>
        <span><strong>Kelas 8</strong><b>${siswaByLevel[8]} siswa</b></span>
        <span><strong>Kelas 9</strong><b>${siswaByLevel[9]} siswa</b></span>
        <span><strong>Belum valid</strong><b>${siswaByLevel.lain} siswa</b></span>
      `);
      global.AppDom?.setHtml?.("homeOnlineList", onlineUsers.length
        ? onlineUsers.map(item => `
            <span class="dashboard-online-chip">
              <strong>${escapeHtml(getPresenceUserLabel(item))}</strong>
              <b>${escapeHtml(String(item.role || item.kode_guru || "-"))} - ${escapeHtml(formatPresenceAge(item.last_seen_at))}</b>
            </span>
          `).join("")
        : "<span>Belum ada user yang sedang online.</span>");
    } catch (error) {
      console.error(error);
      setText("homeUpdatedAt", "Ringkasan belum berhasil dimuat.");
    }
  }

  async function loadGuruHomeStats(options = {}) {
    const user = options.getCurrentUser ? options.getCurrentUser() : {};
    const kodeGuru = String(user.kode_guru || "").trim();
    const setText = (id, value) => global.AppDom?.setText?.(id, value);
    if (!kodeGuru) {
      setText("guruHomeName", user.nama || user.username || "Guru");
      setText("guruHomeUpdatedAt", "Kode guru belum tersambung ke akun ini.");
      return;
    }

    try {
      const documentsApi = getDocumentsApi();
      const [guruSnap, siswaSnap, kelasSnap, mapelAsliSnap, mengajarAsliSnap, mapelSnap, mengajarSnap, tugasSnap, tugasGuruSnap] = await Promise.all([
        documentsApi.collection("guru").get(),
        options.getCollectionQuery("siswa").get(),
        options.getCollectionQuery("kelas").get(),
        documentsApi.collection("mapel").get(),
        documentsApi.collection("mengajar").get(),
        documentsApi.collection("mapel_bayangan").get(),
        documentsApi.collection("mengajar_bayangan").get(),
        documentsApi.collection("tugas_tambahan").get(),
        documentsApi.collection("guru_tugas_tambahan").doc(kodeGuru).get()
      ]);
      const guruList = guruSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const siswa = siswaSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const kelas = kelasSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const mapelAsli = mapelAsliSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const mengajarAsli = mengajarAsliSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const mapel = mapelSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const mengajar = mengajarSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const tugas = tugasSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const tugasGuru = tugasGuruSnap.exists ? { id: tugasGuruSnap.id, ...tugasGuruSnap.data() } : {};
      const guru = guruList.find(item => String(item.kode_guru || "").trim() === kodeGuru) || {};
      const myAssignments = mengajarAsli.filter(item => String(item.guru_kode || "").trim() === kodeGuru);
      const myAssignmentsBayangan = mengajar.filter(item => String(item.guru_kode || "").trim() === kodeGuru);
      const tugasNames = getTugasNames(tugasGuru, tugas);
      const waliRows = kelas.filter(item => String(item.kode_guru || "").trim() === kodeGuru);
      const teachingRows = buildTeachingComparisonRows(myAssignments, mapelAsli, myAssignmentsBayangan, mapel);

      setText("guruHomeName", formatGuruName(guru, user));
      setText("guruHomeMengajarCountLabel", `${teachingRows.length} mapel diajar`);
      setText("guruHomeMengajarCount", `${myAssignments.length} kelas-mapel`);
      setText("guruHomeTugasCount", `${tugasNames.length} tugas`);
      setText("guruHomeTugasCardCount", `${tugasNames.length} tugas`);
      setText("guruHomeWaliKelas", waliRows.length ? waliRows.map(item => getKelasParts(item.kelas || `${item.tingkat || ""}${item.rombel || ""}`).kelas).join(", ") : "-");
      setText("guruHomeUpdatedAt", `Data dimuat ${global.AppUtils?.formatDateTimeId ? global.AppUtils.formatDateTimeId(new Date()) : new Date().toLocaleString("id-ID")}`);

      global.AppDom?.setHtml?.("guruHomeMengajarTable", renderTeachingTable(teachingRows, "Belum ada tugas mengajar kelas real."));
      global.AppDom?.setHtml?.("guruHomeTugasList", tugasNames.length
        ? tugasNames.map(name => `<span><strong>${escapeHtml(name)}</strong><b>aktif</b></span>`).join("")
        : "<span>Belum ada tugas tambahan.</span>");

      const waliSummary = document.getElementById("guruHomeWaliSummary");
      const waliInfo = document.getElementById("guruHomeWaliInfo");
      if (waliRows.length && waliSummary && waliInfo) {
        const waliKelas = getKelasParts(waliRows[0].kelas || `${waliRows[0].tingkat || ""}${waliRows[0].rombel || ""}`).kelas;
        const waliStudents = siswa
          .map(item => ({ ...item, kelasBayanganParts: getSiswaKelasBayanganParts(item) }))
          .filter(item => item.kelasBayanganParts.kelas === waliKelas);
        const genderCounts = waliStudents.reduce((result, item) => {
          const gender = getJenisKelamin(item);
          if (gender === "L") result.L += 1;
          else if (gender === "P") result.P += 1;
          else result.lain += 1;
          return result;
        }, { L: 0, P: 0, lain: 0 });
        waliSummary.innerText = `Kelas ${waliKelas}`;
        waliInfo.innerHTML = `
          <span><strong>Jumlah siswa</strong><b>${waliStudents.length}</b></span>
          <span><strong>Laki-laki</strong><b>${genderCounts.L}</b></span>
          <span><strong>Perempuan</strong><b>${genderCounts.P}</b></span>
          <span><strong>Belum valid</strong><b>${genderCounts.lain}</b></span>
        `;
      }
    } catch (error) {
      console.error(error);
      setText("guruHomeUpdatedAt", "Ringkasan guru belum berhasil dimuat.");
    }
  }

  function getHomeCurrentUser(options = {}) {
    if (typeof options.getCurrentUser === "function") return options.getCurrentUser() || {};
    return global.DashboardShell?.getCurrentAppUser?.() || {};
  }

  function getHomeRoleContext(options = {}) {
    const user = getHomeCurrentUser(options);
    const role = String(options.role || user.role || "admin").trim().toLowerCase();
    const hasCoordinatorAccess = typeof options.hasCoordinatorAccess === "function"
      ? options.hasCoordinatorAccess()
      : Boolean(options.hasCoordinatorAccess);
    const coordinatorLevels = typeof options.getCoordinatorLevels === "function"
      ? options.getCoordinatorLevels()
      : (global.DashboardShell?.getCurrentCoordinatorLevelsSync?.() || []);
    const kodeGuru = String(user.kode_guru || "").trim();
    const isAdmin = ["admin", "superadmin"].includes(role);
    const isGuru = role === "guru";
    const isKoordinator = role === "koordinator" || (isGuru && hasCoordinatorAccess);
    const isGuruAdmin = isAdmin && Boolean(kodeGuru);
    const label = isAdmin
      ? (isGuruAdmin ? "Admin + Guru" : role === "superadmin" ? "Superadmin" : "Admin")
      : isKoordinator
        ? "Guru + Koordinator"
        : isGuru
          ? "Guru"
          : role === "urusan"
            ? "Urusan"
            : "Dashboard";
    return { user, role, hasCoordinatorAccess, coordinatorLevels, kodeGuru, isAdmin, isGuru, isKoordinator, isGuruAdmin, label };
  }

  function normalizeHomeIdentity(value = "") {
    if (global.AdminUsersIdentity?.makeUserDocId) {
      return global.AdminUsersIdentity.makeUserDocId(value);
    }
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[^a-z0-9._-]/g, "");
  }

  function getHomeGuruByKode(guruList = [], kodeGuru = "") {
    return guruList.find(item => String(item?.kode_guru || "").trim() === String(kodeGuru || "").trim()) || null;
  }

  function resolveHomeGuruFromUser(user = {}, guruList = []) {
    const kodeGuru = String(user?.kode_guru || "").trim();
    if (kodeGuru) return getHomeGuruByKode(guruList, kodeGuru);

    if (global.AdminUsersIdentity?.getGuruForAdminUser) {
      const matched = global.AdminUsersIdentity.getGuruForAdminUser(user, guruList, value => getHomeGuruByKode(guruList, value));
      if (matched) return matched;
    }

    const userAliases = [
      user?.username,
      user?.id,
      user?.nama
    ]
      .map(value => normalizeHomeIdentity(value))
      .filter(Boolean);

    if (!userAliases.length) return null;

    return guruList.find(guru => {
      const guruAliases = [
        guru?.kode_guru,
        guru?.nip,
        global.AdminUsersIdentity?.makeGuruUsername ? global.AdminUsersIdentity.makeGuruUsername(guru) : "",
        global.AdminUsersIdentity?.getGuruName ? global.AdminUsersIdentity.getGuruName(guru) : guru?.nama,
        global.AdminUsersIdentity?.getGuruUsernameName ? global.AdminUsersIdentity.getGuruUsernameName(guru) : guru?.nama
      ]
        .map(value => normalizeHomeIdentity(value))
        .filter(Boolean);

      return guruAliases.some(alias => userAliases.includes(alias));
    }) || null;
  }

  function getHomeResolvedContext(context = {}, guruList = []) {
    if (context.kodeGuru || !Boolean(context.isAdmin || context.role === "superadmin")) return context;
    const matchedGuru = resolveHomeGuruFromUser(context.user, guruList);
    if (!matchedGuru?.kode_guru) return context;
    return {
      ...context,
      kodeGuru: String(matchedGuru.kode_guru || "").trim(),
      resolvedGuruNama: formatGuruName(matchedGuru, context.user),
      isGuruAdmin: true
    };
  }

  function getHomeInputScopeContext(context = {}) {
    const shouldUseGuruScope = Boolean(context.kodeGuru) && (context.isAdmin || context.role === "superadmin");
    if (!shouldUseGuruScope) return context;
    const coordinatorLevels = Array.isArray(context.coordinatorLevels) ? context.coordinatorLevels : [];
    const hasCoordinatorAccess = coordinatorLevels.length > 0;
    return {
      ...context,
      isAdmin: false,
      isGuru: true,
      isKoordinator: hasCoordinatorAccess,
      hasCoordinatorAccess,
      isGuruAdmin: false,
      inputScopeLabel: hasCoordinatorAccess ? "Guru + Koordinator" : "Guru"
    };
  }

  function getHomeHeroTitle(context) {
    if (context.isGuruAdmin) return "Pantau data sekolah sekaligus workflow guru.";
    if (context.isAdmin) return "Pantau rangkuman input dan status data sekolah.";
    if (context.isKoordinator) return `Pantau input lintas jenjang ${context.coordinatorLevels.length ? context.coordinatorLevels.join(", ") : "-"}.`;
    if (context.isGuru) return "Pantau kelas yang Anda ajar dan catatan yang masih perlu dilengkapi.";
    return "Pantau data sekolah dari satu layar.";
  }

  function getHomeHeroDescription(context) {
    if (context.isGuruAdmin) return "Beranda menampilkan rangkuman input, data sekolah, dan pintasan guru dalam satu layar.";
    if (context.isAdmin) return "Beranda menampilkan rangkuman input, user online, dan sebaran data yang sedang berjalan.";
    if (context.isKoordinator) return "Beranda menampilkan input yang bisa Anda jangkau, kelas wali, dan akses cepat ke data jenjang.";
    if (context.isGuru) return "Beranda menampilkan kelas mapel yang Anda ajar, status input, dan ringkasan wali kelas bila ada.";
    return "Beranda menampilkan rangkuman data yang paling relevan untuk akun aktif.";
  }

  function getHomeQuickActions(context) {
    if (context.isGuruAdmin) {
      return `
        <button class="btn-secondary" onclick="loadPage('admin-user')">Admin User</button>
        <button class="btn-secondary" onclick="loadPage('nilai-input-guru')">Input Nilai</button>
        <button class="btn-secondary" onclick="loadPage('wali-kelengkapan')">Wali Kelas</button>
      `;
    }
    if (context.isAdmin) {
      return `
        <button class="btn-secondary" onclick="loadPage('admin-user')">Admin User</button>
        <button class="btn-secondary" onclick="loadPage('kelas')">Data Kelas</button>
        <button class="btn-secondary" onclick="loadPage('rekap-nilai')">Rekap Nilai</button>
      `;
    }
    if (context.isKoordinator) {
      return `
        <button class="btn-secondary" onclick="loadPage('lihat')">Data Siswa</button>
        <button class="btn-secondary" onclick="loadPage('nilai-input')">Input Nilai</button>
        <button class="btn-secondary" onclick="loadPage('wali-kelengkapan')">Wali Kelas</button>
      `;
    }
    if (context.isGuru) {
      return `
        <button class="btn-secondary" onclick="loadPage('nilai-input-guru')">Input Nilai</button>
        <button class="btn-secondary" onclick="loadPage('wali-rekap-nilai')">Rekap Nilai Wali</button>
        <button class="btn-secondary" onclick="loadPage('wali-kehadiran')">Kehadiran Siswa</button>
        <button class="btn-secondary" onclick="loadPage('wali-kelengkapan')">Kelengkapan Nilai</button>
      `;
    }
    return `
      <button class="btn-secondary" onclick="loadPage('mengajar')">Buka Pembagian</button>
      <button class="btn-secondary" onclick="loadPage('tugas-tambahan')">Buka Tugas Tambahan</button>
      <button class="btn-secondary" onclick="loadPage('guru-lihat')">Buka Data Guru</button>
    `;
  }

  function getHomeSummaryStatLabel(context, index) {
    if (context.isGuruAdmin) return ["Guru", "Kelas", "User Online"][index] || "";
    if (context.isAdmin) return ["Guru", "Kelas", "User Online"][index] || "";
    if (context.isKoordinator) return ["Jenjang", "Kelas Wali", "Siswa"][index] || "";
    if (context.isGuru) return ["Kelas Mapel", "Tugas Tambahan", "Kelas Wali"][index] || "";
    return ["Guru", "Kelas", "Siswa"][index] || "";
  }

  function getHomeRoleCards(context) {
    if (context.isAdmin) {
      return [];
    }
    if (context.isGuruAdmin) {
      return [
        { label: "User Online" },
        { label: "Sebaran Data" },
        { label: "Akses Guru" }
      ];
    }
    if (context.isKoordinator) {
      return [
        { label: "Jangkauan Koordinator" },
        { label: "Kelas Wali" },
        { label: "Akses Cepat" }
      ];
    }
    return [
      { label: "Tugas Mengajar" },
      { label: "Wali Kelas" },
      { label: "Tugas Tambahan" }
    ];
  }

  function getHomeAssignmentKey(assignment = {}) {
    return [
      String(assignment.tingkat || "").trim(),
      String(assignment.rombel || "").trim().toUpperCase(),
      String(assignment.mapel_kode || "").trim().toUpperCase(),
      String(assignment.guru_kode || "").trim()
    ].join("|");
  }

  function getHomeAssignmentClassKey(assignment = {}) {
    const tingkat = String(assignment.tingkat || "").trim();
    const rombel = String(assignment.rombel || "").trim().toUpperCase();
    return getKelasParts(`${tingkat}${rombel}`).kelas;
  }

  function isHomeNilaiDocMatchingAssignment(item = {}, assignment = {}) {
    if (typeof global.isActiveTermDoc === "function" && !global.isActiveTermDoc(item)) return false;
    const assignmentKey = getHomeAssignmentKey(assignment);
    const itemKey = getHomeAssignmentKey(item);
    if (assignmentKey === itemKey) return true;
    const itemClass = getKelasParts(item.kelas || `${item.tingkat || ""}${item.rombel || ""}`).kelas;
    const assignmentClass = getHomeAssignmentClassKey(assignment);
    return itemClass === assignmentClass
      && String(item.mapel_kode || "").trim().toUpperCase() === String(assignment.mapel_kode || "").trim().toUpperCase();
  }

  function getHomeNilaiDocTimestamp(item) {
    const updatedAt = item?.updated_at || item?.data?.updated_at || "";
    const parsed = Date.parse(updatedAt);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function getHomeStudentsForAssignment(assignment = {}, siswaList = [], mapelList = []) {
    const mapel = mapelList.find(item => String(item.kode_mapel || item.id || "").trim().toUpperCase() === String(assignment.mapel_kode || "").trim().toUpperCase());
    return siswaList
      .map(siswa => ({ ...siswa, kelasBayanganParts: getSiswaKelasBayanganParts(siswa) }))
      .filter(siswa => {
        if (siswa.kelasBayanganParts.tingkat !== String(assignment.tingkat || "")) return false;
        if (siswa.kelasBayanganParts.rombel !== String(assignment.rombel || "").toUpperCase()) return false;
        if (typeof global.isNilaiSiswaEligibleForMapel === "function") {
          return global.isNilaiSiswaEligibleForMapel(siswa, mapel);
        }
        return true;
      })
      .sort((a, b) => {
        if (global.AppUtils?.compareStudentPlacement) return global.AppUtils.compareStudentPlacement(a, b);
        return String(a.nama || "").localeCompare(String(b.nama || ""), undefined, { sensitivity: "base" });
      });
  }

  function getHomeVisibleAssignments(context, data = {}) {
    const assignments = (data.mengajarBayangan || [])
      .filter(item => String(item.mapel_kode || "").trim() && String(item.guru_kode || "").trim() && String(item.tingkat || "").trim() && String(item.rombel || "").trim());
    if (context.isAdmin || context.role === "superadmin") return assignments;

    const kodeGuru = context.kodeGuru;
    const coordinatorLevels = new Set((context.coordinatorLevels || []).map(level => String(level || "").trim()).filter(Boolean));
    const waliClassSet = new Set(
      (data.kelas || [])
        .filter(item => String(item.kode_guru || "").trim() === kodeGuru)
        .map(item => getKelasParts(item.kelas || `${item.tingkat || ""}${item.rombel || ""}`).kelas)
        .filter(Boolean)
    );
    const ownAssignments = assignments.filter(item => String(item.guru_kode || "").trim() === kodeGuru);
    const coordinatorAssignments = assignments.filter(item => coordinatorLevels.has(String(item.tingkat || "").trim()) || waliClassSet.has(getHomeAssignmentClassKey(item)));
    const byKey = new Map();
    if (context.isGuru && context.hasCoordinatorAccess) {
      [...ownAssignments, ...coordinatorAssignments].forEach(item => byKey.set(getHomeAssignmentKey(item), item));
      return [...byKey.values()];
    }
    if (context.isKoordinator) return coordinatorAssignments;
    if (context.isGuru) return ownAssignments;
    if (context.role === "urusan") return assignments;
    return [];
  }

  function getHomeSummaryRows(context, data = {}) {
    const assignments = getHomeVisibleAssignments(context, data);
    const limit = context.isAdmin || context.isGuruAdmin ? 10 : 8;
    const rows = assignments.map(assignment => {
      const students = getHomeStudentsForAssignment(assignment, data.siswa || [], data.mapelBayangan || []);
      const total = students.length;
      const nilaiBucket = new Map();
      (data.nilai || []).forEach(item => {
        if (!isHomeNilaiDocMatchingAssignment(item, assignment)) return;
        const nipd = String(item.nipd || "").trim();
        if (!nipd) return;
        const current = nilaiBucket.get(nipd);
        if (!current || getHomeNilaiDocTimestamp(item) >= getHomeNilaiDocTimestamp(current)) {
          nilaiBucket.set(nipd, item);
        }
      });

      const fields = [
        { key: "uh_1", label: "UH 1", fallback: "nilai" },
        { key: "uh_2", label: "UH 2" },
        { key: "uh_3", label: "UH 3" },
        { key: "pts", label: "PTS I" }
      ].map(field => {
        const filled = students.reduce((count, student) => {
          const nilaiDoc = nilaiBucket.get(String(student.nipd || "").trim());
          const value = field.fallback === "nilai"
            ? (nilaiDoc?.uh_1 ?? nilaiDoc?.nilai ?? "")
            : (nilaiDoc?.[field.key] ?? "");
          return count + (String(value || "").trim() ? 1 : 0);
        }, 0);
        const value = total === 0 || filled === 0 ? "" : `${filled}`;
        const status = total === 0 || filled === 0 ? "empty" : filled === total ? "full" : "partial";
        return { ...field, value, status };
      });

      const urgency = fields.reduce((score, field) => {
        if (field.status === "empty") return score + 2;
        if (field.status === "partial") return score + 1;
        return score;
      }, 0);

      const mapel = data.mapelBayangan?.find(item => String(item.kode_mapel || item.id || "").trim().toUpperCase() === String(assignment.mapel_kode || "").trim().toUpperCase());
      return {
        label: `${assignment.tingkat} ${String(assignment.rombel || "").toUpperCase()} - ${mapel?.kode_mapel || assignment.mapel_kode || "-"}`,
        total,
        fields,
        urgency
      };
    });

    return rows
      .sort((a, b) => b.urgency - a.urgency || a.label.localeCompare(b.label, undefined, { numeric: true, sensitivity: "base" }))
      .slice(0, limit);
  }

  function compactKelasList(values = []) {
    const grouped = new Map();
    values.forEach(value => {
      const parts = getKelasParts(value);
      if (!parts.tingkat || !parts.rombel) return;
      if (!grouped.has(parts.tingkat)) grouped.set(parts.tingkat, new Set());
      grouped.get(parts.tingkat).add(parts.rombel);
    });

    return [...grouped.keys()]
      .sort((a, b) => Number(a) - Number(b))
      .map(level => {
        const rombels = [...grouped.get(level)]
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
        if (!rombels.length) return "";
        const segments = [];
        let start = rombels[0];
        let prev = rombels[0];
        const isSequential = (left, right) => left.length === 1
          && right.length === 1
          && left.charCodeAt(0) + 1 === right.charCodeAt(0);
        for (let index = 1; index < rombels.length; index += 1) {
          const current = rombels[index];
          if (isSequential(prev, current)) {
            prev = current;
            continue;
          }
          segments.push(start === prev ? `${level}${start}` : `${level}${start}-${level}${prev}`);
          start = current;
          prev = current;
        }
        segments.push(start === prev ? `${level}${start}` : `${level}${start}-${level}${prev}`);
        return segments.join(", ");
      })
      .filter(Boolean)
      .join(", ");
  }

  function buildTeachingRows(assignments = [], mapelList = []) {
    const groups = new Map();
    assignments.forEach(item => {
      const kode = String(item.mapel_kode || "").trim().toUpperCase();
      if (!kode) return;
      if (!groups.has(kode)) {
        groups.set(kode, {
          kode,
          nama: getMapelName(mapelList, kode),
          jp: getMapelJp(mapelList, kode),
          kelas: []
        });
      }
      groups.get(kode).kelas.push(`${item.tingkat || ""}${String(item.rombel || "").toUpperCase()}`);
    });

    return [...groups.values()]
      .sort((a, b) => a.nama.localeCompare(b.nama, undefined, { sensitivity: "base" }))
      .map(item => {
        const kelasCompact = compactKelasList(item.kelas);
        return {
          kode: item.kode,
          nama: item.nama,
          kelas: kelasCompact,
          kelasCount: item.kelas.length,
          jp: Number(item.jp || 0),
          totalJp: Number(item.jp || 0) * item.kelas.length
        };
      });
  }

  function buildTeachingComparisonRows(originalAssignments = [], originalMapel = [], realAssignments = [], realMapel = []) {
    const rows = new Map();
    buildTeachingRows(originalAssignments, originalMapel).forEach(item => {
      rows.set(item.kode, {
        kode: item.kode,
        nama: item.nama,
        kelas: item.kelas,
        jp: item.totalJp,
        kelasReal: "",
        jpReal: 0
      });
    });
    buildTeachingRows(realAssignments, realMapel).forEach(item => {
      const row = rows.get(item.kode) || {
        kode: item.kode,
        nama: item.nama,
        kelas: "",
        jp: 0,
        kelasReal: "",
        jpReal: 0
      };
      row.nama = row.nama || item.nama;
      row.kelasReal = item.kelas;
      row.jpReal = item.totalJp;
      rows.set(item.kode, row);
    });

    return [...rows.values()].sort((a, b) => a.nama.localeCompare(b.nama, undefined, { sensitivity: "base" }));
  }

  function renderTeachingTable(rows = [], emptyMessage = "Belum ada tugas mengajar yang bisa ditampilkan.") {
    if (!rows.length) return `<div class="empty-panel">${escapeHtml(emptyMessage)}</div>`;
    return `
      <div class="table-container home-teaching-table-wrap">
        <table class="mapel-table home-teaching-table">
          <thead>
            <tr>
              <th>Kode Mapel</th>
              <th>Kelas</th>
              <th>JP</th>
              <th>Kelas Real</th>
              <th>JP Real</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(row => `
              <tr>
                <td class="home-summary-label">
                  <strong>${escapeHtml(row.kode)}</strong>
                </td>
                <td>${escapeHtml(row.kelas || "-")}</td>
                <td>${escapeHtml(String(row.jp || 0))}</td>
                <td>${escapeHtml(row.kelasReal || "-")}</td>
                <td>${escapeHtml(String(row.jpReal || 0))}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderSummaryTable(rows = []) {
    if (!rows.length) return `<div class="empty-panel">Belum ada pembagian mengajar yang bisa ditampilkan.</div>`;
    return `
      <table class="mapel-table home-summary-table">
        <thead>
          <tr>
            <th>Kelas Mapel</th>
            <th>UH 1</th>
            <th>UH 2</th>
            <th>UH 3</th>
            <th>PTS I</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(row => `
            <tr>
              <td class="home-summary-label">
                <strong>${escapeHtml(row.label)}</strong>
                <small>${escapeHtml(`${row.total} siswa`)}</small>
              </td>
              ${row.fields.map(field => `<td class="home-summary-cell home-summary-cell--${field.status}">${escapeHtml(field.value)}</td>`).join("")}
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  }

  function renderHomePageShell(context) {
    const cards = getHomeRoleCards(context);
    return `
      <section class="dashboard-hero dashboard-home-hero">
        <div class="dashboard-hero-copy">
          <span class="dashboard-eyebrow">${escapeHtml(context.label)}</span>
          <h2>${escapeHtml(getHomeHeroTitle(context))}</h2>
          <p id="homeUpdatedAt">${escapeHtml(getHomeHeroDescription(context))}</p>
          <div class="dashboard-hero-actions">
            ${getHomeQuickActions(context)}
          </div>
        </div>
        <div class="dashboard-hero-panel home-hero-panel">
          <div class="dashboard-stat"><span>${escapeHtml(getHomeSummaryStatLabel(context, 0))}</span><strong id="homeHeroStat1">...</strong></div>
          <div class="dashboard-stat"><span>${escapeHtml(getHomeSummaryStatLabel(context, 1))}</span><strong id="homeHeroStat2">...</strong></div>
          <div class="dashboard-stat"><span>${escapeHtml(getHomeSummaryStatLabel(context, 2))}</span><strong id="homeHeroStat3">...</strong></div>
        </div>
      </section>
      <section class="dashboard-card-lite home-summary-panel">
        <div class="home-panel-head">
          <div>
            <span class="dashboard-card-label">Rangkuman Input</span>
            <h3 id="homeInputSummaryTitle">Ketuntasan pengisian nilai</h3>
          </div>
            <div id="homeInputSummaryNote" class="home-panel-note home-panel-legend">
              <span class="home-panel-legend-item"><span class="home-panel-legend-box home-panel-legend-box--empty"></span>kosong</span>
              <span class="home-panel-legend-item"><span class="home-panel-legend-box home-panel-legend-box--partial"></span>tidak lengkap</span>
              <span class="home-panel-legend-item"><span class="home-panel-legend-box home-panel-legend-box--full"></span>lengkap</span>
            </div>
        </div>
        <div id="homeInputSummaryTable" class="table-container home-summary-table-wrap">
          <div class="empty-panel">Memuat rangkuman input...</div>
        </div>
      </section>
      ${cards.length ? `
        <section class="dashboard-grid home-role-grid">
          ${cards.map((card, index) => `
            <article class="dashboard-card-lite home-role-card">
              <span class="dashboard-card-label">${escapeHtml(card.label)}</span>
              <h3 id="homeRoleCardTitle${index + 1}">Memuat...</h3>
              <div id="homeRoleCardList${index + 1}" class="dashboard-mini-list"><span>Memuat data...</span></div>
            </article>
          `).join("")}
        </section>
      ` : `
        <section class="dashboard-card-lite home-admin-clean-card">
          <span class="dashboard-card-label">Rangkuman Admin</span>
          <h3 id="homeAdminCleanTitle">Dashboard dibersihkan</h3>
          <p id="homeAdminCleanText">Beranda admin dan superadmin hanya menampilkan ringkasan utama dan rangkuman input.</p>
        </section>
      `}
      ${(context.isGuruAdmin || context.isKoordinator) ? `
        <section class="dashboard-card-lite home-teaching-panel">
          <div class="home-panel-head">
            <div>
              <span class="dashboard-card-label">Tugas Mengajar</span>
              <h3 id="homeTeachingTitle">Memuat tugas mengajar...</h3>
            </div>
            <div id="homeTeachingNote" class="home-panel-note">Kelas Real dan JP Real diambil dari kelas bayangan.</div>
          </div>
          <div id="homeTeachingTable" class="home-teaching-table-slot"><div class="empty-panel">Memuat tugas mengajar...</div></div>
        </section>
      ` : ""}
    `;
  }

  function renderMainHome() {
    return renderHomePageShell(getHomeRoleContext({ role: "admin" }));
  }

  function renderGuruHome() {
    return renderHomePageShell(getHomeRoleContext({ role: "guru" }));
  }

  function renderKoordinatorHome(levels = []) {
    return renderHomePageShell(getHomeRoleContext({ role: "guru", hasCoordinatorAccess: true, getCoordinatorLevels: () => levels }));
  }

  function renderGuruHomePage(options = {}) {
    const context = getHomeRoleContext(options);
    if (options.pageTitle) options.pageTitle.innerText = context.isKoordinator ? "Beranda Koordinator" : "Beranda Guru";
    if (options.content) options.content.innerHTML = renderHomePageShell(context);
    options.loadHomeStats?.({ ...context, getCollectionQuery: options.getCollectionQuery });
  }

  function renderKoordinatorHomePage(options = {}) {
    const context = getHomeRoleContext({ ...options, role: "guru", hasCoordinatorAccess: true });
    if (options.pageTitle) options.pageTitle.innerText = "Beranda Koordinator";
    if (options.content) options.content.innerHTML = renderHomePageShell(context);
    options.loadHomeStats?.({ ...context, getCollectionQuery: options.getCollectionQuery });
  }

  function renderHomePage(options = {}) {
    const context = getHomeRoleContext(options);
    if (options.pageTitle) options.pageTitle.innerText = context.isKoordinator ? "Beranda Koordinator" : context.isGuru ? "Beranda Guru" : "Beranda Dashboard";
    if (options.content) options.content.innerHTML = renderHomePageShell(context);
    options.loadHomeStats?.({ ...context, getCollectionQuery: options.getCollectionQuery });
    return context.isKoordinator ? "koordinator" : context.isGuru ? "guru" : "dashboard";
  }

  async function loadHomeStats(options = {}) {
    const context = options.label ? options : getHomeRoleContext(options);
    const setText = (id, value) => global.AppDom?.setText?.(id, value);
    try {
      const documentsApi = getDocumentsApi();
      const data = global.DashboardHomeData?.loadHomeCollections
        ? await global.DashboardHomeData.loadHomeCollections({ context, getCollectionQuery: options.getCollectionQuery })
        : await (async () => {
            const getQuery = path => (typeof options.getCollectionQuery === "function" ? options.getCollectionQuery(path) : documentsApi.collection(path));
            const [guruSnap, siswaSnap, kelasSnap, mapelAsliSnap, mengajarAsliSnap, mapelSnap, mengajarSnap, nilaiSnap, tugasSnap, presenceRows] = await Promise.all([
              documentsApi.collection("guru").get(),
              getQuery("siswa").get(),
              getQuery("kelas").get(),
              documentsApi.collection("mapel").get(),
              documentsApi.collection("mengajar").get(),
              documentsApi.collection("mapel_bayangan").get(),
              documentsApi.collection("mengajar_bayangan").get(),
              documentsApi.collection("nilai").get(),
              documentsApi.collection("tugas_tambahan").get(),
              loadRecentPresenceRows(25)
            ]);
            return {
              guru: guruSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
              siswa: siswaSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
              kelas: kelasSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
              mapelAsli: mapelAsliSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
              mengajarAsli: mengajarAsliSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
              mapelBayangan: mapelSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
              mengajarBayangan: mengajarSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
              nilai: nilaiSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
              tugas: tugasSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
              presenceRows
            };
          })();
      const guru = data.guru || [];
      const siswa = data.siswa || [];
      const kelas = data.kelas || [];
      const mapelAsli = data.mapelAsli || [];
      const mengajarAsli = data.mengajarAsli || [];
      const mapelBayangan = data.mapelBayangan || [];
      const mengajarBayangan = data.mengajarBayangan || [];
      const nilai = (data.nilai || []).filter(item => typeof global.isActiveTermDoc === "function" ? global.isActiveTermDoc(item) : true);
      const tugas = data.tugas || [];
      const presenceRows = data.presenceRows || [];
      const onlineUsers = presenceRows
        .filter(item => isPresenceOnline(item))
        .sort((a, b) => new Date(b.last_seen_at || 0).getTime() - new Date(a.last_seen_at || 0).getTime())
        .slice(0, 10);

      const resolvedContext = getHomeResolvedContext(context, guru);
      const inputScopeContext = getHomeInputScopeContext(resolvedContext);
      const roleAssignments = getHomeVisibleAssignments(inputScopeContext, { mengajarBayangan, kelas });
      const roleAssignmentsAsli = getHomeVisibleAssignments(inputScopeContext, { mengajarBayangan: mengajarAsli, kelas });
      const summaryRows = getHomeSummaryRows(inputScopeContext, { mengajarBayangan, siswa, mapelBayangan, nilai, kelas });
      const teachingRows = buildTeachingComparisonRows(roleAssignmentsAsli, mapelAsli, roleAssignments, mapelBayangan);
      const siswaByLevel = { 7: 0, 8: 0, 9: 0, lain: 0 };
      siswa.forEach(item => {
        const level = getKelasParts(item.kelas).tingkat;
        if (siswaByLevel[level] !== undefined) siswaByLevel[level] += 1;
        else siswaByLevel.lain += 1;
      });

      const waliRows = kelas.filter(item => String(item.kode_guru || "").trim() === resolvedContext.kodeGuru);
      const waliClassSet = new Set(
        waliRows
          .map(item => getKelasParts(item.kelas || `${item.tingkat || ""}${item.rombel || ""}`).kelas)
          .filter(Boolean)
      );

      if (context.isAdmin || resolvedContext.isGuruAdmin) {
        setText("homeHeroStat1", `${guru.length}`);
        setText("homeHeroStat2", `${kelas.length}`);
        setText("homeHeroStat3", `${onlineUsers.length} user`);
      } else if (resolvedContext.isKoordinator) {
        setText("homeHeroStat1", context.coordinatorLevels.length ? context.coordinatorLevels.join(", ") : "-");
        setText("homeHeroStat2", `${waliClassSet.size} kelas`);
        setText("homeHeroStat3", `${siswa.length} siswa`);
      } else {
        setText("homeHeroStat1", `${roleAssignments.length}`);
        setText("homeHeroStat2", `${roleAssignments.length} pembagian`);
        setText("homeHeroStat3", `${waliClassSet.size} kelas`);
      }
      setText("homeUpdatedAt", `Data dimuat ${global.AppUtils?.formatDateTimeId ? global.AppUtils.formatDateTimeId(new Date()) : new Date().toLocaleString("id-ID")}`);
      setText("homeInputSummaryTitle", summaryRows.length ? `${summaryRows.length} pembagian ditampilkan` : "Belum ada pembagian yang bisa ditampilkan");
        global.AppDom?.setHtml?.("homeInputSummaryNote", `
          ${resolvedContext !== inputScopeContext ? `<span class="home-panel-legend-item"><strong>Scope</strong><b>${escapeHtml(inputScopeContext.inputScopeLabel || "Guru")}</b></span>` : ""}
          <span class="home-panel-legend-item"><span class="home-panel-legend-box home-panel-legend-box--empty"></span>kosong</span>
          <span class="home-panel-legend-item"><span class="home-panel-legend-box home-panel-legend-box--partial"></span>tidak lengkap</span>
          <span class="home-panel-legend-item"><span class="home-panel-legend-box home-panel-legend-box--full"></span>lengkap</span>
        `);
      global.AppDom?.setHtml?.("homeInputSummaryTable", renderSummaryTable(summaryRows));
      if ((resolvedContext.isGuruAdmin || resolvedContext.isKoordinator) && document.getElementById("homeTeachingTable")) {
        setText("homeTeachingTitle", `${teachingRows.length} mapel diajar`);
        global.AppDom?.setHtml?.("homeTeachingTable", renderTeachingTable(teachingRows, "Belum ada tugas mengajar yang bisa ditampilkan."));
      }

      if (context.isAdmin) {
        setText("homeAdminCleanTitle", "Dashboard admin dibersihkan");
        setText("homeAdminCleanText", `Ringkasan utama menampilkan ${summaryRows.length} kelas-mapel aktif dan ${onlineUsers.length} user online.`);
      } else if (resolvedContext.isGuruAdmin) {
        setText("homeRoleCardTitle1", `${onlineUsers.length} pengguna aktif`);
        setText("homeRoleCardTitle2", `${guru.length} guru, ${kelas.length} kelas, ${mapelBayangan.length} mapel`);
        setText("homeRoleCardTitle3", "Fokus guru yang menyatu dengan admin");
        global.AppDom?.setHtml?.("homeRoleCardList1", onlineUsers.length
          ? onlineUsers.map(item => `
              <span class="dashboard-online-chip">
                <strong>${escapeHtml(getPresenceUserLabel(item))}</strong>
                <b>${escapeHtml(String(item.role || item.kode_guru || "-"))} - ${escapeHtml(formatPresenceAge(item.last_seen_at))}</b>
              </span>
            `).join("")
          : "<span>Belum ada user yang sedang online.</span>");
        global.AppDom?.setHtml?.("homeRoleCardList2", `
          <span><strong>Guru</strong><b>${guru.length}</b></span>
          <span><strong>Kelas</strong><b>${kelas.length}</b></span>
          <span><strong>Mapel</strong><b>${mapelBayangan.length}</b></span>
          <span><strong>Siswa</strong><b>${siswa.length}</b></span>
        `);
        global.AppDom?.setHtml?.("homeRoleCardList3", `
          <span><strong>Tugas Mengajar</strong><b>${roleAssignments.length} kelas-mapel</b></span>
          <span><strong>Wali Kelas</strong><b>${[...waliClassSet].join(", ") || "-"}</b></span>
          <span><strong>Siswa</strong><b>${siswa.length}</b></span>
        `);
      } else if (context.isKoordinator) {
        setText("homeRoleCardTitle1", `${context.coordinatorLevels.length ? context.coordinatorLevels.join(", ") : "-"} aktif`);
        setText("homeRoleCardTitle2", `${waliClassSet.size} kelas wali`);
        setText("homeRoleCardTitle3", "Pintasan kerja utama");
        global.AppDom?.setHtml?.("homeRoleCardList1", `
          <span><strong>Jenjang</strong><b>${context.coordinatorLevels.length ? context.coordinatorLevels.join(", ") : "-"}</b></span>
          <span><strong>Pembagian</strong><b>${summaryRows.length} kelas-mapel</b></span>
          <span><strong>Nilai</strong><b>${nilai.length} rekap aktif</b></span>
        `);
        global.AppDom?.setHtml?.("homeRoleCardList2", `
          <span><strong>Kelas Wali</strong><b>${[...waliClassSet].join(", ") || "-"}</b></span>
          <span><strong>Siswa terjangkau</strong><b>${siswa.length}</b></span>
          <span><strong>Kehadiran</strong><b>siap dipantau</b></span>
        `);
        global.AppDom?.setHtml?.("homeRoleCardList3", `
          <span><strong>Data Siswa</strong><b>Buka daftar siswa</b></span>
          <span><strong>Nilai</strong><b>Masuk ke input nilai</b></span>
          <span><strong>Wali Kelas</strong><b>Cek kelengkapan</b></span>
        `);
      } else {
        const teachingRowsGuru = buildTeachingComparisonRows(
          getHomeVisibleAssignments(context, { mengajarBayangan: mengajarAsli, kelas }),
          mapelAsli,
          roleAssignments,
          mapelBayangan
        );
        const tugasGuruSnap = resolvedContext.kodeGuru ? await documentsApi.collection("guru_tugas_tambahan").doc(resolvedContext.kodeGuru).get() : null;
        const tugasGuru = tugasGuruSnap?.exists ? { id: tugasGuruSnap.id, ...tugasGuruSnap.data() } : {};
        const tugasNames = getTugasNames(tugasGuru, tugas);
        const waliClass = [...waliClassSet][0] || "";
        const waliStudents = waliClass
          ? siswa.map(item => ({ ...item, kelasBayanganParts: getSiswaKelasBayanganParts(item) })).filter(item => item.kelasBayanganParts.kelas === waliClass)
          : [];
        const genderCounts = waliStudents.reduce((result, item) => {
          const gender = getJenisKelamin(item);
          if (gender === "L") result.L += 1;
          else if (gender === "P") result.P += 1;
          else result.lain += 1;
          return result;
        }, { L: 0, P: 0, lain: 0 });
        setText("homeRoleCardTitle1", teachingRowsGuru.length ? `${teachingRowsGuru.length} mapel diajar` : "Belum ada tugas mengajar");
        setText("homeRoleCardTitle2", waliClass ? `Kelas ${waliClass}` : "Belum menjadi wali kelas");
        setText("homeRoleCardTitle3", tugasNames.length ? `${tugasNames.length} tugas tambahan` : "Belum ada tugas tambahan");
        global.AppDom?.setHtml?.("homeRoleCardList1", renderTeachingTable(teachingRowsGuru, "Belum ada tugas mengajar kelas real."));
        global.AppDom?.setHtml?.("homeRoleCardList2", waliClass
          ? `
            <span><strong>Jumlah siswa</strong><b>${waliStudents.length}</b></span>
            <span><strong>Laki-laki</strong><b>${genderCounts.L}</b></span>
            <span><strong>Perempuan</strong><b>${genderCounts.P}</b></span>
            <span><strong>Belum valid</strong><b>${genderCounts.lain}</b></span>
          `
          : "<span>Belum menjadi wali kelas.</span>");
        global.AppDom?.setHtml?.("homeRoleCardList3", tugasNames.length
          ? tugasNames.map(name => `<span><strong>${escapeHtml(name)}</strong><b>aktif</b></span>`).join("")
          : "<span>Belum ada tugas tambahan.</span>");
      }
    } catch (error) {
      console.error(error);
      setText("homeUpdatedAt", "Ringkasan belum berhasil dimuat.");
      setText("homeInputSummaryTitle", "Rangkuman input belum berhasil dimuat.");
      global.AppDom?.setHtml?.("homeInputSummaryTable", `<div class="empty-panel">Data rangkuman input belum berhasil dimuat.</div>`);
    }
  }

  async function loadGuruHomeStats(options = {}) {
    return loadHomeStats({ ...options, role: "guru" });
  }

  global.DashboardHome = {
    escapeHtml,
    getKelasParts,
    getSiswaKelasBayanganParts,
    getJenisKelamin,
    getMapelName,
    getMapelJp,
    formatGuruName,
    getTugasNames,
    isPresenceOnline,
    renderMainHome,
    renderGuruHome,
    renderKoordinatorHome,
    renderRekapNilaiPlaceholder,
    renderHomePage,
    renderGuruHomePage,
    renderKoordinatorHomePage,
    loadHomeStats,
    loadGuruHomeStats
  };
})(window);
