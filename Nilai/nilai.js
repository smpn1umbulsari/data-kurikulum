let semuaDataNilaiSiswa = [];
let semuaDataNilaiMapel = [];
let semuaDataNilaiMengajar = [];
let semuaDataNilaiKelas = [];
let semuaDataNilai = [];
let unsubscribeNilaiSiswa = null;
let unsubscribeNilaiMapel = null;
let unsubscribeNilaiMengajar = null;
let unsubscribeNilaiKelas = null;
let unsubscribeNilaiData = null;
let nilaiPreviewData = [];
let nilaiPreviewPage = 1;
let nilaiPreviewRowsPerPage = 10;
let nilaiLastImportInput = null;
let isNilaiUploading = false;
let isNilaiSaving = false;
let currentNilaiAccessMode = "guru";
const NILAI_LAST_ASSIGNMENT_KEY = "nilaiLastAssignmentId";
const NILAI_REKAP_LAST_CLASS_KEY = "nilaiRekapLastClass";
const nilaiHydratedAssignmentKeys = new Set();
let currentNilaiAssignmentId = "";
let currentNilaiAssignmentRows = [];

function getNilaiDocumentsApi() {
  return window.SupabaseDocuments;
}

function escapeNilaiHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getCurrentNilaiUser() {
  try {
    return JSON.parse(localStorage.getItem("appUser") || "{}");
  } catch {
    return {};
  }
}

function setNilaiAccessMode(mode = "guru") {
  currentNilaiAccessMode = mode === "koordinator" ? "koordinator" : "guru";
}

function getNilaiGenderLabel(siswa = {}) {
  const raw = String(siswa.jenis_kelamin || siswa.jk || siswa.gender || siswa.kelamin || "").trim().toLowerCase();
  if (["l", "lk", "laki", "laki-laki", "laki laki", "1"].includes(raw)) return "L";
  if (["p", "pr", "perempuan", "2"].includes(raw)) return "P";
  return "-";
}

function getNilaiKelasParts(kelasValue = "") {
  const normalized = String(kelasValue || "").trim().toUpperCase().replace(/\s+/g, "");
  const match = normalized.match(/([7-9])([A-Z]+)$/);
  return {
    tingkat: match ? match[1] : "",
    rombel: match ? match[2] : "",
    kelas: match ? `${match[1]} ${match[2]}` : String(kelasValue || "").trim().toUpperCase()
  };
}

function getNilaiKelasBayanganParts(siswa) {
  const asliParts = getNilaiKelasParts(siswa.kelas);
  const bayanganParts = getNilaiKelasParts(siswa.kelas_bayangan);
  if (bayanganParts.tingkat === asliParts.tingkat && /^[A-H]$/.test(bayanganParts.rombel)) return bayanganParts;
  if (/^[A-H]$/.test(asliParts.rombel)) return asliParts;
  return { tingkat: asliParts.tingkat, rombel: "", kelas: "" };
}

function getNilaiMapel(mapelKode) {
  const target = String(mapelKode || "").toUpperCase();
  return semuaDataNilaiMapel.find(item =>
    String(item.kode_mapel || item.id || "").toUpperCase() === target
  ) || null;
}

function getNilaiClassKey(item = {}) {
  return getNilaiKelasParts(item.kelas || `${item.tingkat || ""}${item.rombel || ""}`).kelas;
}

function normalizeNilaiAgama(value = "") {
  return String(value || "").trim().toLowerCase();
}

function getNilaiMapelIndukKode(mapel = {}) {
  const value = String(mapel.induk_mapel || mapel.induk || mapel.kode_induk || "").trim().toUpperCase();
  return value || String(mapel.kode_mapel || mapel.id || "").trim().toUpperCase();
}

function isNilaiSiswaEligibleForMapel(siswa, mapel) {
  if (!mapel) return true;
  if (getNilaiMapelIndukKode(mapel) !== "PABP") return true;
  const mapelAgama = normalizeNilaiAgama(mapel.agama);
  if (!mapelAgama) return true;
  return normalizeNilaiAgama(siswa.agama) === mapelAgama;
}

function getNilaiCoordinatorWaliClassSet() {
  const user = getCurrentNilaiUser();
  const kodeGuru = String(user.kode_guru || "").trim();
  if (!kodeGuru) return new Set();
  return new Set(
    semuaDataNilaiKelas
      .filter(item => String(item.kode_guru || "").trim() === kodeGuru)
      .map(item => getNilaiClassKey(item))
      .filter(Boolean)
  );
}

function getNilaiAccessibleAssignments() {
  const user = getCurrentNilaiUser();
  const role = user.role || "admin";
  const coordinatorLevels = typeof getCurrentCoordinatorLevelsSync === "function" ? getCurrentCoordinatorLevelsSync() : [];
  const hasCoordinatorAccess = typeof canUseCoordinatorAccess === "function" && canUseCoordinatorAccess();
  const coordinatorWaliClasses = getNilaiCoordinatorWaliClassSet();
  return semuaDataNilaiMengajar
    .filter(item => {
      if (!item.mapel_kode || !item.guru_kode || !item.tingkat || !item.rombel) return false;
      if (role === "admin" || role === "superadmin") return true;
      if (role === "guru" && hasCoordinatorAccess && currentNilaiAccessMode === "koordinator") {
        return coordinatorLevels.includes(String(item.tingkat || "")) || coordinatorWaliClasses.has(getNilaiClassKey(item));
      }
      if (role === "guru") return String(item.guru_kode || "") === String(user.kode_guru || "");
      if (role === "koordinator") return coordinatorLevels.includes(String(item.tingkat || "")) || coordinatorWaliClasses.has(getNilaiClassKey(item));
      return false;
    })
    .filter(item => getNilaiStudentsForAssignment(item).length > 0)
    .sort((a, b) => {
      const kelasA = `${a.tingkat}${a.rombel}`;
      const kelasB = `${b.tingkat}${b.rombel}`;
      const kelasResult = kelasA.localeCompare(kelasB, undefined, { numeric: true, sensitivity: "base" });
      if (kelasResult !== 0) return kelasResult;
      return String(a.mapel_kode || "").localeCompare(String(b.mapel_kode || ""), undefined, { sensitivity: "base" });
    });
}

function makeNilaiAssignmentId(item) {
  return `${item.tingkat}|${String(item.rombel || "").toUpperCase()}|${String(item.mapel_kode || "").toUpperCase()}|${String(item.guru_kode || "")}`;
}

function parseNilaiAssignmentId(value = "") {
  const [tingkat, rombel, mapelKode, guruKode] = String(value || "").split("|");
  return { tingkat, rombel, mapel_kode: mapelKode, guru_kode: guruKode };
}

function makeNilaiDocId(assignment, nipd) {
  const baseId = [
    assignment.tingkat,
    String(assignment.rombel || "").toUpperCase(),
    String(assignment.mapel_kode || "").toUpperCase(),
    String(nipd || "")
  ].join("_");
  const termId = typeof getActiveTermId === "function" ? getActiveTermId() : "legacy";
  return termId === "legacy" ? baseId : `${termId}_${baseId}`;
}

function setSemuaDataNilai(items = []) {
  const byId = new Map();
  items.forEach(item => {
    if (!item?.id) return;
    const current = byId.get(item.id);
    const currentUpdatedAt = String(current?.updated_at || "");
    const nextUpdatedAt = String(item?.updated_at || "");
    if (!current || nextUpdatedAt >= currentUpdatedAt) {
      byId.set(item.id, { ...item });
    }
  });
  semuaDataNilai = Array.from(byId.values());
}

