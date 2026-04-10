let semuaDataWaliSiswa = [];
let semuaDataWaliKelas = [];
let semuaDataWaliMapel = [];
let semuaDataWaliMengajar = [];
let semuaDataWaliGuru = [];
let semuaDataWaliNilai = [];
let semuaDataWaliKehadiran = [];
let semuaDataWaliKehadiranRekap = [];
let unsubscribeWaliSiswa = null;
let unsubscribeWaliKelas = null;
let unsubscribeWaliMapel = null;
let unsubscribeWaliMengajar = null;
let unsubscribeWaliGuru = null;
let unsubscribeWaliNilai = null;
let unsubscribeWaliKehadiran = null;
let unsubscribeWaliKehadiranRekap = null;
let currentWaliKelasPage = "";
let waliInitialReady = {
  siswa: false,
  kelas: false,
  mapel: false,
  mengajar: false,
  guru: false,
  nilai: false,
  kehadiran: false,
  rekap: false
};

function escapeWaliHtml(value) {
  if (window.AppUtils?.escapeHtml) return window.AppUtils.escapeHtml(value);
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getCurrentWaliUser() {
  try {
    return JSON.parse(localStorage.getItem("appUser") || "{}");
  } catch {
    return {};
  }
}

function getWaliKelasParts(kelasValue = "") {
  if (window.AppUtils?.parseKelas) return window.AppUtils.parseKelas(kelasValue);
  const normalized = String(kelasValue || "").trim().toUpperCase().replace(/\s+/g, "");
  const match = normalized.match(/([7-9])([A-Z]+)$/);
  return {
    tingkat: match ? match[1] : "",
    rombel: match ? match[2] : "",
    kelas: match ? `${match[1]} ${match[2]}` : String(kelasValue || "").trim().toUpperCase()
  };
}

function getWaliSiswaKelasBayanganParts(siswa) {
  if (window.AppUtils?.getPrimaryKelasParts) return window.AppUtils.getPrimaryKelasParts(siswa);
  const asli = getWaliKelasParts(siswa.kelas);
  const bayangan = getWaliKelasParts(siswa.kelas_bayangan);
  if (bayangan.tingkat === asli.tingkat && /^[A-H]$/.test(bayangan.rombel)) return bayangan;
  if (/^[A-H]$/.test(asli.rombel)) return asli;
  return { tingkat: asli.tingkat, rombel: "", kelas: "" };
}

function getWaliExcludedKelasRealSourceSet() {
  try {
    const sourceByLevel = JSON.parse(localStorage.getItem("kelasBayanganSourceByLevel") || "{}");
    return new Set(
      Object.values(sourceByLevel)
        .map(value => getWaliKelasParts(value).kelas)
        .filter(Boolean)
    );
  } catch {
    return new Set();
  }
}

function filterWaliSelectableClasses(rows) {
  const excluded = getWaliExcludedKelasRealSourceSet();
  if (excluded.size === 0) return rows;
  return rows.filter(item => {
    const parts = getWaliKelasParts(item.kelas || `${item.tingkat || ""}${item.rombel || ""}`);
    return !excluded.has(parts.kelas);
  });
}

function getAccessibleWaliClasses() {
  const user = getCurrentWaliUser();
  if ((user.role || "admin") === "admin") return sortWaliClasses(filterWaliSelectableClasses(semuaDataWaliKelas));
  if ((user.role || "") === "koordinator" || ((user.role || "") === "guru" && typeof canUseCoordinatorAccess === "function" && canUseCoordinatorAccess())) {
    const levels = typeof getCurrentCoordinatorLevelsSync === "function" ? getCurrentCoordinatorLevelsSync() : [];
    return sortWaliClasses(filterWaliSelectableClasses(semuaDataWaliKelas.filter(item => {
      const parts = getWaliKelasParts(item.kelas || `${item.tingkat || ""}${item.rombel || ""}`);
      return levels.includes(parts.tingkat);
    })));
  }
  return sortWaliClasses(filterWaliSelectableClasses(semuaDataWaliKelas.filter(item => String(item.kode_guru || "") === String(user.kode_guru || ""))));
}

function sortWaliClasses(rows) {
  return [...rows].sort((a, b) => {
    const aParts = getWaliKelasParts(a.kelas || `${a.tingkat || ""}${a.rombel || ""}`);
    const bParts = getWaliKelasParts(b.kelas || `${b.tingkat || ""}${b.rombel || ""}`);
    return `${aParts.tingkat}${aParts.rombel}`.localeCompare(`${bParts.tingkat}${bParts.rombel}`, undefined, { numeric: true, sensitivity: "base" });
  });
}

function getSelectedWaliClass() {
  const value = document.getElementById("waliKelasSelect")?.value || getPreferredWaliClass();
  return getWaliKelasParts(value);
}

function getPreferredWaliClass() {
  const classes = getAccessibleWaliClasses();
  if (classes.length === 0) return "";
  const user = getCurrentWaliUser();
  const kodeGuru = String(user.kode_guru || "").trim();
  const ownClass = classes
    .map(item => getWaliKelasParts(item.kelas || `${item.tingkat || ""}${item.rombel || ""}`).kelas)
    .find((kelas, index) => String(classes[index]?.kode_guru || "").trim() === kodeGuru);
  return ownClass || getWaliKelasParts(classes[0].kelas || `${classes[0].tingkat || ""}${classes[0].rombel || ""}`).kelas;
}

function getWaliStudentsByClass(kelasValue) {
  const target = getWaliKelasParts(kelasValue).kelas;
  return semuaDataWaliSiswa
    .map(siswa => ({ ...siswa, kelasBayanganParts: getWaliSiswaKelasBayanganParts(siswa) }))
    .filter(siswa => siswa.kelasBayanganParts.kelas === target)
    .sort((a, b) => String(a.nama || "").localeCompare(String(b.nama || ""), undefined, { sensitivity: "base" }));
}

function renderWaliKelasSelect() {
  const classes = getAccessibleWaliClasses();
  if (classes.length === 0) return `<option value="">Tidak ada kelas wali</option>`;
  const currentValue = document.getElementById("waliKelasSelect")?.value || "";
  const classValues = classes.map(item => getWaliKelasParts(item.kelas || `${item.tingkat || ""}${item.rombel || ""}`).kelas);
  const preferred = classValues.includes(currentValue) ? currentValue : getPreferredWaliClass();
  return classes.map(item => {
    const parts = getWaliKelasParts(item.kelas || `${item.tingkat || ""}${item.rombel || ""}`);
    return `<option value="${escapeWaliHtml(parts.kelas)}" ${parts.kelas === preferred ? "selected" : ""}>${escapeWaliHtml(parts.kelas)}</option>`;
  }).join("");
}

function refreshWaliKelasSelectOptions() {
  const select = document.getElementById("waliKelasSelect");
  if (!select) return;
  const beforeValue = select.value || "";
  const nextOptions = renderWaliKelasSelect();
  if (select.innerHTML !== nextOptions) {
    select.innerHTML = nextOptions;
  }

  const values = Array.from(select.options).map(option => option.value);
  if (beforeValue && values.includes(beforeValue)) {
    select.value = beforeValue;
  } else if (!select.value && values.length > 0) {
    select.value = values[0];
  }
}

function renderWaliKelasHeader(title, description, extraActions = "") {
  if (window.WaliKelasView?.renderHeader) {
    return window.WaliKelasView.renderHeader({
      title,
      description,
      extraActions,
      selectOptionsHtml: renderWaliKelasSelect(),
      escape: escapeWaliHtml
    });
  }
  return `
    <div class="kelas-bayangan-head nilai-page-head">
      <div>
        <span class="dashboard-eyebrow">Wali Kelas</span>
        <h2>${escapeWaliHtml(title)}</h2>
        <p>${escapeWaliHtml(description)}</p>
      </div>
    </div>
    <div class="nilai-control-panel wali-control-panel">
      <label class="form-group">
        <span>Pilih kelas</span>
        <select id="waliKelasSelect" onchange="renderWaliKelasActivePage()">${renderWaliKelasSelect()}</select>
      </label>
      <div class="nilai-control-actions">${extraActions}</div>
    </div>
  `;
}

function renderWaliKehadiranPage() {
  if (window.WaliKelasView?.renderPageShell) return window.WaliKelasView.renderPageShell();
  return `
    <div class="card">
      <div id="waliKelasPageShell">
        <div class="empty-panel">Memuat data wali kelas...</div>
      </div>
    </div>
  `;
}

function renderWaliKelengkapanPage() {
  if (window.WaliKelasView?.renderPageShell) return window.WaliKelasView.renderPageShell();
  return `
    <div class="card">
      <div id="waliKelasPageShell">
        <div class="empty-panel">Memuat data wali kelas...</div>
      </div>
    </div>
  `;
}

function loadRealtimeWaliKelas(page) {
  if (window.WaliKelasService?.loadRealtime) {
    const unsubs = window.WaliKelasService.loadRealtime(page, {
      clearListeners: clearWaliKelasListeners,
      setCurrentPage: value => {
        currentWaliKelasPage = value;
      },
      setReadyState: value => {
        waliInitialReady = value;
      },
      renderLoading: renderWaliKelasLoadingState,
      renderActivePage: nextPage => renderWaliKelasActivePage(nextPage),
      onSiswa: rows => {
        semuaDataWaliSiswa = rows;
      },
      onKelas: rows => {
        semuaDataWaliKelas = rows;
      },
      onMapel: rows => {
        semuaDataWaliMapel = rows;
      },
      onMengajar: rows => {
        semuaDataWaliMengajar = rows;
      },
      onGuru: rows => {
        semuaDataWaliGuru = rows;
      },
      onNilai: rows => {
        semuaDataWaliNilai = rows;
      },
      onKehadiran: rows => {
        semuaDataWaliKehadiran = rows;
      },
      onRekap: rows => {
        semuaDataWaliKehadiranRekap = rows;
      },
      markReady: key => {
        waliInitialReady[key] = true;
      }
    });
    unsubscribeWaliSiswa = unsubs.siswa || null;
    unsubscribeWaliKelas = unsubs.kelas || null;
    unsubscribeWaliMapel = unsubs.mapel || null;
    unsubscribeWaliMengajar = unsubs.mengajar || null;
    unsubscribeWaliGuru = unsubs.guru || null;
    unsubscribeWaliNilai = unsubs.nilai || null;
    unsubscribeWaliKehadiran = unsubs.kehadiran || null;
    unsubscribeWaliKehadiranRekap = unsubs.rekap || null;
    return;
  }
  clearWaliKelasListeners();
  currentWaliKelasPage = page || "";
  waliInitialReady = {
    siswa: false,
    kelas: false,
    mapel: false,
    mengajar: false,
    guru: false,
    nilai: false,
    kehadiran: false,
    rekap: false
  };
  renderWaliKelasLoadingState();
  const render = () => renderWaliKelasActivePage(page);
  const siswaQuery = typeof getSemesterCollectionQuery === "function" ? getSemesterCollectionQuery("siswa", "nama") : db.collection("siswa").orderBy("nama");
  const kelasQuery = typeof getSemesterCollectionQuery === "function" ? getSemesterCollectionQuery("kelas") : db.collection("kelas");
  unsubscribeWaliSiswa = siswaQuery.onSnapshot(snapshot => {
    semuaDataWaliSiswa = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    waliInitialReady.siswa = true;
    render();
  });
  unsubscribeWaliKelas = kelasQuery.onSnapshot(snapshot => {
    semuaDataWaliKelas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    waliInitialReady.kelas = true;
    render();
  });
  unsubscribeWaliMapel = db.collection("mapel_bayangan").orderBy("kode_mapel").onSnapshot(snapshot => {
    semuaDataWaliMapel = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    waliInitialReady.mapel = true;
    render();
  });
  unsubscribeWaliMengajar = db.collection("mengajar_bayangan").onSnapshot(snapshot => {
    semuaDataWaliMengajar = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    waliInitialReady.mengajar = true;
    render();
  });
  unsubscribeWaliGuru = db.collection("guru").orderBy("kode_guru").onSnapshot(snapshot => {
    semuaDataWaliGuru = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    waliInitialReady.guru = true;
    render();
  });
  unsubscribeWaliNilai = db.collection("nilai").onSnapshot(snapshot => {
    semuaDataWaliNilai = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(item => typeof isActiveTermDoc === "function" ? isActiveTermDoc(item) : true);
    waliInitialReady.nilai = true;
    render();
  });
  unsubscribeWaliKehadiran = db.collection("kehadiran_siswa").onSnapshot(snapshot => {
    semuaDataWaliKehadiran = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(item => typeof isActiveTermDoc === "function" ? isActiveTermDoc(item) : true);
    waliInitialReady.kehadiran = true;
    render();
  });
  unsubscribeWaliKehadiranRekap = db.collection("kehadiran_rekap_siswa").onSnapshot(snapshot => {
    semuaDataWaliKehadiranRekap = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(item => typeof isActiveTermDoc === "function" ? isActiveTermDoc(item) : true);
    waliInitialReady.rekap = true;
    render();
  });
}

function clearWaliKelasListeners() {
  [unsubscribeWaliSiswa, unsubscribeWaliKelas, unsubscribeWaliMapel, unsubscribeWaliMengajar, unsubscribeWaliGuru, unsubscribeWaliNilai, unsubscribeWaliKehadiran, unsubscribeWaliKehadiranRekap].forEach(unsub => {
    if (unsub) unsub();
  });
  unsubscribeWaliSiswa = null;
  unsubscribeWaliKelas = null;
  unsubscribeWaliMapel = null;
  unsubscribeWaliMengajar = null;
  unsubscribeWaliGuru = null;
  unsubscribeWaliNilai = null;
  unsubscribeWaliKehadiran = null;
  unsubscribeWaliKehadiranRekap = null;
}

function isWaliInitialDataReady(page = currentWaliKelasPage) {
  if (page === "kehadiran") {
    return waliInitialReady.siswa && waliInitialReady.kelas && waliInitialReady.kehadiran && waliInitialReady.rekap;
  }
  if (page === "kelengkapan") {
    return waliInitialReady.siswa && waliInitialReady.kelas && waliInitialReady.mapel && waliInitialReady.mengajar && waliInitialReady.guru && waliInitialReady.nilai;
  }
  return waliInitialReady.siswa && waliInitialReady.kelas;
}

function renderWaliKelasLoadingState(message = "Memuat data wali kelas...") {
  const shell = document.getElementById("waliKelasPageShell");
  if (shell) {
    shell.innerHTML = `<div class="empty-panel">${escapeWaliHtml(message)}</div>`;
  }
}

function ensureWaliKelasPageShell(page = currentWaliKelasPage) {
  const shell = document.getElementById("waliKelasPageShell");
  if (!shell) return false;
  const targetId = page === "kehadiran" ? "waliKehadiranTable" : "waliKelengkapanTable";
  if (document.getElementById(targetId)) return true;

  if (page === "kehadiran") {
    shell.innerHTML = `
      ${renderWaliKelasHeader("Rekap Kehadiran Siswa", "Rekap jumlah S, I, dan A berdasarkan anggota kelas.", `
        <button type="button" class="btn-secondary" onclick="downloadWaliKehadiranTemplate()">Download Template</button>
        <button type="button" class="btn-secondary" onclick="triggerWaliKehadiranImport()">Import Rekap</button>
        <button type="button" class="btn-primary" onclick="saveWaliKehadiranRekap()">Simpan</button>
        <input id="waliKehadiranImportInput" type="file" accept=".xlsx,.xls" onchange="importWaliKehadiranExcel(event)" hidden>
      `)}
      <div id="waliKehadiranTable" class="table-container mapel-table-container wali-kehadiran-table-wrap"></div>
    `;
    return true;
  }

  shell.innerHTML = `
    ${renderWaliKelasHeader("Cek Kelengkapan Nilai Siswa", "Pantau jumlah siswa yang sudah diberi nilai oleh guru mapel.", "")}
    <div id="waliKelengkapanTable" class="table-container mapel-table-container"></div>
  `;
  return true;
}

function renderWaliKelasActivePage(page) {
  if (page) currentWaliKelasPage = page;
  const activePage = currentWaliKelasPage;
  if (!isWaliInitialDataReady(activePage)) {
    renderWaliKelasLoadingState();
    return;
  }
  ensureWaliKelasPageShell(activePage);
  refreshWaliKelasSelectOptions();
  if (activePage === "kehadiran") {
    renderWaliKehadiranTable();
    return;
  }
  if (activePage === "kelengkapan") {
    renderWaliKelengkapanTable();
    return;
  }
  if (document.getElementById("waliKehadiranTable")) {
    renderWaliKehadiranTable();
    return;
  }
  if (document.getElementById("waliKelengkapanTable")) {
    renderWaliKelengkapanTable();
  }
}

function getWaliKehadiranDate() {
  return document.getElementById("waliTanggalKehadiran")?.value || new Date().toISOString().slice(0, 10);
}

function makeWaliKehadiranDocId(date, kelas, nipd) {
  const baseId = [date, kelas.replace(/\s+/g, ""), nipd].join("_");
  const termId = typeof getActiveTermId === "function" ? getActiveTermId() : "legacy";
  return termId === "legacy" ? baseId : `${termId}_${baseId}`;
}

function makeWaliKehadiranRekapDocId(kelas, nipd) {
  const baseId = [kelas.replace(/\s+/g, ""), String(nipd || "").trim()].join("_");
  const termId = typeof getActiveTermId === "function" ? getActiveTermId() : "legacy";
  return termId === "legacy" ? baseId : `${termId}_${baseId}`;
}

function getWaliActiveTermPayload() {
  const term = typeof getActiveSemesterContext === "function" ? getActiveSemesterContext() : { id: "legacy", semester: "", tahun: "" };
  return {
    term_id: term.id || "legacy",
    semester: term.semester || "",
    tahun_pelajaran: term.tahun || ""
  };
}

function getWaliKehadiranStatus(date, kelas, nipd) {
  const docId = makeWaliKehadiranDocId(date, kelas, nipd);
  return semuaDataWaliKehadiran.find(item => item.id === docId)?.status || "";
}

function normalizeWaliRekapCount(value) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue < 0) return 0;
  return Math.floor(numberValue);
}

