(function initDashboardHome(global) {
  if (global.DashboardHome) return;

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
      <section class="dashboard-grid">
        <article class="dashboard-card-lite"><span class="dashboard-card-label">Pembelajaran</span><h3 id="homeMapelCount">0 mapel</h3><p id="homeMengajarCount">0 pembagian mengajar tersimpan</p></article>
        <article class="dashboard-card-lite"><span class="dashboard-card-label">Kelas</span><h3 id="homeWaliCount">0 wali kelas</h3><p id="homeKelasBayanganInfo">Kelas real belum dihitung</p></article>
        <article class="dashboard-card-lite"><span class="dashboard-card-label">Tugas Tambahan</span><h3 id="homeTugasTambahanCount">0 tugas</h3><p id="homeTugasTambahanJp">0 JP terdaftar</p></article>
        <article class="dashboard-card-lite"><span class="dashboard-card-label">Rekap JP Guru</span><div id="homeGuruJpList" class="dashboard-mini-list"><span>Memuat rekap JP...</span></div></article>
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
          <div class="dashboard-stat"><span>Jumlah JP</span><strong id="guruHomeJpCount">...</strong></div>
          <div class="dashboard-stat"><span>Kelas Wali</span><strong id="guruHomeWaliKelas">...</strong></div>
        </div>
      </section>
      <section class="dashboard-grid">
        <article class="dashboard-card-lite"><span class="dashboard-card-label">Tugas Mengajar</span><div id="guruHomeMengajarList" class="dashboard-mini-list"><span>Memuat tugas mengajar...</span></div></article>
        <article class="dashboard-card-lite"><span class="dashboard-card-label">Tugas Tambahan</span><h3 id="guruHomeTugasJp">0 JP</h3><div id="guruHomeTugasList" class="dashboard-mini-list"><span>Memuat tugas tambahan...</span></div></article>
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
          <p>Akses dibatasi ke data siswa, nilai, wali kelas, dan kelas real sesuai jenjang yang Anda koordinasi.</p>
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
      const [guruSnap, siswaSnap, kelasSnap, mapelSnap, mengajarSnap, tugasSnap] = await Promise.all([
        db.collection("guru").get(),
        options.getCollectionQuery("siswa").get(),
        options.getCollectionQuery("kelas").get(),
        db.collection("mapel").get(),
        db.collection("mengajar").get(),
        db.collection("tugas_tambahan").get()
      ]);
      const guru = guruSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const siswa = siswaSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const kelas = kelasSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const mapel = mapelSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const mengajar = mengajarSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const tugas = tugasSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const siswaByLevel = { 7: 0, 8: 0, 9: 0, lain: 0 };
      siswa.forEach(item => {
        const level = getKelasParts(item.kelas).tingkat;
        if (siswaByLevel[level] !== undefined) siswaByLevel[level] += 1;
        else siswaByLevel.lain += 1;
      });

      const guruByJp = guru
        .map(item => ({
          nama: typeof global.formatNamaGuru === "function" ? global.formatNamaGuru(item) : item.nama || item.kode_guru || "-",
          jp: Number(item.jp || 0)
        }))
        .sort((a, b) => b.jp - a.jp || a.nama.localeCompare(b.nama, undefined, { sensitivity: "base" }))
        .slice(0, 8);

      const waliCount = kelas.filter(item => String(item.kode_guru || "").trim() || String(item.wali_kelas || "").trim()).length;
      const kelasBayanganCount = siswa.filter(item => String(item.kelas_bayangan || "").trim()).length;
      const totalTugasJp = tugas.reduce((sum, item) => sum + Number(item.jp || 0), 0);

      setText("homeGuruCount", `${guru.length}`);
      setText("homeKelasCount", `${kelas.length}`);
      setText("homeSiswaCount", `${siswa.length}`);
      setText("homeMapelCount", `${mapel.length} mapel`);
      setText("homeMengajarCount", `${mengajar.length} pembagian mengajar tersimpan`);
      setText("homeWaliCount", `${waliCount}/${kelas.length} wali kelas`);
      setText("homeKelasBayanganInfo", `${kelasBayanganCount} siswa memiliki kelas real manual`);
      setText("homeTugasTambahanCount", `${tugas.length} tugas`);
      setText("homeTugasTambahanJp", `${totalTugasJp} JP terdaftar`);
      setText("homeUpdatedAt", `Data dimuat ${new Date().toLocaleString("id-ID")}`);

      global.AppDom?.setHtml?.("homeGuruJpList", guruByJp.length
        ? guruByJp.map(item => `<span><strong>${escapeHtml(item.nama)}</strong><b>${item.jp} JP</b></span>`).join("")
        : "<span>Belum ada data JP guru.</span>");
      global.AppDom?.setHtml?.("homeSiswaByLevel", `
        <span><strong>Kelas 7</strong><b>${siswaByLevel[7]} siswa</b></span>
        <span><strong>Kelas 8</strong><b>${siswaByLevel[8]} siswa</b></span>
        <span><strong>Kelas 9</strong><b>${siswaByLevel[9]} siswa</b></span>
        <span><strong>Belum valid</strong><b>${siswaByLevel.lain} siswa</b></span>
      `);
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
      const [guruSnap, siswaSnap, kelasSnap, mapelSnap, mengajarSnap, tugasSnap, tugasGuruSnap] = await Promise.all([
        db.collection("guru").get(),
        options.getCollectionQuery("siswa").get(),
        options.getCollectionQuery("kelas").get(),
        db.collection("mapel_bayangan").get(),
        db.collection("mengajar_bayangan").get(),
        db.collection("tugas_tambahan").get(),
        db.collection("guru_tugas_tambahan").doc(kodeGuru).get()
      ]);
      const guruList = guruSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const siswa = siswaSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const kelas = kelasSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const mapel = mapelSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const mengajar = mengajarSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const tugas = tugasSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const tugasGuru = tugasGuruSnap.exists ? { id: tugasGuruSnap.id, ...tugasGuruSnap.data() } : {};
      const guru = guruList.find(item => String(item.kode_guru || "").trim() === kodeGuru) || {};
      const myAssignments = mengajar.filter(item => String(item.guru_kode || "").trim() === kodeGuru);
      const totalMengajarJp = myAssignments.reduce((sum, item) => sum + getMapelJp(mapel, item.mapel_kode), 0);
      const tugasNames = getTugasNames(tugasGuru, tugas);
      const tugasJp = Number(tugasGuru.jp_tugas_tambahan || 0);
      const waliRows = kelas.filter(item => String(item.kode_guru || "").trim() === kodeGuru);

      const groupedAssignments = new Map();
      myAssignments.forEach(item => {
        const kode = String(item.mapel_kode || "").trim().toUpperCase();
        if (!kode) return;
        if (!groupedAssignments.has(kode)) {
          groupedAssignments.set(kode, { kode, nama: getMapelName(mapel, kode), jp: getMapelJp(mapel, kode), kelas: [] });
        }
        groupedAssignments.get(kode).kelas.push(`${item.tingkat || ""}${String(item.rombel || "").toUpperCase()}`);
      });
      const assignmentItems = [...groupedAssignments.values()].sort((a, b) => a.nama.localeCompare(b.nama, undefined, { sensitivity: "base" }));

      setText("guruHomeName", formatGuruName(guru, user));
      setText("guruHomeMengajarCount", `${myAssignments.length} kelas-mapel`);
      setText("guruHomeJpCount", `${totalMengajarJp + tugasJp} JP`);
      setText("guruHomeTugasJp", `${tugasJp} JP`);
      setText("guruHomeWaliKelas", waliRows.length ? waliRows.map(item => getKelasParts(item.kelas || `${item.tingkat || ""}${item.rombel || ""}`).kelas).join(", ") : "-");
      setText("guruHomeUpdatedAt", `Data dimuat ${new Date().toLocaleString("id-ID")}`);

      global.AppDom?.setHtml?.("guruHomeMengajarList", assignmentItems.length
        ? assignmentItems.map(item => `<span><strong>${escapeHtml(item.nama)}</strong><b>${escapeHtml(item.kelas.sort().join(", "))} | ${item.jp * item.kelas.length} JP</b></span>`).join("")
        : "<span>Belum ada tugas mengajar kelas real.</span>");
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

  global.DashboardHome = {
    escapeHtml,
    getKelasParts,
    getSiswaKelasBayanganParts,
    getJenisKelamin,
    getMapelName,
    getMapelJp,
    formatGuruName,
    getTugasNames,
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