function getNilaiItemTimestamp(item) {
  const updatedAt = item?.updated_at || item?.data?.updated_at || "";
  const parsed = Date.parse(updatedAt);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getNilaiActiveTermId() {
  return typeof getActiveTermId === "function" ? getActiveTermId() : "legacy";
}

function isNilaiDocInActiveTerm(item = {}) {
  if (typeof isActiveTermDoc === "function") return isActiveTermDoc(item);
  const activeTermId = getNilaiActiveTermId();
  if (!item?.term_id) return activeTermId === "legacy";
  return String(item.term_id || "") === String(activeTermId || "");
}

function isNilaiDocMatchingAssignment(item = {}, assignment = {}) {
  const tingkat = String(assignment.tingkat || "").trim();
  const rombel = String(assignment.rombel || "").trim().toUpperCase();
  const mapelKode = String(assignment.mapel_kode || "").trim().toUpperCase();
  const itemKelas = getNilaiKelasParts(item.kelas || "").kelas;
  const assignmentKelas = getNilaiKelasParts(`${tingkat}${rombel}`).kelas;
  const sameClass = itemKelas
    ? itemKelas === assignmentKelas
    : String(item.tingkat || "").trim() === tingkat && String(item.rombel || "").trim().toUpperCase() === rombel;
  return isNilaiDocInActiveTerm(item)
    && sameClass
    && String(item.mapel_kode || "").trim().toUpperCase() === mapelKode;
}

function getNilaiRowsFromCacheForAssignment(assignment) {
  if (!assignment?.mapel_kode) return [];
  return semuaDataNilai.filter(item => isNilaiDocMatchingAssignment(item, assignment));
}

function syncCurrentNilaiAssignmentRows(assignment) {
  const assignmentId = assignment?.mapel_kode ? makeNilaiAssignmentId(assignment) : "";
  const byId = new Map();
  if (assignmentId && assignmentId === currentNilaiAssignmentId) {
    currentNilaiAssignmentRows.forEach(item => {
      if (item?.id) byId.set(item.id, item);
    });
  }
  getNilaiRowsFromCacheForAssignment(assignment).forEach(item => {
    if (!item?.id) return;
    const current = byId.get(item.id);
    if (!current || getNilaiItemTimestamp(item) >= getNilaiItemTimestamp(current)) {
      byId.set(item.id, item);
    }
  });
  currentNilaiAssignmentId = assignmentId;
  currentNilaiAssignmentRows = Array.from(byId.values());
}

function getNilaiForStudent(assignment, nipd) {
  const docId = makeNilaiDocId(assignment, nipd);
  for (let index = currentNilaiAssignmentRows.length - 1; index >= 0; index -= 1) {
    if (currentNilaiAssignmentRows[index]?.id === docId) return currentNilaiAssignmentRows[index];
  }
  for (let index = semuaDataNilai.length - 1; index >= 0; index -= 1) {
    if (semuaDataNilai[index]?.id === docId) return semuaDataNilai[index];
  }
  const matchesStudent = item => String(item?.nipd || "") === String(nipd || "");
  const candidates = [
    ...currentNilaiAssignmentRows.filter(item => matchesStudent(item) && isNilaiDocMatchingAssignment(item, assignment)),
    ...semuaDataNilai.filter(item => matchesStudent(item) && isNilaiDocMatchingAssignment(item, assignment))
  ];
  if (!candidates.length) return null;
  return [...candidates].sort((a, b) => getNilaiItemTimestamp(b) - getNilaiItemTimestamp(a))[0] || null;
}

function getNilaiActiveTermPayload() {
  const term = typeof getActiveSemesterContext === "function" ? getActiveSemesterContext() : { id: "legacy", semester: "", tahun: "" };
  return {
    term_id: term.id || "legacy",
    semester: term.semester || "",
    tahun_pelajaran: term.tahun || ""
  };
}

function getNilaiFieldValue(nilaiDoc, field, fallbackSingle = "") {
  if (!nilaiDoc) return "";
  if (nilaiDoc[field] !== undefined && nilaiDoc[field] !== null) return nilaiDoc[field];
  return fallbackSingle;
}

function getSelectedNilaiAssignment() {
  const select = document.getElementById("nilaiAssignmentSelect");
  return parseNilaiAssignmentId(select?.value || "");
}

function getStoredNilaiAssignmentId() {
  return localStorage.getItem(NILAI_LAST_ASSIGNMENT_KEY) || "";
}

function storeNilaiAssignmentId(value = "") {
  if (!value) {
    localStorage.removeItem(NILAI_LAST_ASSIGNMENT_KEY);
    return;
  }
  localStorage.setItem(NILAI_LAST_ASSIGNMENT_KEY, value);
}

function makeNilaiAssignmentHydrationKey(assignment) {
  return [
    typeof getActiveTermId === "function" ? getActiveTermId() : "legacy",
    assignment.tingkat || "",
    String(assignment.rombel || "").toUpperCase(),
    String(assignment.mapel_kode || "").toUpperCase(),
    String(assignment.guru_kode || "").toUpperCase()
  ].join("|");
}

function getNilaiStudentsForAssignment(assignment) {
  const mapel = getNilaiMapel(assignment.mapel_kode);
  return semuaDataNilaiSiswa
    .map(siswa => ({ ...siswa, kelasNilaiParts: getNilaiKelasBayanganParts(siswa) }))
    .filter(siswa =>
      siswa.kelasNilaiParts.tingkat === String(assignment.tingkat || "") &&
      siswa.kelasNilaiParts.rombel === String(assignment.rombel || "").toUpperCase() &&
      isNilaiSiswaEligibleForMapel(siswa, mapel)
    )
    .sort((a, b) => {
      if (window.AppUtils?.compareStudentPlacement) return window.AppUtils.compareStudentPlacement(a, b);
      return String(a.nama || "").localeCompare(String(b.nama || ""), undefined, { sensitivity: "base" });
    });
}

function renderInputNilaiPage() {
  const user = getCurrentNilaiUser();
  const role = user.role || "admin";
  const hasCoordinatorAccess = typeof canUseCoordinatorAccess === "function" && canUseCoordinatorAccess();
  const roleDescription = role === "guru" && hasCoordinatorAccess && currentNilaiAccessMode === "koordinator"
    ? `Koordinator dapat menginput nilai semua guru pada jenjang ${((typeof getCurrentCoordinatorLevelsSync === "function" ? getCurrentCoordinatorLevelsSync() : []).join(", ") || "-")}.`
    : role === "guru"
      ? "Guru hanya melihat kelas dan mapel yang diajar."
    : role === "koordinator"
      ? `Koordinator melihat nilai sesuai jenjang ${((typeof getCurrentCoordinatorLevelsSync === "function" ? getCurrentCoordinatorLevelsSync() : []).join(", ") || "-")}.`
      : "Admin dapat menginput nilai untuk seluruh siswa.";
  return `
    <div class="card">
      <div class="kelas-bayangan-head nilai-page-head">
        <div>
          <span class="dashboard-eyebrow">Nilai</span>
          <h2>Input Nilai</h2>
          <p>${roleDescription}</p>
        </div>
      </div>

      <div class="nilai-control-panel">
        <label class="form-group">
          <span>Pilih kelas dan mapel</span>
          <select id="nilaiAssignmentSelect" onchange="handleNilaiAssignmentChange()"></select>
        </label>
        <div class="nilai-control-actions">
          <button type="button" class="btn-secondary" onclick="downloadNilaiTemplate()">Download Template</button>
          <button type="button" class="btn-secondary" onclick="triggerNilaiImport()">Import Nilai</button>
          <button type="button" class="btn-primary" onclick="saveNilaiAssignment()">Simpan Nilai</button>
          <input id="nilaiImportInput" type="file" accept=".xlsx,.xls" onchange="importNilaiExcel(event)" hidden>
        </div>
      </div>

      <div id="nilaiAssignmentInfo" class="nilai-assignment-info">Memuat data pembagian mengajar...</div>

      <div id="nilaiTableContainer" class="table-container mapel-table-container"></div>

      <div id="nilaiSavingOverlay" class="nilai-saving-overlay" style="display:none;" aria-hidden="true">
        <div class="nilai-saving-card">
          <div class="nilai-saving-spinner" aria-hidden="true"></div>
          <strong>Menyimpan nilai...</strong>
          <span>Mohon tunggu sebentar, data sedang dikirim.</span>
        </div>
      </div>

      <div id="nilaiPreviewModal" class="preview-modal" style="display:none;" onclick="handleNilaiPreviewBackdrop(event)">
        <div class="preview-modal-content">
          <div id="nilaiPreviewContainer"></div>
        </div>
      </div>
    </div>
  `;
}

function renderRekapNilaiPage() {
  const user = getCurrentNilaiUser();
  const role = user.role || "admin";
  const hasCoordinatorAccess = typeof canUseCoordinatorAccess === "function" && canUseCoordinatorAccess();
  const roleDescription = role === "guru" && hasCoordinatorAccess && currentNilaiAccessMode === "koordinator"
    ? `Koordinator dapat melihat rekap nilai pada jenjang ${((typeof getCurrentCoordinatorLevelsSync === "function" ? getCurrentCoordinatorLevelsSync() : []).join(", ") || "-")}.`
    : role === "guru"
      ? "Guru melihat rekap kelas yang dapat diakses sesuai assignment."
      : role === "koordinator"
        ? `Koordinator melihat rekap nilai sesuai jenjang ${((typeof getCurrentCoordinatorLevelsSync === "function" ? getCurrentCoordinatorLevelsSync() : []).join(", ") || "-")}.`
        : "Admin dapat melihat rekap nilai seluruh kelas.";
  return `
    <div class="card">
      <div class="kelas-bayangan-head nilai-page-head">
        <div>
          <span class="dashboard-eyebrow">Nilai</span>
          <h2>Rekap Nilai per Kelas</h2>
          <p>${roleDescription}</p>
        </div>
      </div>

      <div class="nilai-control-panel">
        <label class="form-group">
          <span>Pilih kelas</span>
          <select id="nilaiRekapClassSelect" onchange="renderRekapNilaiState()"></select>
        </label>
      </div>

      <div id="nilaiRekapInfo" class="nilai-assignment-info">Memuat data rekap nilai...</div>
      <div id="nilaiRekapContainer" class="table-container mapel-table-container"></div>
    </div>
  `;
}

function setNilaiSavingState(isSaving, message = "Menyimpan nilai...") {
  isNilaiSaving = Boolean(isSaving);
  const overlay = document.getElementById("nilaiSavingOverlay");
  if (!overlay) return;
  const title = overlay.querySelector("strong");
  const subtitle = overlay.querySelector("span");
  if (title) title.textContent = message || "Menyimpan nilai...";
  if (subtitle) subtitle.textContent = isNilaiSaving
    ? "Mohon tunggu sebentar, data sedang dikirim."
    : "";
  overlay.style.display = isNilaiSaving ? "flex" : "none";
  overlay.setAttribute("aria-hidden", isNilaiSaving ? "false" : "true");
  document.body.classList.toggle("nilai-saving-active", isNilaiSaving);
}

function loadRealtimeInputNilai() {
  if (unsubscribeNilaiSiswa) unsubscribeNilaiSiswa();
  if (unsubscribeNilaiMapel) unsubscribeNilaiMapel();
  if (unsubscribeNilaiMengajar) unsubscribeNilaiMengajar();
  if (unsubscribeNilaiKelas) unsubscribeNilaiKelas();
  if (unsubscribeNilaiData) unsubscribeNilaiData();

  const documentsApi = getNilaiDocumentsApi();
  const siswaQuery = typeof getSemesterCollectionQuery === "function" ? getSemesterCollectionQuery("siswa", "nama") : documentsApi.collection("siswa").orderBy("nama");
  unsubscribeNilaiSiswa = siswaQuery.onSnapshot(snapshot => {
    semuaDataNilaiSiswa = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderNilaiPageState();
  });
  unsubscribeNilaiMapel = documentsApi.collection("mapel_bayangan").orderBy("kode_mapel").onSnapshot(snapshot => {
    semuaDataNilaiMapel = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderNilaiPageState();
  });
  unsubscribeNilaiMengajar = documentsApi.collection("mengajar_bayangan").onSnapshot(snapshot => {
    semuaDataNilaiMengajar = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderNilaiPageState();
  });
  unsubscribeNilaiKelas = typeof getSemesterCollectionQuery === "function"
    ? getSemesterCollectionQuery("kelas")
      .onSnapshot(snapshot => {
        semuaDataNilaiKelas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderNilaiPageState();
      })
    : documentsApi.collection("kelas").onSnapshot(snapshot => {
        semuaDataNilaiKelas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderNilaiPageState();
      });
  unsubscribeNilaiData = documentsApi.collection("nilai").onSnapshot(snapshot => {
    setSemuaDataNilai(snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(item => typeof isActiveTermDoc === "function" ? isActiveTermDoc(item) : true));
    renderNilaiPageState();
  });
}

function loadRealtimeRekapNilai() {
  if (unsubscribeNilaiSiswa) unsubscribeNilaiSiswa();
  if (unsubscribeNilaiMapel) unsubscribeNilaiMapel();
  if (unsubscribeNilaiMengajar) unsubscribeNilaiMengajar();
  if (unsubscribeNilaiKelas) unsubscribeNilaiKelas();
  if (unsubscribeNilaiData) unsubscribeNilaiData();

  const documentsApi = getNilaiDocumentsApi();
  const siswaQuery = typeof getSemesterCollectionQuery === "function" ? getSemesterCollectionQuery("siswa", "nama") : documentsApi.collection("siswa").orderBy("nama");
  unsubscribeNilaiSiswa = siswaQuery.onSnapshot(snapshot => {
    semuaDataNilaiSiswa = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderRekapNilaiState();
  });
  unsubscribeNilaiMapel = documentsApi.collection("mapel_bayangan").orderBy("kode_mapel").onSnapshot(snapshot => {
    semuaDataNilaiMapel = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderRekapNilaiState();
  });
  unsubscribeNilaiMengajar = documentsApi.collection("mengajar_bayangan").onSnapshot(snapshot => {
    semuaDataNilaiMengajar = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderRekapNilaiState();
  });
  unsubscribeNilaiKelas = typeof getSemesterCollectionQuery === "function"
    ? getSemesterCollectionQuery("kelas")
      .onSnapshot(snapshot => {
        semuaDataNilaiKelas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderRekapNilaiState();
      })
    : documentsApi.collection("kelas").onSnapshot(snapshot => {
        semuaDataNilaiKelas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderRekapNilaiState();
      });
  unsubscribeNilaiData = documentsApi.collection("nilai").onSnapshot(snapshot => {
    setSemuaDataNilai(snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(item => typeof isActiveTermDoc === "function" ? isActiveTermDoc(item) : true));
    renderRekapNilaiState();
  });
}

function renderNilaiPageState() {
  const assignmentSelect = document.getElementById("nilaiAssignmentSelect");
  const isSelectingAssignment = document.activeElement === assignmentSelect;
  const isEditingTable = document.activeElement?.classList?.contains("nilai-input-cell");
  renderNilaiAssignmentOptions();
  syncCurrentNilaiAssignmentRows(getSelectedNilaiAssignment());
  if (isSelectingAssignment || isEditingTable) return;
  renderNilaiTableState();
}

function getNilaiAccessibleClasses() {
  const seen = new Map();
  getNilaiAccessibleAssignments().forEach(item => {
    const key = getNilaiClassKey(item);
    if (seen.has(key)) return;
    seen.set(key, {
      tingkat: String(item.tingkat || ""),
      rombel: String(item.rombel || "").toUpperCase(),
      label: `${item.tingkat} ${String(item.rombel || "").toUpperCase()}`
    });
  });
  return [...seen.values()].sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true, sensitivity: "base" }));
}