function getWaliKehadiranCounts(kelas, nipd) {
  const targetKelas = getWaliKelasParts(kelas).kelas;
  const targetNipd = String(nipd || "").trim();
  const rekap = semuaDataWaliKehadiranRekap.find(item =>
    item.id === makeWaliKehadiranRekapDocId(targetKelas, targetNipd) ||
    (getWaliKelasParts(item.kelas).kelas === targetKelas && String(item.nipd || "").trim() === targetNipd)
  );
  if (rekap) {
    return {
      S: normalizeWaliRekapCount(rekap.s ?? rekap.S),
      I: normalizeWaliRekapCount(rekap.i ?? rekap.I),
      A: normalizeWaliRekapCount(rekap.a ?? rekap.A)
    };
  }
  return semuaDataWaliKehadiran.reduce((result, item) => {
    const itemKelas = getWaliKelasParts(item.kelas).kelas;
    const itemNipd = String(item.nipd || "").trim();
    const status = String(item.status || "").trim().toUpperCase();
    if (itemKelas === targetKelas && itemNipd === targetNipd && ["S", "I", "A"].includes(status)) {
      result[status] += 1;
    }
    return result;
  }, { S: 0, I: 0, A: 0 });
}

function renderWaliKehadiranTable() {
  const container = document.getElementById("waliKehadiranTable");
  if (!container) return;
  const kelas = getSelectedWaliClass().kelas;
  const students = getWaliStudentsByClass(kelas);
  if (window.WaliKelasView?.renderKehadiranTable) {
    container.innerHTML = window.WaliKelasView.renderKehadiranTable({
      kelas,
      students,
      getCounts: getWaliKehadiranCounts,
      escape: escapeWaliHtml
    });
    return;
  }
  container.innerHTML = `
        <table class="mapel-table wali-kehadiran-table">
          <colgroup>
            <col class="wali-col-no">
            <col class="wali-col-name">
            <col class="wali-col-input">
            <col class="wali-col-input">
            <col class="wali-col-input">
          </colgroup>
          <thead>
            <tr>
              <th>No</th>
              <th>Nama Siswa</th>
              <th>S</th>
              <th>I</th>
              <th>A</th>
            </tr>
          </thead>
      <tbody>
        ${students.map((siswa, index) => {
          const counts = getWaliKehadiranCounts(kelas, siswa.nipd);
          return `
              <tr>
                <td>${index + 1}</td>
                <td class="wali-student-name">${escapeWaliHtml(siswa.nama || "-")}</td>
                <td class="wali-rekap-s"><input id="wali-rekap-s-${index}" class="wali-rekap-input" type="number" min="0" value="${counts.S}"></td>
                <td class="wali-rekap-i"><input id="wali-rekap-i-${index}" class="wali-rekap-input" type="number" min="0" value="${counts.I}"></td>
                <td class="wali-rekap-a"><input id="wali-rekap-a-${index}" class="wali-rekap-input" type="number" min="0" value="${counts.A}"></td>
              </tr>
          `;
        }).join("")}
      </tbody>
    </table>
  `;
}