function getStoredNilaiRekapClassKey() {
  return localStorage.getItem(NILAI_REKAP_LAST_CLASS_KEY) || "";
}

function storeNilaiRekapClassKey(value = "") {
  if (!value) {
    localStorage.removeItem(NILAI_REKAP_LAST_CLASS_KEY);
    return;
  }
  localStorage.setItem(NILAI_REKAP_LAST_CLASS_KEY, value);
}

function getSelectedNilaiRekapClass() {
  const select = document.getElementById("nilaiRekapClassSelect");
  const [tingkat = "", rombel = ""] = String(select?.value || "").split("|");
  return { tingkat, rombel };
}

function renderNilaiRekapClassOptions() {
  const select = document.getElementById("nilaiRekapClassSelect");
  if (!select) return;
  const classes = getNilaiAccessibleClasses();
  const currentValue = select.value || getStoredNilaiRekapClassKey();
  select.innerHTML = classes.length
    ? classes.map(item => `<option value="${escapeNilaiHtml(`${item.tingkat}|${item.rombel}`)}">${escapeNilaiHtml(item.label)}</option>`).join("")
    : `<option value="">Tidak ada kelas yang bisa diakses</option>`;
  if (currentValue && Array.from(select.options).some(option => option.value === currentValue)) {
    select.value = currentValue;
  }
  storeNilaiRekapClassKey(select.value || "");
}