async function saveWaliKehadiranRekap() {
  const kelas = getSelectedWaliClass().kelas;
  const students = getWaliStudentsByClass(kelas);
  if (!kelas || students.length === 0) {
    Swal.fire("Tidak ada siswa", "", "warning");
    return;
  }
  const batch = db.batch();
  students.forEach((siswa, index) => {
    const s = normalizeWaliRekapCount(document.getElementById(`wali-rekap-s-${index}`)?.value || 0);
    const i = normalizeWaliRekapCount(document.getElementById(`wali-rekap-i-${index}`)?.value || 0);
    const a = normalizeWaliRekapCount(document.getElementById(`wali-rekap-a-${index}`)?.value || 0);
    batch.set(db.collection("kehadiran_rekap_siswa").doc(makeWaliKehadiranRekapDocId(kelas, siswa.nipd)), {
      ...getWaliActiveTermPayload(),
      kelas,
      nipd: siswa.nipd || "",
      nama_siswa: siswa.nama || "",
      s,
      i,
      a,
      updated_by: getCurrentWaliUser().username || "",
      updated_at: new Date()
    }, { merge: true });
  });
  await batch.commit();
  Swal.fire("Tersimpan", "Rekap kehadiran siswa sudah disimpan.", "success");
}

function setWaliKehadiranDraft(nipd, status) {
  const kelas = getSelectedWaliClass().kelas;
  const date = getWaliKehadiranDate();
  const docId = makeWaliKehadiranDocId(date, kelas, nipd);
  const existingIndex = semuaDataWaliKehadiran.findIndex(item => item.id === docId);
  const payload = { id: docId, tanggal: date, kelas, nipd, status };
  if (existingIndex >= 0) semuaDataWaliKehadiran[existingIndex] = { ...semuaDataWaliKehadiran[existingIndex], ...payload };
  else semuaDataWaliKehadiran.push(payload);
  renderWaliKehadiranTable();
}