function getNilaiAssignmentsForClass(tingkat = "", rombel = "") {
  const targetClassKey = getNilaiKelasParts(`${tingkat || ""}${rombel || ""}`).kelas;
  return getNilaiAccessibleAssignments()
    .filter(item =>
      getNilaiClassKey(item) === targetClassKey
    )
    .sort((a, b) => {
      const mapelA = getNilaiMapel(a.mapel_kode) || {};
      const mapelB = getNilaiMapel(b.mapel_kode) || {};
      const mappingA = Number(mapelA.mapping ?? Number.MAX_SAFE_INTEGER);
      const mappingB = Number(mapelB.mapping ?? Number.MAX_SAFE_INTEGER);
      if (mappingA !== mappingB) return mappingA - mappingB;

      const kodeA = String(a.mapel_kode || "").toUpperCase();
      const kodeB = String(b.mapel_kode || "").toUpperCase();
      return kodeA.localeCompare(kodeB, undefined, { sensitivity: "base" });
    });
}

function renderRekapNilaiInfo(tingkat = "", rombel = "", assignments = [], students = []) {
  const info = document.getElementById("nilaiRekapInfo");
  if (!info) return;
  if (!tingkat || !rombel) {
    info.innerHTML = "Pilih kelas untuk melihat rekap nilai.";
    return;
  }
  info.innerHTML = `
    <span><strong>Kelas</strong>${escapeNilaiHtml(`${tingkat} ${rombel}`)}</span>
    <span><strong>Mapel</strong>${assignments.length}</span>
    <span><strong>Siswa</strong>${students.length}</span>
  `;
}

function renderRekapNilaiState() {
  renderNilaiRekapClassOptions();
  const container = document.getElementById("nilaiRekapContainer");
  const select = document.getElementById("nilaiRekapClassSelect");
  if (!container || !select) return;

  storeNilaiRekapClassKey(select.value || "");
  const { tingkat, rombel } = getSelectedNilaiRekapClass();
  const assignments = getNilaiAssignmentsForClass(tingkat, rombel);
  const students = tingkat && rombel
    ? semuaDataNilaiSiswa
      .map(siswa => ({ ...siswa, kelasNilaiParts: getNilaiKelasBayanganParts(siswa) }))
      .filter(siswa =>
        siswa.kelasNilaiParts.tingkat === String(tingkat || "")
        && siswa.kelasNilaiParts.rombel === String(rombel || "").toUpperCase()
      )
      .sort((a, b) => {
        if (window.AppUtils?.compareStudentPlacement) return window.AppUtils.compareStudentPlacement(a, b);
        return String(a.nama || "").localeCompare(String(b.nama || ""), undefined, { sensitivity: "base" });
      })
    : [];

  renderRekapNilaiInfo(tingkat, rombel, assignments, students);

  if (!tingkat || !rombel) {
    container.innerHTML = `<div class="empty-panel">Belum ada kelas yang bisa ditampilkan pada rekap nilai.</div>`;
    return;
  }

  if (assignments.length === 0) {
    container.innerHTML = `<div class="empty-panel">Belum ada mapel pada kelas ${escapeNilaiHtml(`${tingkat} ${rombel}`)}.</div>`;
    return;
  }

  if (students.length === 0) {
    container.innerHTML = `<div class="empty-panel">Belum ada siswa pada kelas ${escapeNilaiHtml(`${tingkat} ${rombel}`)}.</div>`;
    return;
  }

  container.innerHTML = `
    <table class="mapel-table nilai-table nilai-rekap-table">
      <thead>
        <tr>
          <th rowspan="2">No</th>
          <th rowspan="2">Nama</th>
          <th rowspan="2">NIPD</th>
          <th rowspan="2">L/P</th>
          ${assignments.map(item => {
            const mapel = getNilaiMapel(item.mapel_kode);
            const code = String(item.mapel_kode || "").toUpperCase();
            const title = mapel?.nama_mapel ? `${code} - ${mapel.nama_mapel}` : code;
            return `<th colspan="4" class="nilai-rekap-mapel-group nilai-rekap-mapel-boundary" title="${escapeNilaiHtml(title)}">${escapeNilaiHtml(code)}</th>`;
          }).join("")}
        </tr>
        <tr>
          ${assignments.map(() => `
            <th class="nilai-uh-head nilai-rekap-subcol nilai-rekap-mapel-start">UH 1</th>
            <th class="nilai-uh-head nilai-rekap-subcol">UH 2</th>
            <th class="nilai-uh-head nilai-rekap-subcol nilai-rekap-before-pts">UH 3</th>
            <th class="nilai-pts-head nilai-rekap-subcol nilai-rekap-mapel-end">PTS</th>
          `).join("")}
        </tr>
      </thead>
      <tbody>
        ${students.map((siswa, index) => `
          <tr>
            <td>${index + 1}</td>
            <td class="nilai-student-name">${escapeNilaiHtml(siswa.nama || "-")}</td>
            <td>${escapeNilaiHtml(siswa.nipd || "-")}</td>
            <td>${escapeNilaiHtml(getNilaiGenderLabel(siswa))}</td>
            ${assignments.map(item => {
              const nilaiDoc = getNilaiForStudent(item, siswa.nipd);
              const fallbackNilai = nilaiDoc?.nilai ?? "";
              const nilaiUh1 = getNilaiFieldValue(nilaiDoc, "uh_1", fallbackNilai);
              const nilaiUh2 = getNilaiFieldValue(nilaiDoc, "uh_2", "");
              const nilaiUh3 = getNilaiFieldValue(nilaiDoc, "uh_3", "");
              const nilaiPts = getNilaiFieldValue(nilaiDoc, "pts", "");
              return `
                <td class="nilai-rekap-subcol nilai-rekap-mapel-start">${escapeNilaiHtml(nilaiUh1 === "" ? "-" : nilaiUh1)}</td>
                <td class="nilai-rekap-subcol">${escapeNilaiHtml(nilaiUh2 === "" ? "-" : nilaiUh2)}</td>
                <td class="nilai-rekap-subcol nilai-rekap-before-pts">${escapeNilaiHtml(nilaiUh3 === "" ? "-" : nilaiUh3)}</td>
                <td class="nilai-rekap-subcol nilai-rekap-mapel-end">${escapeNilaiHtml(nilaiPts === "" ? "-" : nilaiPts)}</td>
              `;
            }).join("")}
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

async function handleNilaiAssignmentChange() {
  const assignment = getSelectedNilaiAssignment();
  syncCurrentNilaiAssignmentRows(assignment);
  renderNilaiTableState();
  if (!assignment?.mapel_kode) return;
  try {
    const changed = await hydrateNilaiCacheForAssignment(assignment);
    syncCurrentNilaiAssignmentRows(assignment);
    if (changed || currentNilaiAssignmentRows.length > 0) {
      renderNilaiTableState();
    }
  } catch (error) {
    console.error("hydrate nilai assignment failed", error);
  }
}

function renderNilaiAssignmentOptions() {
  const select = document.getElementById("nilaiAssignmentSelect");
  if (!select) return;
  const currentValue = select.value || getStoredNilaiAssignmentId();
  const assignments = getNilaiAccessibleAssignments();
  const nextOptions = assignments.length
    ? assignments.map(item => {
      const mapel = getNilaiMapel(item.mapel_kode);
      const label = `${item.tingkat} ${item.rombel} - ${mapel?.nama_mapel || item.mapel_kode}`;
      const value = makeNilaiAssignmentId(item);
      return `<option value="${escapeNilaiHtml(value)}">${escapeNilaiHtml(label)}</option>`;
    }).join("")
    : `<option value="">Tidak ada pembagian mengajar yang bisa diakses</option>`;
  if (select.innerHTML !== nextOptions) {
    select.innerHTML = nextOptions;
  }
  if (currentValue && Array.from(select.options).some(option => option.value === currentValue)) {
    select.value = currentValue;
  } else if (!select.value && select.options.length > 0) {
    select.value = select.options[0].value;
  }
  storeNilaiAssignmentId(select.value || "");
}

function renderNilaiTableState() {
  const container = document.getElementById("nilaiTableContainer");
  const select = document.getElementById("nilaiAssignmentSelect");
  if (!container || !select) return;
  storeNilaiAssignmentId(select.value || "");
  const assignment = parseNilaiAssignmentId(select.value);
  syncCurrentNilaiAssignmentRows(assignment);
  renderNilaiAssignmentInfo(assignment);
  if (!assignment.mapel_kode) {
    container.innerHTML = `<div class="empty-panel">Belum ada data pembagian mengajar kelas bayangan.</div>`;
    return;
  }

  const students = getNilaiStudentsForAssignment(assignment);
  if (students.length === 0) {
    container.innerHTML = `<div class="empty-panel">Belum ada siswa pada kelas bayangan ${escapeNilaiHtml(`${assignment.tingkat} ${assignment.rombel}`)}.</div>`;
    return;
  }

  container.innerHTML = `
    <table class="mapel-table nilai-table">
      <thead>
        <tr>
          <th>No</th>
          <th>Nama Siswa</th>
          <th class="nilai-uh-head">UH 1</th>
          <th class="nilai-uh-head">UH 2</th>
          <th class="nilai-uh-head">UH 3</th>
          <th class="nilai-pts-head">PTS</th>
        </tr>
      </thead>
      <tbody>
        ${students.map((siswa, index) => {
          const nilaiDoc = getNilaiForStudent(assignment, siswa.nipd);
          const fallbackNilai = nilaiDoc?.nilai ?? "";
          const nilaiUh1 = getNilaiFieldValue(nilaiDoc, "uh_1", fallbackNilai);
          const nilaiUh2 = getNilaiFieldValue(nilaiDoc, "uh_2", "");
          const nilaiUh3 = getNilaiFieldValue(nilaiDoc, "uh_3", "");
          const nilaiPts = getNilaiFieldValue(nilaiDoc, "pts", "");
          return `
            <tr>
              <td>${index + 1}</td>
              <td class="nilai-student-name">${escapeNilaiHtml(siswa.nama || "-")}<small>${escapeNilaiHtml(siswa.nipd || "-")} | ${escapeNilaiHtml(siswa.kelas || "-")}</small></td>
              <td><input class="nilai-input-cell nilai-input-uh" data-row="${index}" data-field="uh1" id="nilai-uh1-${escapeNilaiHtml(siswa.nipd)}" type="number" min="0" max="100" value="${escapeNilaiHtml(nilaiUh1)}"></td>
              <td><input class="nilai-input-cell nilai-input-uh" data-row="${index}" data-field="uh2" id="nilai-uh2-${escapeNilaiHtml(siswa.nipd)}" type="number" min="0" max="100" value="${escapeNilaiHtml(nilaiUh2)}"></td>
              <td><input class="nilai-input-cell nilai-input-uh" data-row="${index}" data-field="uh3" id="nilai-uh3-${escapeNilaiHtml(siswa.nipd)}" type="number" min="0" max="100" value="${escapeNilaiHtml(nilaiUh3)}"></td>
              <td><input class="nilai-input-cell nilai-input-pts" data-row="${index}" data-field="pts" id="nilai-pts-${escapeNilaiHtml(siswa.nipd)}" type="number" min="0" max="100" value="${escapeNilaiHtml(nilaiPts)}"></td>
            </tr>
          `;
        }).join("")}
      </tbody>
    </table>
  `;
  setupNilaiTableInputs();
}

function normalizeNilaiManualInputValue(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const numberValue = Number(raw);
  if (!Number.isFinite(numberValue)) return "";
  return String(Math.max(0, Math.min(100, numberValue)));
}

function getNormalizedNilaiCellValueByRow(rowIndex, field) {
  const input = getNilaiTableInput(rowIndex, field);
  if (!input) throw new Error(`Input nilai ${String(field || "").toUpperCase()} pada baris ${Number(rowIndex) + 1} tidak ditemukan`);
  const normalized = normalizeNilaiManualInputValue(input.value);
  input.value = normalized;
  return normalized;
}

function cleanNilaiPayloadValue(value) {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(cleanNilaiPayloadValue);
  if (!value || typeof value !== "object") return value;
  if (typeof value.toDate === "function") return value.toDate().toISOString();
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, item]) => item !== undefined)
      .map(([key, item]) => [key, cleanNilaiPayloadValue(item)])
  );
}