async function saveWaliKehadiran() {
  const kelas = getSelectedWaliClass().kelas;
  const date = getWaliKehadiranDate();
  const students = getWaliStudentsByClass(kelas);
  if (!kelas || students.length === 0) {
    Swal.fire("Tidak ada siswa", "", "warning");
    return;
  }
  const batch = db.batch();
  students.forEach(siswa => {
    const status = getWaliKehadiranStatus(date, kelas, siswa.nipd);
    if (!status) return;
    batch.set(db.collection("kehadiran_siswa").doc(makeWaliKehadiranDocId(date, kelas, siswa.nipd)), {
      ...getWaliActiveTermPayload(),
      tanggal: date,
      kelas,
      nipd: siswa.nipd || "",
      nama_siswa: siswa.nama || "",
      status,
      updated_by: getCurrentWaliUser().username || "",
      updated_at: new Date()
    }, { merge: true });
  });
  await batch.commit();
  Swal.fire("Tersimpan", "Kehadiran siswa sudah disimpan.", "success");
}

function downloadWaliKehadiranTemplate() {
  const kelas = getSelectedWaliClass().kelas;
  const students = getWaliStudentsByClass(kelas);
  if (!kelas || students.length === 0) {
    Swal.fire("Tidak ada siswa", "", "warning");
    return;
  }
  const rows = students.map((siswa, index) => {
    const counts = getWaliKehadiranCounts(kelas, siswa.nipd);
    return {
      NO: index + 1,
      NIPD: siswa.nipd || "",
      NAMA: siswa.nama || "",
      S: counts.S,
      I: counts.I,
      A: counts.A
    };
  });
  const worksheet = XLSX.utils.json_to_sheet(rows, { header: ["NO", "NIPD", "NAMA", "S", "I", "A"] });
  worksheet["!cols"] = [{ wch: 6 }, { wch: 14 }, { wch: 30 }, { wch: 8 }, { wch: 8 }, { wch: 8 }];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Rekap Kehadiran");
  XLSX.writeFile(workbook, `template-rekap-kehadiran-${kelas.replace(/\s+/g, "")}.xlsx`);
}

function triggerWaliKehadiranImport() {
  document.getElementById("waliKehadiranImportInput")?.click();
}

function importWaliKehadiranExcel(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const kelas = getSelectedWaliClass().kelas;
  const students = getWaliStudentsByClass(kelas);
  const reader = new FileReader();
  reader.onload = async evt => {
    try {
      const workbook = XLSX.read(new Uint8Array(evt.target.result), { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);
      let count = 0;
      rows.forEach(row => {
        const nipd = String(getCellValue(row, ["NIPD"])).trim();
        const siswa = students.find(item => String(item.nipd || "") === nipd);
        if (!siswa) return;
        const rekap = {
          id: makeWaliKehadiranRekapDocId(kelas, nipd),
          kelas,
          nipd,
          nama_siswa: siswa.nama || "",
          s: normalizeWaliRekapCount(getCellValue(row, ["S", "SAKIT"])),
          i: normalizeWaliRekapCount(getCellValue(row, ["I", "IZIN"])),
          a: normalizeWaliRekapCount(getCellValue(row, ["A", "ALPA", "ALFA"]))
        };
        const existingIndex = semuaDataWaliKehadiranRekap.findIndex(item => item.id === rekap.id);
        if (existingIndex >= 0) semuaDataWaliKehadiranRekap[existingIndex] = { ...semuaDataWaliKehadiranRekap[existingIndex], ...rekap };
        else semuaDataWaliKehadiranRekap.push(rekap);
        count++;
      });
      event.target.value = "";
      renderWaliKehadiranTable();
      Swal.fire("Import selesai", `${count} rekap dimuat. Klik Simpan untuk menyimpan ke database.`, "success");
    } catch (error) {
      console.error(error);
      Swal.fire("Gagal import", "", "error");
    }
  };
  reader.readAsArrayBuffer(file);
}

function getWaliClassAssignments(kelas) {
  const parts = getWaliKelasParts(kelas);
  const mapelIndex = new Map(semuaDataWaliMapel.map((item, index) => [
    String(item.kode_mapel || item.id || "").trim().toUpperCase(),
    {
      index,
      mapping: Number(item.mapping ?? Number.MAX_SAFE_INTEGER),
      kode: String(item.kode_mapel || item.id || "").trim().toUpperCase()
    }
  ]));
  const seen = new Set();
  return semuaDataWaliMengajar
    .filter(item => String(item.tingkat || "") === parts.tingkat && String(item.rombel || "").toUpperCase() === parts.rombel)
    .filter(item => {
      const kode = String(item.mapel_kode || "").toUpperCase();
      if (!kode || seen.has(kode)) return false;
      seen.add(kode);
      return true;
    })
    .sort((a, b) => {
      const aKode = String(a.mapel_kode || "").trim().toUpperCase();
      const bKode = String(b.mapel_kode || "").trim().toUpperCase();
      const aInfo = mapelIndex.get(aKode) || { mapping: Number.MAX_SAFE_INTEGER, index: Number.MAX_SAFE_INTEGER, kode: aKode };
      const bInfo = mapelIndex.get(bKode) || { mapping: Number.MAX_SAFE_INTEGER, index: Number.MAX_SAFE_INTEGER, kode: bKode };
      if (aInfo.mapping !== bInfo.mapping) return aInfo.mapping - bInfo.mapping;
      if (aInfo.index !== bInfo.index) return aInfo.index - bInfo.index;
      return aInfo.kode.localeCompare(bInfo.kode, undefined, { sensitivity: "base" });
    });
}

function getWaliMapelName(mapelKode) {
  const target = String(mapelKode || "").toUpperCase();
  const mapel = semuaDataWaliMapel.find(item => String(item.kode_mapel || item.id || "").toUpperCase() === target);
  return mapel?.nama_mapel || mapelKode || "-";
}

function getWaliGuruPengajarName(assignment = {}) {
  const directName = String(assignment.guru_nama || assignment.nama_guru || assignment.guru || "").trim();
  if (directName) return directName;
  const kodeGuru = String(assignment.guru_kode || assignment.kode_guru || "").trim();
  const guru = semuaDataWaliGuru.find(item => String(item.kode_guru || item.id || "").trim() === kodeGuru);
  if (guru && typeof formatNamaGuru === "function") return formatNamaGuru(guru) || kodeGuru || "-";
  if (guru) return [guru.gelar_depan, guru.nama, guru.gelar_belakang].filter(Boolean).join(" ") || kodeGuru || "-";
  return kodeGuru || "-";
}

function getWaliNilaiCount(kelas, mapelKode, field) {
  const students = getWaliStudentsByClass(kelas);
  const studentIds = new Set(students.map(item => String(item.nipd || "")));
  const fieldAliases = {
    uh_1: ["uh_1", "UH1", "UH_1", "uh1"],
    uh_2: ["uh_2", "UH2", "UH_2", "uh2"],
    uh_3: ["uh_3", "UH3", "UH_3", "uh3"],
    pts: ["pts", "PTS", "nilai_pts", "nilaiPTS"]
  };
  const aliases = fieldAliases[field] || [field];
  const hasScore = item => aliases.some(alias => item[alias] !== "" && item[alias] !== null && item[alias] !== undefined);
  const count = semuaDataWaliNilai.filter(item =>
    studentIds.has(String(item.nipd || "")) &&
    String(item.kelas || "").toUpperCase() === String(kelas || "").toUpperCase() &&
    String(item.mapel_kode || "").toUpperCase() === String(mapelKode || "").toUpperCase() &&
    hasScore(item)
  ).length;
  return { count, total: students.length };
}

function getWaliCompletenessClass(count, total) {
  if (!total || count === 0) return "wali-complete-red";
  if (count >= total) return "wali-complete-green";
  return "wali-complete-yellow";
}

function formatWaliCompletenessText(count, total) {
  if (!count) return "";
  return `${count} / ${total}`;
}

function renderWaliKelengkapanTable() {
  const container = document.getElementById("waliKelengkapanTable");
  if (!container) return;
  const kelas = getSelectedWaliClass().kelas;
  const assignments = getWaliClassAssignments(kelas);
  if (window.WaliKelasView?.renderKelengkapanTable) {
    container.innerHTML = window.WaliKelasView.renderKelengkapanTable({
      kelas,
      assignments,
      escape: escapeWaliHtml,
      getMapelName: getWaliMapelName,
      getGuruName: getWaliGuruPengajarName,
      getNilaiCount: getWaliNilaiCount,
      getCompletenessClass: getWaliCompletenessClass,
      formatCompletenessText: formatWaliCompletenessText
    });
    return;
  }
  container.innerHTML = `
    <table class="mapel-table wali-completeness-table">
      <colgroup>
        <col class="wali-col-mapel">
        <col class="wali-col-teacher">
        <col class="wali-col-score">
        <col class="wali-col-score">
        <col class="wali-col-score">
        <col class="wali-col-score">
      </colgroup>
      <thead>
        <tr>
          <th>Nama Mapel</th>
          <th>Nama Guru</th>
          <th>UH 1</th>
          <th>UH 2</th>
          <th>UH 3</th>
          <th>PTS</th>
        </tr>
      </thead>
      <tbody>
        ${assignments.map(item => {
          const fields = [["uh_1", "UH 1"], ["uh_2", "UH 2"], ["uh_3", "UH 3"], ["pts", "PTS"]];
          return `
            <tr>
              <td>${escapeWaliHtml(getWaliMapelName(item.mapel_kode))}</td>
              <td>${escapeWaliHtml(getWaliGuruPengajarName(item))}</td>
              ${fields.map(([field]) => {
                const result = getWaliNilaiCount(kelas, item.mapel_kode, field);
                return `<td class="${getWaliCompletenessClass(result.count, result.total)}">${formatWaliCompletenessText(result.count, result.total)}</td>`;
              }).join("")}
            </tr>
          `;
        }).join("")}
      </tbody>
    </table>
  `;
}