async function upsertNilaiRows(rows, assignment) {
  if (!rows.length) return;

  const supabaseClient = window.supabaseClient;
  const documentsTable = window.supabaseConfig?.documentsTable || "app_documents";

  if (supabaseClient?.from) {
    for (let index = 0; index < rows.length; index += 200) {
      const payloadRows = rows.slice(index, index + 200).map(row => ({
        collection_path: "nilai",
        id: makeNilaiDocId(assignment, row.siswa.nipd),
        data: cleanNilaiPayloadValue(row.payload),
        updated_at: new Date().toISOString()
      }));
      const { error } = await supabaseClient
        .from(documentsTable)
        .upsert(payloadRows, { onConflict: "collection_path,id" });
      if (error) throw error;
    }
    return;
  }

  const documentsApi = getNilaiDocumentsApi();
  for (let index = 0; index < rows.length; index += 450) {
    const batch = documentsApi.batch();
    rows.slice(index, index + 450).forEach(row => {
      const docId = makeNilaiDocId(assignment, row.siswa.nipd);
      batch.set(documentsApi.collection("nilai").doc(docId), row.payload, { merge: true });
    });
    await batch.commit();
  }
}

function mergeSavedNilaiRowsIntoCache(rows, assignment) {
  const previousSerialized = JSON.stringify(semuaDataNilai);
  const nextItems = rows.map(row => ({
    id: makeNilaiDocId(assignment, row.siswa.nipd),
    ...cleanNilaiPayloadValue(row.payload)
  }));
  setSemuaDataNilai([...semuaDataNilai, ...nextItems]);
  return JSON.stringify(semuaDataNilai) !== previousSerialized;
}

async function hydrateNilaiCacheForAssignment(assignment, options = {}) {
  if (!assignment?.mapel_kode) return false;
  const supabaseClient = window.supabaseClient;
  const documentsTable = window.supabaseConfig?.documentsTable || "app_documents";
  if (!supabaseClient?.from) return false;

  const key = makeNilaiAssignmentHydrationKey(assignment);
  if (!options.force && nilaiHydratedAssignmentKeys.has(key)) return false;

  const { data, error } = await supabaseClient
    .from(documentsTable)
    .select("id,data")
    .eq("collection_path", "nilai")
    .filter("data->>tingkat", "eq", String(assignment.tingkat || ""))
    .filter("data->>rombel", "eq", String(assignment.rombel || "").toUpperCase())
    .filter("data->>mapel_kode", "eq", String(assignment.mapel_kode || "").toUpperCase())
    .filter("data->>guru_kode", "eq", String(assignment.guru_kode || "").toUpperCase());

  if (error) throw error;

  nilaiHydratedAssignmentKeys.add(key);
  const rows = (data || [])
    .filter(item => typeof isActiveTermDoc === "function" ? isActiveTermDoc(item?.data || {}) : true)
    .map(item => ({
    siswa: { nipd: item?.data?.nipd || String(item?.id || "").split("_").at(-1) || "" },
    payload: { ...(item?.data || {}) }
  }));
  currentNilaiAssignmentId = makeNilaiAssignmentId(assignment);
  currentNilaiAssignmentRows = rows.map(row => ({
    id: makeNilaiDocId(assignment, row.siswa.nipd),
    ...cleanNilaiPayloadValue(row.payload)
  }));
  return mergeSavedNilaiRowsIntoCache(rows, assignment);
}

function getNilaiTableInput(rowIndex, field) {
  return document.querySelector(`.nilai-input-cell[data-row="${rowIndex}"][data-field="${field}"]`);
}

function updateNilaiInputDependencies(rowIndex) {
  const uh1 = getNilaiTableInput(rowIndex, "uh1");
  const uh2 = getNilaiTableInput(rowIndex, "uh2");
  const uh3 = getNilaiTableInput(rowIndex, "uh3");
  if (!uh1 || !uh2 || !uh3) return;

  const hasUh1 = String(uh1.value || "").trim() !== "";
  uh2.disabled = !hasUh1;
  uh2.classList.toggle("is-disabled", !hasUh1);
  if (!hasUh1) uh2.value = "";

  const hasUh2 = String(uh2.value || "").trim() !== "";
  uh3.disabled = !hasUh2;
  uh3.classList.toggle("is-disabled", !hasUh2);
  if (!hasUh2) uh3.value = "";
}

function handleNilaiTableInput(event) {
  const input = event.target;
  if (!input?.classList?.contains("nilai-input-cell")) return;
  input.value = normalizeNilaiManualInputValue(input.value);
  const rowIndex = Number(input.dataset.row);
  if (!Number.isNaN(rowIndex)) updateNilaiInputDependencies(rowIndex);
}

function handleNilaiTableKeydown(event) {
  const input = event.target;
  if (!input?.classList?.contains("nilai-input-cell")) return;
  if (event.key !== "Enter") return;
  event.preventDefault();
  const rowIndex = Number(input.dataset.row);
  const field = String(input.dataset.field || "");
  if (Number.isNaN(rowIndex) || !field) return;
  const nextInput = getNilaiTableInput(rowIndex + 1, field);
  if (nextInput && !nextInput.disabled) {
    nextInput.focus();
    nextInput.select?.();
  }
}

function setupNilaiTableInputs() {
  const container = document.getElementById("nilaiTableContainer");
  if (!container) return;
  container.removeEventListener("input", handleNilaiTableInput);
  container.removeEventListener("keydown", handleNilaiTableKeydown);
  container.addEventListener("input", handleNilaiTableInput);
  container.addEventListener("keydown", handleNilaiTableKeydown);
  container.querySelectorAll(".nilai-input-cell").forEach(input => {
    input.value = normalizeNilaiManualInputValue(input.value);
  });
  const rowIndexes = [...new Set(
    [...container.querySelectorAll(".nilai-input-cell")]
      .map(input => Number(input.dataset.row))
      .filter(value => !Number.isNaN(value))
  )];
  rowIndexes.forEach(updateNilaiInputDependencies);
}

function renderNilaiAssignmentInfo(assignment) {
  const info = document.getElementById("nilaiAssignmentInfo");
  if (!info) return;
  if (!assignment.mapel_kode) {
    info.innerHTML = "Pilih kelas dan mapel untuk melihat daftar siswa.";
    return;
  }
  const mapel = getNilaiMapel(assignment.mapel_kode);
  const siswaCount = getNilaiStudentsForAssignment(assignment).length;
  info.innerHTML = `
    <span><strong>Kelas</strong>${escapeNilaiHtml(`${assignment.tingkat} ${assignment.rombel}`)}</span>
    <span><strong>Mapel</strong>${escapeNilaiHtml(mapel?.nama_mapel || assignment.mapel_kode)}</span>
    <span><strong>Siswa</strong>${siswaCount}</span>
  `;
}

function getNilaiTemplateRows(assignment) {
  return getNilaiStudentsForAssignment(assignment).map((siswa, index) => ({
    NO: index + 1,
    NIPD: siswa.nipd || "",
    NAMA: siswa.nama || "",
    UH1: "",
    UH2: "",
    UH3: "",
    PTS: ""
  }));
}

function applyNilaiTemplateStyles(worksheet, rowCount) {
  const range = XLSX.utils.decode_range(worksheet["!ref"]);
  const headerStyle = {
    font: { bold: true, color: { rgb: "0F172A" } },
    fill: { fgColor: { rgb: "F8FAFC" } },
    border: {
      top: { style: "thin", color: { rgb: "CBD5E1" } },
      bottom: { style: "thin", color: { rgb: "CBD5E1" } },
      left: { style: "thin", color: { rgb: "CBD5E1" } },
      right: { style: "thin", color: { rgb: "CBD5E1" } }
    },
    protection: { locked: true }
  };
  const uhStyle = {
    fill: { fgColor: { rgb: "DBEAFE" } },
    border: headerStyle.border,
    protection: { locked: false }
  };
  const ptsStyle = {
    fill: { fgColor: { rgb: "DCFCE7" } },
    border: headerStyle.border,
    protection: { locked: false }
  };
  const lockedStyle = {
    border: headerStyle.border,
    protection: { locked: true }
  };

  for (let col = range.s.c; col <= range.e.c; col++) {
    const cell = worksheet[XLSX.utils.encode_cell({ r: 0, c: col })];
    if (cell) cell.s = col >= 3 && col <= 5 ? { ...headerStyle, fill: { fgColor: { rgb: "BFDBFE" } } }
      : col === 6 ? { ...headerStyle, fill: { fgColor: { rgb: "BBF7D0" } } }
      : headerStyle;
  }

  for (let row = 1; row <= rowCount; row++) {
    for (let col = range.s.c; col <= range.e.c; col++) {
      const address = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = worksheet[address] || { t: "s", v: "" };
      worksheet[address] = cell;
      cell.s = col >= 3 && col <= 5 ? uhStyle : col === 6 ? ptsStyle : lockedStyle;
    }
  }

  worksheet["!cols"] = [
    { wch: 6 }, { wch: 14 }, { wch: 30 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }
  ];
  // Sheet protection is intentionally not enabled because the browser XLSX build
  // can ignore per-cell unlock styles, causing every cell to be locked in Excel.
}

async function downloadNilaiTemplate() {
  await ensureSpreadsheetLibraries({ needsExcelJs: true });
  const assignment = getSelectedNilaiAssignment();
  if (!assignment.mapel_kode) {
    Swal.fire("Pilih kelas dan mapel", "Template dibuat berdasarkan kelas dan mapel yang dipilih.", "warning");
    return;
  }

  const rows = getNilaiTemplateRows(assignment);
  if (rows.length === 0) {
    Swal.fire("Tidak ada siswa", "Belum ada siswa pada kelas bayangan ini.", "warning");
    return;
  }

  const headers = ["NO", "NIPD", "NAMA", "UH1", "UH2", "UH3", "PTS"];
  if (window.ExcelJS) {
    await downloadNilaiTemplateExcelJs(rows, assignment);
    return;
  }

  const worksheet = XLSX.utils.json_to_sheet(rows, { header: headers });
  applyNilaiTemplateStyles(worksheet, rows.length);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Template Nilai");
  XLSX.writeFile(workbook, `template-nilai-${assignment.tingkat}${assignment.rombel}-${assignment.mapel_kode}.xlsx`);
}

async function downloadNilaiTemplateExcelJs(rows, assignment) {
  await ensureSpreadsheetLibraries({ needsExcelJs: true });
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Template Nilai");
  worksheet.columns = [
    { header: "NO", key: "NO", width: 6 },
    { header: "NIPD", key: "NIPD", width: 14 },
    { header: "NAMA", key: "NAMA", width: 32 },
    { header: "UH1", key: "UH1", width: 10 },
    { header: "UH2", key: "UH2", width: 10 },
    { header: "UH3", key: "UH3", width: 10 },
    { header: "PTS", key: "PTS", width: 10 }
  ];
  rows.forEach(row => worksheet.addRow(row));

  const border = {
    top: { style: "thin", color: { argb: "FFCBD5E1" } },
    left: { style: "thin", color: { argb: "FFCBD5E1" } },
    bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
    right: { style: "thin", color: { argb: "FFCBD5E1" } }
  };

  worksheet.eachRow((row, rowNumber) => {
    row.height = rowNumber === 1 ? 22 : 20;
    row.eachCell((cell, colNumber) => {
      cell.border = border;
      cell.alignment = { vertical: "middle", horizontal: colNumber <= 3 ? "left" : "center" };
      cell.protection = { locked: colNumber < 4 };
      if (rowNumber === 1) {
        cell.font = { bold: true, color: { argb: "FF0F172A" } };
        cell.alignment = { vertical: "middle", horizontal: "center" };
      }
      if (colNumber >= 4 && colNumber <= 6) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowNumber === 1 ? "FFBFDBFE" : "FFDBEAFE" } };
      } else if (colNumber === 7) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowNumber === 1 ? "FFBBF7D0" : "FFDCFCE7" } };
      } else if (rowNumber === 1) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
      }
    });
  });

  await worksheet.protect("", {
    selectLockedCells: false,
    selectUnlockedCells: true,
    formatCells: false,
    formatColumns: false,
    formatRows: false,
    insertColumns: false,
    insertRows: false,
    deleteColumns: false,
    deleteRows: false
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `template-nilai-${assignment.tingkat}${assignment.rombel}-${assignment.mapel_kode}.xlsx`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function triggerNilaiImport() {
  const input = document.getElementById("nilaiImportInput");
  if (input) input.click();
}

function normalizeNilaiImportNumber(value) {
  if (value === "" || value === null || value === undefined) return "";
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return NaN;
  if (numberValue < 0 || numberValue > 100) return NaN;
  return numberValue;
}

function hasNilaiImportValue(value) {
  return !(value === "" || value === null || value === undefined);
}

async function importNilaiExcel(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  nilaiLastImportInput = event.target;
  await ensureSpreadsheetLibraries();

  const assignment = getSelectedNilaiAssignment();
  if (!assignment.mapel_kode) {
    Swal.fire("Pilih kelas dan mapel", "Pilih kelas dan mapel sebelum import nilai.", "warning");
    event.target.value = "";
    return;
  }

  const reader = new FileReader();
  reader.onload = evt => {
    try {
      const data = new Uint8Array(evt.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet);
      const students = getNilaiStudentsForAssignment(assignment);

      nilaiPreviewData = json.map(row => {
        const nipd = String(getCellValue(row, ["NIPD", "NO_INDUK", "ID_SISWA"])).trim();
        const nama = String(getCellValue(row, ["NAMA", "NAMA_SISWA", "NAMA LENGKAP"])).trim();
        const kelas = String(getCellValue(row, ["KELAS", "KELAS_BAYANGAN"])).trim().toUpperCase();
        const mapelKode = String(getCellValue(row, ["MAPEL_KODE", "KODE_MAPEL", "MAPEL KODE"])).trim().toUpperCase();
        const uh1Raw = getCellValue(row, ["UH_1", "UH 1", "UH1", "NILAI_UH_1"]);
        const uh2Raw = getCellValue(row, ["UH_2", "UH 2", "UH2", "NILAI_UH_2"]);
        const uh3Raw = getCellValue(row, ["UH_3", "UH 3", "UH3", "NILAI_UH_3"]);
        const ptsRaw = getCellValue(row, ["PTS", "NILAI_PTS"]);
        const uh1 = normalizeNilaiImportNumber(uh1Raw);
        const uh2 = normalizeNilaiImportNumber(uh2Raw);
        const uh3 = normalizeNilaiImportNumber(uh3Raw);
        const pts = normalizeNilaiImportNumber(ptsRaw);
        const siswa = students.find(item => String(item.nipd || "") === nipd);
        const existing = siswa ? getNilaiForStudent(assignment, siswa.nipd) : null;
        const existingValues = {
          uh_1: getNilaiFieldValue(existing, "uh_1", existing?.nilai ?? ""),
          uh_2: getNilaiFieldValue(existing, "uh_2", ""),
          uh_3: getNilaiFieldValue(existing, "uh_3", ""),
          pts: getNilaiFieldValue(existing, "pts", "")
        };

        let status = "update";
        let message = "";
        if (!nipd || !siswa) {
          status = "error";
          message = "Siswa tidak ditemukan pada kelas ini";
        } else if (mapelKode && mapelKode !== String(assignment.mapel_kode || "").toUpperCase()) {
          status = "error";
          message = "Kode mapel tidak sesuai";
        } else if ([uh1Raw, uh2Raw, uh3Raw, ptsRaw].every(value => value === "" || value === null || value === undefined)) {
          status = "error";
          message = "Semua kolom nilai kosong";
        } else if ([uh1, uh2, uh3, pts].some(value => Number.isNaN(value))) {
          status = "error";
          message = "Nilai harus berupa angka antara 0 sampai 100";
        } else if (hasNilaiImportValue(uh2Raw) && !hasNilaiImportValue(uh1Raw)) {
          status = "error";
          message = "UH 1 wajib diisi sebelum mengisi UH 2";
        } else if (hasNilaiImportValue(uh3Raw) && !hasNilaiImportValue(uh1Raw)) {
          status = "error";
          message = "UH 1 wajib diisi sebelum mengisi UH 3";
        } else if (hasNilaiImportValue(uh3Raw) && !hasNilaiImportValue(uh2Raw)) {
          status = "error";
          message = "UH 2 wajib diisi sebelum mengisi UH 3";
        } else if (
          String(existingValues.uh_1) === String(uh1) &&
          String(existingValues.uh_2) === String(uh2) &&
          String(existingValues.uh_3) === String(uh3) &&
          String(existingValues.pts) === String(pts)
        ) {
          status = "same";
          message = "Nilai sama";
        } else if (!existing) {
          status = "new";
          message = "Nilai baru";
        }

        return {
          nipd,
          nama: siswa?.nama || nama,
          kelas: siswa?.kelasNilaiParts?.kelas || kelas,
          mapel_kode: assignment.mapel_kode,
          guru_kode: assignment.guru_kode,
          uh_1: uh1,
          uh_2: uh2,
          uh_3: uh3,
          pts,
          existing,
          status,
          message
        };
      });

      nilaiPreviewPage = 1;
      renderNilaiPreview();
    } catch (error) {
      console.error(error);
      Swal.fire("Gagal membaca file", "", "error");
    }
  };
  reader.readAsArrayBuffer(file);
}

function openNilaiPreviewModal() {
  const modal = document.getElementById("nilaiPreviewModal");
  if (!modal) return;
  modal.style.display = "flex";
  document.body.style.overflow = "hidden";
  document.documentElement.style.overflow = "hidden";
}

function closeNilaiPreviewModal() {
  const modal = document.getElementById("nilaiPreviewModal");
  if (!modal) return;
  modal.style.display = "none";
  document.body.style.overflow = "";
  document.documentElement.style.overflow = "";
}

function handleNilaiPreviewBackdrop(event) {
  if (event.target?.id === "nilaiPreviewModal") batalImportNilai();
}

function getNilaiPreviewRowsPerPageValue() {
  return nilaiPreviewRowsPerPage === "all" ? Number.MAX_SAFE_INTEGER : Number(nilaiPreviewRowsPerPage);
}

function setNilaiPreviewRowsPerPage(value) {
  nilaiPreviewRowsPerPage = value === "all" ? "all" : Number(value);
  nilaiPreviewPage = 1;
  renderNilaiPreview();
}

function setNilaiPreviewPage(page) {
  const totalPages = Math.max(1, Math.ceil(nilaiPreviewData.length / getNilaiPreviewRowsPerPageValue()));
  nilaiPreviewPage = Math.min(Math.max(1, page), totalPages);
  renderNilaiPreview();
}

function renderNilaiPreview() {
  const container = document.getElementById("nilaiPreviewContainer");
  if (!container) return;
  openNilaiPreviewModal();

  const summary = {
    new: nilaiPreviewData.filter(item => item.status === "new").length,
    update: nilaiPreviewData.filter(item => item.status === "update").length,
    same: nilaiPreviewData.filter(item => item.status === "same").length,
    error: nilaiPreviewData.filter(item => item.status === "error").length
  };
  const effectiveRowsPerPage = getNilaiPreviewRowsPerPageValue();
  const totalPages = Math.max(1, Math.ceil(nilaiPreviewData.length / effectiveRowsPerPage));
  if (nilaiPreviewPage > totalPages) nilaiPreviewPage = totalPages;
  const startIndex = (nilaiPreviewPage - 1) * effectiveRowsPerPage;
  const rows = nilaiPreviewData.slice(startIndex, startIndex + effectiveRowsPerPage).map(item => {
    const color = item.status === "error" ? "#fee2e2"
      : item.status === "new" ? "#bbf7d0"
      : item.status === "update" ? "#bfdbfe"
      : "#e5e7eb";
    return `
      <tr style="background:${color}">
        <td>${escapeNilaiHtml(item.nipd || "-")}</td>
        <td>${escapeNilaiHtml(item.kelas || "-")}</td>
        <td>${escapeNilaiHtml(item.nama || "-")}</td>
        <td>${escapeNilaiHtml(item.mapel_kode || "-")}</td>
        <td>${escapeNilaiHtml(item.uh_1 === "" ? "-" : item.uh_1)}</td>
        <td>${escapeNilaiHtml(item.uh_2 === "" ? "-" : item.uh_2)}</td>
        <td>${escapeNilaiHtml(item.uh_3 === "" ? "-" : item.uh_3)}</td>
        <td>${escapeNilaiHtml(item.pts === "" ? "-" : item.pts)}</td>
        <td><b>${escapeNilaiHtml(item.status.toUpperCase())}</b>${item.message ? `<br><small>${escapeNilaiHtml(item.message)}</small>` : ""}</td>
      </tr>
    `;
  }).join("");

  container.innerHTML = `
    <div class="preview-header">
      <div>
        <h3>Preview Import Nilai (${nilaiPreviewData.length} data)</h3>
        <div class="preview-summary">
          <span>Baru: ${summary.new}</span>
          <span>Update: ${summary.update}</span>
          <span>Same: ${summary.same}</span>
          <span>Error: ${summary.error}</span>
        </div>
      </div>
      <div class="preview-header-actions">
        <div class="page-size-control">
          <label for="nilaiPreviewRowsPerPage">Tampilkan</label>
          <select id="nilaiPreviewRowsPerPage" onchange="setNilaiPreviewRowsPerPage(this.value)">
            <option value="10" ${nilaiPreviewRowsPerPage === 10 ? "selected" : ""}>10</option>
            <option value="20" ${nilaiPreviewRowsPerPage === 20 ? "selected" : ""}>20</option>
            <option value="50" ${nilaiPreviewRowsPerPage === 50 ? "selected" : ""}>50</option>
            <option value="100" ${nilaiPreviewRowsPerPage === 100 ? "selected" : ""}>100</option>
            <option value="all" ${nilaiPreviewRowsPerPage === "all" ? "selected" : ""}>Semuanya</option>
          </select>
        </div>
        <button class="btn-secondary" onclick="batalImportNilai()">Tutup</button>
      </div>
    </div>

    <div class="preview-table-wrap">
      <table>
        <thead>
          <tr>
            <th>NIPD</th>
            <th>Kelas</th>
            <th>Nama</th>
            <th>Mapel</th>
            <th>UH 1</th>
            <th>UH 2</th>
            <th>UH 3</th>
            <th>PTS</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>

    <div id="nilaiPreviewPagination" class="pagination-wrap"></div>

    <div class="preview-mode">
      <b>Mode Import:</b><br>
      <label><input type="radio" name="nilaiImportMode" value="update" checked> Update (ubah jika berbeda)</label><br>
      <label><input type="radio" name="nilaiImportMode" value="skip"> Skip (lewati nilai lama)</label><br>
      <label><input type="radio" name="nilaiImportMode" value="overwrite"> Overwrite (paksa semua)</label>
    </div>

    <div class="preview-actions">
      <button class="btn-primary" onclick="uploadImportNilai()">Upload</button>
      <button class="btn-secondary" onclick="batalImportNilai()">Batal</button>
    </div>

    <small class="preview-note">Hijau=baru | Biru=update | Abu=same | Merah=error</small>
  `;
  renderNilaiPreviewPagination(totalPages);
}

function renderNilaiPreviewPagination(totalPages) {
  const container = document.getElementById("nilaiPreviewPagination");
  if (!container) return;
  if (totalPages <= 1) {
    container.innerHTML = "";
    return;
  }
  container.innerHTML = `
    <div class="pagination">
      <button class="btn-secondary" onclick="setNilaiPreviewPage(${nilaiPreviewPage - 1})" ${nilaiPreviewPage === 1 ? "disabled" : ""}>Prev</button>
      <span>Halaman ${nilaiPreviewPage} dari ${totalPages}</span>
      <button class="btn-secondary" onclick="setNilaiPreviewPage(${nilaiPreviewPage + 1})" ${nilaiPreviewPage === totalPages ? "disabled" : ""}>Next</button>
    </div>
  `;
}

function getNilaiImportMode() {
  return document.querySelector('input[name="nilaiImportMode"]:checked')?.value || "update";
}

async function uploadImportNilai() {
  if (isNilaiUploading) return;
  isNilaiUploading = true;

  const assignment = getSelectedNilaiAssignment();
  const user = getCurrentNilaiUser();
  const mode = getNilaiImportMode();
  const siapUpload = nilaiPreviewData.filter(item => {
    if (item.status === "error") return false;
    if (mode === "skip" && item.existing) return false;
    if (mode === "update" && item.status === "same") return false;
    return true;
  });

  if (siapUpload.length === 0) {
    isNilaiUploading = false;
    Swal.fire("Tidak ada perubahan", "Tidak ada nilai yang perlu diupload.", "info");
    return;
  }

  try {
    Swal.fire({ title: "Mengupload nilai...", didOpen: () => Swal.showLoading() });
    const rows = siapUpload.map(item => ({
      siswa: { nipd: item.nipd },
      payload: {
          ...getNilaiActiveTermPayload(),
          nipd: item.nipd,
          nama_siswa: item.nama || "",
          kelas: item.kelas || "",
          tingkat: assignment.tingkat,
          rombel: assignment.rombel,
          mapel_kode: assignment.mapel_kode,
          guru_kode: assignment.guru_kode,
          uh_1: item.uh_1 === "" ? "" : Number(item.uh_1),
          uh_2: item.uh_2 === "" ? "" : Number(item.uh_2),
          uh_3: item.uh_3 === "" ? "" : Number(item.uh_3),
          pts: item.pts === "" ? "" : Number(item.pts),
          updated_by: user.username || "",
          updated_at: new Date().toISOString()
        }
    }));
    await upsertNilaiRows(rows, assignment);
    mergeSavedNilaiRowsIntoCache(rows, assignment);
    syncCurrentNilaiAssignmentRows(assignment);
    closeNilaiPreviewModal();
    batalImportNilai(false);
    renderNilaiTableState();
    Swal.fire("Import selesai", `${siapUpload.length} nilai berhasil diupload.`, "success");
  } catch (error) {
    console.error(error);
    Swal.fire("Gagal upload", "", "error");
  } finally {
    isNilaiUploading = false;
  }
}

function batalImportNilai(closeModal = true) {
  nilaiPreviewData = [];
  nilaiPreviewPage = 1;
  const container = document.getElementById("nilaiPreviewContainer");
  if (container) container.innerHTML = "";
  if (nilaiLastImportInput) nilaiLastImportInput.value = "";
  if (closeModal) closeNilaiPreviewModal();
}

async function saveNilaiAssignment() {
  if (isNilaiSaving) return;
  const select = document.getElementById("nilaiAssignmentSelect");
  const assignment = parseNilaiAssignmentId(select?.value || "");
  if (!assignment.mapel_kode) {
    Swal.fire("Pilih kelas dan mapel", "", "warning");
    return;
  }

  const user = getCurrentNilaiUser();
  const hasCoordinatorAccess = typeof canUseCoordinatorAccess === "function" && canUseCoordinatorAccess();
  if (user.role === "guru" && !(hasCoordinatorAccess && currentNilaiAccessMode === "koordinator") && String(assignment.guru_kode || "") !== String(user.kode_guru || "")) {
    Swal.fire("Akses ditolak", "Guru hanya dapat menginput nilai siswa yang diajar.", "warning");
    return;
  }

  try {
    setNilaiSavingState(true);
    const students = getNilaiStudentsForAssignment(assignment);
    const rows = students.map((siswa, index) => {
      const uh1 = getNormalizedNilaiCellValueByRow(index, "uh1");
      const uh2 = getNormalizedNilaiCellValueByRow(index, "uh2");
      const uh3 = getNormalizedNilaiCellValueByRow(index, "uh3");
      const pts = getNormalizedNilaiCellValueByRow(index, "pts");
      return {
        siswa,
        payload: {
          ...getNilaiActiveTermPayload(),
          nipd: siswa.nipd || "",
          nama_siswa: siswa.nama || "",
          kelas: siswa.kelasNilaiParts.kelas || "",
          tingkat: assignment.tingkat,
          rombel: assignment.rombel,
          mapel_kode: assignment.mapel_kode,
          guru_kode: assignment.guru_kode,
          uh_1: uh1 === "" ? "" : Number(uh1),
          uh_2: uh2 === "" ? "" : Number(uh2),
          uh_3: uh3 === "" ? "" : Number(uh3),
          pts: pts === "" ? "" : Number(pts),
          updated_by: user.username || "",
          updated_at: new Date().toISOString()
        }
      };
    });

    const invalidRow = rows.find(row =>
      ["uh_1", "uh_2", "uh_3", "pts"].some(field => Number.isNaN(row.payload[field]))
    );
    if (invalidRow) {
      throw new Error(`Nilai tidak valid untuk ${invalidRow.siswa?.nama || invalidRow.siswa?.nipd || "siswa"}`);
    }

    await upsertNilaiRows(rows, assignment);
    mergeSavedNilaiRowsIntoCache(rows, assignment);
    syncCurrentNilaiAssignmentRows(assignment);
    setNilaiSavingState(false);
    renderNilaiTableState();
    Swal.fire("Tersimpan", "Nilai sudah disimpan.", "success");
  } catch (error) {
    console.error(error);
    setNilaiSavingState(false);
    Swal.fire("Gagal menyimpan", error?.message || "Nilai belum berhasil disimpan.", "error");
  }
}
