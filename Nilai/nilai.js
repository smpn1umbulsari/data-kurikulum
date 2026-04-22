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
let currentNilaiInputMode = "pts";
const NILAI_LAST_ASSIGNMENT_KEY = "nilaiLastAssignmentId";
const NILAI_REKAP_LAST_CLASS_KEY = "nilaiRekapLastClass";
const NILAI_UI_MODE_KEY = "nilaiUnifiedInputMode";
const nilaiHydratedAssignmentKeys = new Set();
const nilaiHydratingAssignmentKeys = new Set();
const nilaiAssignmentLoadState = new Map();
let nilaiRenderFrameId = 0;
let nilaiRekapRenderFrameId = 0;
let currentNilaiAssignmentId = "";
let currentNilaiAssignmentRows = [];
let nilaiQuickFilter = "all";
let nilaiAutosaveTimer = 0;
let nilaiAutosaveInFlight = false;
let currentNilaiAssignmentRowMap = new Map();
const nilaiDerivedCache = {
  accessibleAssignmentsKey: "",
  accessibleAssignments: [],
  assignmentStudents: new Map(),
  classStudents: new Map(),
  classAssignments: new Map(),
  nilaiDocumentIndexKey: "",
  nilaiDocumentIndex: new Map()
};
let lastNilaiAssignmentInfoKey = "";
let lastNilaiTableRenderKey = "";
let lastNilaiRekapClassOptionsKey = "";
let lastNilaiRekapInfoKey = "";
let lastNilaiRekapRenderKey = "";
function getNilaiDocumentsApi() {
  if (window.NilaiData?.getDocumentsApi) return window.NilaiData.getDocumentsApi();
  return window.SupabaseDocuments;
}

function getNilaiSupabaseClient() {
  return window.supabaseClient || window.SupabaseDocuments?.client || null;
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
  currentNilaiAccessMode = ["admin", "koordinator", "wali"].includes(mode) ? mode : "guru";
  if (window.NilaiData?.state) window.NilaiData.state.accessMode = currentNilaiAccessMode;
}

function setNilaiInputMode(mode = "pts") {
  currentNilaiInputMode = mode === "semester" ? "semester" : "pts";
}

function getCurrentNilaiInputMode() {
  return currentNilaiInputMode === "semester" ? "semester" : "pts";
}

function getStoredNilaiUiMode() {
  try {
    const stored = String(localStorage.getItem(NILAI_UI_MODE_KEY) || "").trim().toLowerCase();
    return stored === "semester" ? "semester" : "pts";
  } catch {
    return "pts";
  }
}

function storeNilaiUiMode(mode = "pts") {
  try {
    localStorage.setItem(NILAI_UI_MODE_KEY, mode === "semester" ? "semester" : "pts");
  } catch {
    // ignore storage errors
  }
}

function resolveNilaiInputModeForCurrentRole() {
  const user = getCurrentNilaiUser();
  const role = String(user.role || "").trim().toLowerCase();
  if (role === "guru") {
    if (typeof window.getGuruNilaiInputMode === "function") {
      return window.getGuruNilaiInputMode() === "semester" ? "semester" : "pts";
    }
    return "pts";
  }
  return getStoredNilaiUiMode();
}

function isNilaiSemesterMode() {
  return getCurrentNilaiInputMode() === "semester";
}

function getNilaiInputModeLabel() {
  return isNilaiSemesterMode() ? "Input Nilai Semester" : "Input Nilai PTS";
}

function getNilaiFieldExportHeader(field) {
  const key = typeof field === "string" ? field : field?.key;
  const headerMap = {
    uh1: "UH1",
    uh2: "UH2",
    uh3: "UH3",
    uh4: "UH4",
    uh5: "UH5",
    pts: "PTS",
    semester: "SEMESTER",
    rapor: "NILAI_RAPOR"
  };
  return headerMap[key] || String(key || "").toUpperCase();
}

const NILAI_ALL_FIELD_CONFIGS = [
  { key: "uh1", label: "UH 1", payloadKey: "uh_1", className: "nilai-input-uh" },
  { key: "uh2", label: "UH 2", payloadKey: "uh_2", className: "nilai-input-uh" },
  { key: "uh3", label: "UH 3", payloadKey: "uh_3", className: "nilai-input-uh" },
  { key: "uh4", label: "UH 4", payloadKey: "uh_4", className: "nilai-input-uh" },
  { key: "uh5", label: "UH 5", payloadKey: "uh_5", className: "nilai-input-uh" },
  { key: "pts", label: "PTS", payloadKey: "pts", className: "nilai-input-pts" },
  { key: "semester", label: "Smstr", payloadKey: "semester", className: "nilai-input-semester" },
  { key: "rapor", label: "Nilai Rapor", payloadKey: "rapor", className: "nilai-input-rapor" }
];

function getNilaiModeRules(values = {}, options = {}) {
  const mode = getCurrentNilaiInputMode();
  const isSemester = mode === "semester";
  const isGuruMode = currentNilaiAccessMode === "guru";
  const visibleFieldKeys = isSemester
    ? ["uh1", "uh2", "uh3", "uh4", "uh5", "pts", "semester", "rapor"]
    : ["uh1", "uh2", "uh3", "pts"];
  const hiddenFieldKeys = NILAI_ALL_FIELD_CONFIGS
    .map(field => field.key)
    .filter(key => !visibleFieldKeys.includes(key));
  const fixedReadOnlyKeys = new Set(["rapor"]);
  if (isSemester) {
    fixedReadOnlyKeys.add("pts");
  }
  const ptsLockedUpto = Math.max(0, Math.min(3, Number(options.ptsLockedUpto) || 0));
  if (isSemester) {
    getNilaiSequentialUhFields().slice(0, ptsLockedUpto).forEach(key => fixedReadOnlyKeys.add(key));
  }
  const lockedSemesterUhKeys = new Set();
  if (isSemester && isGuruMode) {
    getNilaiSequentialUhFields().forEach((fieldKey, index) => {
      if (lockedSemesterUhKeys.size !== index) return;
      if (isFilledNilaiValue(values[fieldKey])) lockedSemesterUhKeys.add(fieldKey);
    });
  }
  const readOnlyFieldKeys = new Set([...fixedReadOnlyKeys]);
  return {
    mode,
    isSemester,
    isGuruMode,
    visibleFieldKeys,
    hiddenFieldKeys,
    fixedReadOnlyKeys,
    ptsLockedUpto,
    lockedSemesterUhKeys,
    readOnlyFieldKeys,
    canDownloadRapor: isSemester
  };
}

function getNilaiInputFieldConfigs(values = {}, options = {}) {
  const rules = getNilaiModeRules(values, options);
  return NILAI_ALL_FIELD_CONFIGS
    .filter(field => rules.visibleFieldKeys.includes(field.key))
    .map(field => ({
      ...field,
      readOnly: rules.readOnlyFieldKeys.has(field.key)
    }));
}

function getNilaiSequentialUhFields() {
  return ["uh1", "uh2", "uh3", "uh4", "uh5"];
}

function getNilaiPtsLockedUptoFromValues(values = {}, maxCount = 3) {
  const sequence = getNilaiSequentialUhFields().slice(0, Math.max(0, Number(maxCount) || 0));
  let count = 0;
  sequence.forEach((fieldKey, index) => {
    if (count !== index) return;
    if (isFilledNilaiValue(values[fieldKey])) count += 1;
  });
  return count;
}

function getNilaiPtsLockedUpto(nilaiDoc = {}, values = {}) {
  const stored = Number(nilaiDoc?.pts_locked_upto);
  if (Number.isInteger(stored) && stored >= 0) return Math.min(3, stored);
  return getNilaiPtsLockedUptoFromValues(values, 3);
}

function normalizeNilaiOutputNumber(value, digits = 2) {
  if (value === "" || value === null || value === undefined) return "";
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "";
  const factor = Math.pow(10, digits);
  const rounded = Math.round(numeric * factor) / factor;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(digits).replace(/\.?0+$/, "");
}

function calculateNilaiRapor(values = {}) {
  const uhValues = ["uh1", "uh2", "uh3", "uh4", "uh5"]
    .map(key => values[key])
    .filter(value => value !== "" && value !== null && value !== undefined)
    .map(Number)
    .filter(Number.isFinite);
  const pts = Number(values.pts);
  const semester = Number(values.semester);
  if (!uhValues.length || !Number.isFinite(pts) || !Number.isFinite(semester)) return "";
  const averageUh = uhValues.reduce((total, item) => total + item, 0) / uhValues.length;
  return Math.round(((((averageUh * 3) + pts + semester) / 5) + Number.EPSILON) * 100) / 100;
}

function getNilaiUiValues(nilaiDoc = {}) {
  const fallbackNilai = nilaiDoc?.nilai ?? "";
  const values = {
    uh1: normalizeNilaiManualInputValue(getNilaiFieldValue(nilaiDoc, "uh_1", fallbackNilai)),
    uh2: normalizeNilaiManualInputValue(getNilaiFieldValue(nilaiDoc, "uh_2", "")),
    uh3: normalizeNilaiManualInputValue(getNilaiFieldValue(nilaiDoc, "uh_3", "")),
    uh4: normalizeNilaiManualInputValue(getNilaiFieldValue(nilaiDoc, "uh_4", "")),
    uh5: normalizeNilaiManualInputValue(getNilaiFieldValue(nilaiDoc, "uh_5", "")),
    pts: normalizeNilaiManualInputValue(getNilaiFieldValue(nilaiDoc, "pts", "")),
    semester: normalizeNilaiManualInputValue(getNilaiFieldValue(nilaiDoc, "semester", "")),
    rapor: getNilaiFieldValue(nilaiDoc, "rapor", "")
  };
  const calculatedRapor = calculateNilaiRapor(values);
  values.rapor = calculatedRapor === "" ? normalizeNilaiOutputNumber(values.rapor) : normalizeNilaiOutputNumber(calculatedRapor);
  return values;
}

function isFilledNilaiValue(value) {
  return String(value ?? "").trim() !== "";
}

function isNilaiRowFieldReadOnly(field, values = {}, options = {}) {
  return getNilaiModeRules(values, options).readOnlyFieldKeys.has(field.key);
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

function getNilaiOwnWaliClassSet() {
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
  const cacheKey = getNilaiAccessibleAssignmentsCacheKey();
  if (nilaiDerivedCache.accessibleAssignmentsKey === cacheKey) {
    return nilaiDerivedCache.accessibleAssignments;
  }
  const user = getCurrentNilaiUser();
  const role = user.role || "admin";
  const coordinatorLevels = typeof getCurrentCoordinatorLevelsSync === "function" ? getCurrentCoordinatorLevelsSync() : [];
  const hasCoordinatorAccess = typeof canUseCoordinatorAccess === "function" && canUseCoordinatorAccess();
  const coordinatorWaliClasses = getNilaiCoordinatorWaliClassSet();
  const ownWaliClasses = getNilaiOwnWaliClassSet();
  const rows = semuaDataNilaiMengajar
    .filter(item => {
      if (!item.mapel_kode || !item.guru_kode || !item.tingkat || !item.rombel) return false;
      if (currentNilaiAccessMode === "wali") return ownWaliClasses.has(getNilaiClassKey(item));
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
  nilaiDerivedCache.accessibleAssignmentsKey = cacheKey;
  nilaiDerivedCache.accessibleAssignments = rows;
  return rows;
}

function makeNilaiAssignmentId(item) {
  return `${item.tingkat}|${String(item.rombel || "").toUpperCase()}|${String(item.mapel_kode || "").toUpperCase()}|${String(item.guru_kode || "")}`;
}

function parseNilaiAssignmentId(value = "") {
  const [tingkat, rombel, mapelKode, guruKode] = String(value || "").split("|");
  return { tingkat, rombel, mapel_kode: mapelKode, guru_kode: guruKode };
}

function makeNilaiLegacyDocId(assignment, nipd) {
  const baseId = [
    assignment.tingkat,
    String(assignment.rombel || "").toUpperCase(),
    String(assignment.mapel_kode || "").toUpperCase(),
    String(nipd || "")
  ].join("_");
  const termId = typeof getActiveTermId === "function" ? getActiveTermId() : "legacy";
  return termId === "legacy" ? baseId : `${termId}_${baseId}`;
}

function makeNilaiDocId(assignment, nipd) {
  const baseId = [
    assignment.tingkat,
    String(assignment.rombel || "").toUpperCase(),
    String(assignment.mapel_kode || "").toUpperCase(),
    String(assignment.guru_kode || "").toUpperCase(),
    String(nipd || "")
  ].join("_");
  const termId = typeof getActiveTermId === "function" ? getActiveTermId() : "legacy";
  return termId === "legacy" ? baseId : `${termId}_${baseId}`;
}

function getNilaiPossibleDocIds(assignment, nipd) {
  return Array.from(new Set([
    makeNilaiDocId(assignment, nipd),
    makeNilaiLegacyDocId(assignment, nipd)
  ].filter(Boolean)));
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
  if (window.NilaiData?.setRows) window.NilaiData.setRows("nilai", semuaDataNilai);
}

function syncNilaiStateFromStore() {
  if (!window.NilaiData?.getRows) return;
  semuaDataNilaiSiswa = window.NilaiData.getRows("siswa");
  semuaDataNilaiMapel = window.NilaiData.getRows("mapel");
  semuaDataNilaiMengajar = window.NilaiData.getRows("mengajar");
  semuaDataNilaiKelas = window.NilaiData.getRows("kelas");
  semuaDataNilai = window.NilaiData.getRows("nilai");
}

function syncNilaiUnsubscribersFromStore() {
  if (!window.NilaiData?.unsubscribers) return;
  unsubscribeNilaiSiswa = window.NilaiData.unsubscribers.siswa;
  unsubscribeNilaiMapel = window.NilaiData.unsubscribers.mapel;
  unsubscribeNilaiMengajar = window.NilaiData.unsubscribers.mengajar;
  unsubscribeNilaiKelas = window.NilaiData.unsubscribers.kelas;
  unsubscribeNilaiData = window.NilaiData.unsubscribers.nilai;
}

function getNilaiDataRevision(key) {
  return Number(window.NilaiData?.state?.revisions?.[key] || 0);
}

function getNilaiAccessibleAssignmentsCacheKey() {
  const user = getCurrentNilaiUser();
  const coordinatorLevels = typeof getCurrentCoordinatorLevelsSync === "function" ? getCurrentCoordinatorLevelsSync() : [];
  const hasCoordinatorAccess = typeof canUseCoordinatorAccess === "function" && canUseCoordinatorAccess();
  return [
    getNilaiDataRevision("mengajar"),
    getNilaiDataRevision("kelas"),
    getNilaiDataRevision("siswa"),
    getNilaiDataRevision("mapel"),
    currentNilaiAccessMode,
    String(user.role || ""),
    String(user.kode_guru || ""),
    hasCoordinatorAccess ? "1" : "0",
    coordinatorLevels.join(",")
  ].join("|");
}

function getNilaiStudentsCacheKey(assignment = {}) {
  return [
    getNilaiDataRevision("siswa"),
    getNilaiDataRevision("mapel"),
    String(assignment.tingkat || ""),
    String(assignment.rombel || "").toUpperCase(),
    String(assignment.mapel_kode || "").toUpperCase()
  ].join("|");
}

function getNilaiClassStudentsCacheKey(tingkat = "", rombel = "") {
  return [
    getNilaiDataRevision("siswa"),
    String(tingkat || ""),
    String(rombel || "").toUpperCase()
  ].join("|");
}

function getNilaiAssignmentsForClassCacheKey(tingkat = "", rombel = "") {
  return [
    getNilaiAccessibleAssignmentsCacheKey(),
    getNilaiDataRevision("mapel"),
    String(tingkat || ""),
    String(rombel || "").toUpperCase()
  ].join("|");
}

function buildNilaiStudentListByClass(tingkat = "", rombel = "") {
  return semuaDataNilaiSiswa
    .map(siswa => ({ ...siswa, kelasNilaiParts: getNilaiKelasBayanganParts(siswa) }))
    .filter(siswa =>
      siswa.kelasNilaiParts.tingkat === String(tingkat || "")
      && siswa.kelasNilaiParts.rombel === String(rombel || "").toUpperCase()
    )
    .sort((a, b) => {
      if (window.AppUtils?.compareStudentPlacement) return window.AppUtils.compareStudentPlacement(a, b);
      return String(a.nama || "").localeCompare(String(b.nama || ""), undefined, { sensitivity: "base" });
    });
}

function getNilaiStudentsForClass(tingkat = "", rombel = "") {
  const cacheKey = getNilaiClassStudentsCacheKey(tingkat, rombel);
  if (nilaiDerivedCache.classStudents.has(cacheKey)) {
    return nilaiDerivedCache.classStudents.get(cacheKey);
  }
  const rows = buildNilaiStudentListByClass(tingkat, rombel);
  nilaiDerivedCache.classStudents.clear();
  nilaiDerivedCache.classStudents.set(cacheKey, rows);
  return rows;
}

function getNilaiItemTimestamp(item) {
  const updatedAt = item?.updated_at || item?.data?.updated_at || "";
  const parsed = Date.parse(updatedAt);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getNilaiDocumentIndex() {
  const cacheKey = String(getNilaiDataRevision("nilai"));
  if (nilaiDerivedCache.nilaiDocumentIndexKey === cacheKey) {
    return nilaiDerivedCache.nilaiDocumentIndex;
  }
  const nextIndex = new Map();
  semuaDataNilai.forEach(item => {
    if (item?.id) nextIndex.set(item.id, item);
  });
  nilaiDerivedCache.nilaiDocumentIndexKey = cacheKey;
  nilaiDerivedCache.nilaiDocumentIndex = nextIndex;
  return nextIndex;
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
  const guruKode = String(assignment.guru_kode || "").trim().toUpperCase();
  const itemGuruKode = String(item.guru_kode || "").trim().toUpperCase();
  const itemKelas = getNilaiKelasParts(item.kelas || "").kelas;
  const assignmentKelas = getNilaiKelasParts(`${tingkat}${rombel}`).kelas;
  const sameClass = itemKelas
    ? itemKelas === assignmentKelas
    : String(item.tingkat || "").trim() === tingkat && String(item.rombel || "").trim().toUpperCase() === rombel;
  return isNilaiDocInActiveTerm(item)
    && sameClass
    && String(item.mapel_kode || "").trim().toUpperCase() === mapelKode
    && (!guruKode || !itemGuruKode || itemGuruKode === guruKode);
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
  currentNilaiAssignmentRowMap = new Map(
    currentNilaiAssignmentRows
      .filter(item => item?.id)
      .map(item => [item.id, item])
  );
}

function rowsToNilaiCacheItems(rows = [], assignment = {}) {
  return rows
    .filter(row => row?.payload || row?.data || row)
    .map(row => {
      const payload = cleanNilaiPayloadValue(row.payload || row.data || row);
      const nipd = row?.siswa?.nipd || payload?.nipd || "";
      return {
        id: row.id || makeNilaiDocId(assignment, nipd),
        ...payload
      };
    });
}

function loadNilaiAssignmentOfflineCache(assignment) {
  if (!assignment?.mapel_kode || !window.GuruOffline?.loadNilaiAssignmentCache) return [];
  const cached = window.GuruOffline.loadNilaiAssignmentCache(makeNilaiOfflineAssignmentKey(assignment), getCurrentNilaiUser());
  const rows = Array.isArray(cached?.rows) ? cached.rows : [];
  return rowsToNilaiCacheItems(rows, assignment).filter(item => isNilaiDocMatchingAssignment(item, assignment));
}

async function loadNilaiAssignmentFromPersistedCollection(assignment) {
  const documentsApi = getNilaiDocumentsApi();
  const rows = typeof documentsApi?.getPersistedCollectionRowsAsync === "function"
    ? await documentsApi.getPersistedCollectionRowsAsync("nilai")
    : typeof documentsApi?.getPersistedCollectionRows === "function"
    ? documentsApi.getPersistedCollectionRows("nilai")
    : [];
  return rows
    .filter(item => typeof isActiveTermDoc === "function" ? isActiveTermDoc(item?.data || {}) : true)
    .filter(item => isNilaiDocMatchingAssignment(item?.data || {}, assignment))
    .map(item => ({
      id: item?.id || "",
      siswa: { nipd: item?.data?.nipd || String(item?.id || "").split("_").at(-1) || "" },
      payload: { ...(item?.data || {}) }
    }));
}

function saveNilaiAssignmentOfflineCache(assignment, rows = []) {
  if (!assignment?.mapel_kode || !window.GuruOffline?.saveNilaiAssignmentCache) return;
  window.GuruOffline.saveNilaiAssignmentCache(makeNilaiOfflineAssignmentKey(assignment), {
    assignment,
    rows: rowsToNilaiCacheItems(rows, assignment)
  }, getCurrentNilaiUser());
}

function getNilaiAssignmentCacheInfo(assignment) {
  if (!assignment?.mapel_kode || !window.GuruOffline?.loadNilaiAssignmentCache) return null;
  const cache = window.GuruOffline.loadNilaiAssignmentCache(makeNilaiOfflineAssignmentKey(assignment), getCurrentNilaiUser());
  const rows = Array.isArray(cache?.rows) ? cache.rows : [];
  if (!rows.length) return null;
  return {
    rows: rows.length,
    savedAt: cache.savedAt || "",
    source: cache.source || "cache"
  };
}

function getNilaiLoadStateKey(assignment) {
  return assignment?.mapel_kode ? makeNilaiAssignmentHydrationKey(assignment) : "";
}

function getNilaiLoadState(assignment) {
  const key = getNilaiLoadStateKey(assignment);
  return key ? nilaiAssignmentLoadState.get(key) || {} : {};
}

function setNilaiLoadState(assignment, patch = {}) {
  const key = getNilaiLoadStateKey(assignment);
  if (!key) return;
  nilaiAssignmentLoadState.set(key, {
    ...(nilaiAssignmentLoadState.get(key) || {}),
    ...patch
  });
}

function applyNilaiAssignmentLocalCache(assignment) {
  const cachedRows = loadNilaiAssignmentOfflineCache(assignment);
  if (!cachedRows.length) return false;
  currentNilaiAssignmentId = makeNilaiAssignmentId(assignment);
  currentNilaiAssignmentRows = cachedRows;
  const rows = cachedRows.map(item => ({
    id: item.id,
    siswa: { nipd: item.nipd || String(item.id || "").split("_").at(-1) || "" },
    payload: item
  }));
  mergeSavedNilaiRowsIntoCache(rows, assignment);
  const cacheInfo = getNilaiAssignmentCacheInfo(assignment);
  setNilaiLoadState(assignment, {
    source: "cache",
    cachedAt: cacheInfo?.savedAt || "",
    rows: cachedRows.length,
    error: ""
  });
  return true;
}

function getNilaiForStudent(assignment, nipd) {
  const docId = makeNilaiDocId(assignment, nipd);
  const legacyDocId = makeNilaiLegacyDocId(assignment, nipd);
  if (currentNilaiAssignmentRowMap.has(docId)) return currentNilaiAssignmentRowMap.get(docId);
  const documentIndex = getNilaiDocumentIndex();
  if (documentIndex.has(docId)) return documentIndex.get(docId);
  if (documentIndex.has(legacyDocId) && isNilaiDocMatchingAssignment(documentIndex.get(legacyDocId), assignment)) {
    return documentIndex.get(legacyDocId);
  }
  for (let index = currentNilaiAssignmentRows.length - 1; index >= 0; index -= 1) {
    if (currentNilaiAssignmentRows[index]?.id === docId) return currentNilaiAssignmentRows[index];
  }
  for (let index = semuaDataNilai.length - 1; index >= 0; index -= 1) {
    if (semuaDataNilai[index]?.id === docId) return semuaDataNilai[index];
  }
  for (let index = currentNilaiAssignmentRows.length - 1; index >= 0; index -= 1) {
    if (currentNilaiAssignmentRows[index]?.id === legacyDocId && isNilaiDocMatchingAssignment(currentNilaiAssignmentRows[index], assignment)) {
      return currentNilaiAssignmentRows[index];
    }
  }
  for (let index = semuaDataNilai.length - 1; index >= 0; index -= 1) {
    if (semuaDataNilai[index]?.id === legacyDocId && isNilaiDocMatchingAssignment(semuaDataNilai[index], assignment)) {
      return semuaDataNilai[index];
    }
  }  const matchesStudent = item => String(item?.nipd || "") === String(nipd || "");
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

function makeNilaiOfflineAssignmentKey(assignment) {
  return makeNilaiAssignmentHydrationKey(assignment);
}

function parseNilaiOfflineAssignmentKey(value = "") {
  const [, tingkat = "", rombel = "", mapelKode = "", guruKode = ""] = String(value || "").split("|");
  return { tingkat, rombel, mapel_kode: mapelKode, guru_kode: guruKode };
}

function canUseNilaiOfflineDraft() {
  const user = getCurrentNilaiUser();
  return String(user.role || "").trim().toLowerCase() === "guru" && currentNilaiAccessMode === "guru";
}

function canSaveNilaiAsOfflineDraft() {
  return canUseNilaiOfflineDraft() && typeof window.GuruOffline?.saveNilaiDraft === "function";
}

function shouldSaveNilaiAsOfflineDraft() {
  if (!canSaveNilaiAsOfflineDraft()) return false;
  if (window.navigator?.onLine === false) return true;
  return window.GuruOffline?.isOnline?.() === false;
}

function isNilaiNetworkSaveError(error) {
  const message = String(error?.message || error || "").toLowerCase();
  return message.includes("failed to fetch")
    || message.includes("networkerror")
    || message.includes("network request failed")
    || message.includes("load failed")
    || message.includes("fetch");
}

function getNilaiOfflineDraft(assignment) {
  if (!assignment?.mapel_kode || !window.GuruOffline?.loadNilaiDraft) return null;
  return window.GuruOffline.loadNilaiDraft(makeNilaiOfflineAssignmentKey(assignment), getCurrentNilaiUser());
}

function getNilaiOfflineDraftDocForStudent(assignment, nipd) {
  if (!canUseNilaiOfflineDraft()) return null;
  const draft = getNilaiOfflineDraft(assignment);
  if (!draft?.rows?.length) return null;
  const row = draft.rows.find(item => String(item?.siswa?.nipd || item?.payload?.nipd || "") === String(nipd || ""));
  if (!row?.payload) return null;
  return {
    id: makeNilaiDocId(assignment, nipd),
    ...row.payload,
    _offlineDraft: true,
    _offlineDraftSavedAt: draft.savedAt || ""
  };
}

function getNilaiStudentsForAssignment(assignment) {
  const cacheKey = getNilaiStudentsCacheKey(assignment);
  if (nilaiDerivedCache.assignmentStudents.has(cacheKey)) {
    return nilaiDerivedCache.assignmentStudents.get(cacheKey);
  }
  const mapel = getNilaiMapel(assignment.mapel_kode);
  const rows = getNilaiStudentsForClass(assignment.tingkat, assignment.rombel)
    .filter(siswa =>
      isNilaiSiswaEligibleForMapel(siswa, mapel)
    )
    .slice();
  nilaiDerivedCache.assignmentStudents.clear();
  nilaiDerivedCache.assignmentStudents.set(cacheKey, rows);
  return rows;
}

function renderInputNilaiPage() {
  const user = getCurrentNilaiUser();
  const role = user.role || "admin";
  const modeRules = getNilaiModeRules();
  const showModeSelector = String(role || "").trim().toLowerCase() !== "guru";
  const canUseDraft = canUseNilaiOfflineDraft() && window.isGuruSpenturiNativeApp?.();
  return `
    <div class="card">
      <div class="kelas-bayangan-head nilai-page-head">
        <div>
          <span class="dashboard-eyebrow">Nilai</span>
          <h2 id="nilaiModeTitle">${escapeNilaiHtml(getNilaiInputModeLabel())}</h2>
          <p id="nilaiModeDescription"></p>
        </div>
      </div>

      <div class="nilai-control-panel">
        <label class="form-group">
          <span>Pilih kelas dan mapel</span>
          <select id="nilaiAssignmentSelect" onchange="handleNilaiAssignmentChange()"></select>
        </label>
        ${showModeSelector ? `
        <label class="form-group">
          <span>Mode input</span>
          <select id="nilaiModeSelect" onchange="handleNilaiModeSelectorChange(event)">
            <option value="pts">PTS</option>
            <option value="semester">Semester</option>
          </select>
        </label>` : ""}
        <div class="nilai-control-actions">
          <button type="button" class="btn-primary nilai-save-action" onclick="saveNilaiAssignment()">Simpan</button>
          <button type="button" class="btn-secondary" onclick="triggerNilaiImport()">Import</button>
          <button type="button" class="btn-secondary nilai-download-action" onclick="openNilaiDownloadMenu()">Download</button>
          <button type="button" class="btn-secondary nilai-refresh-action" onclick="refreshSelectedNilaiAssignment()">Refresh</button>
          ${canUseDraft ? `<button type="button" class="btn-secondary nilai-sync-action" onclick="syncAllNilaiOfflineDrafts()">Sinkron Draft</button>` : ""}
          <input id="nilaiImportInput" type="file" accept=".xlsx,.xls" onchange="importNilaiExcel(event)" hidden>
        </div>
      </div>

      <div id="nilaiAssignmentInfo" class="nilai-assignment-info">Memuat data pembagian mengajar...</div>
      <div id="nilaiLoadStatus" class="nilai-load-status" hidden></div>
      <div class="nilai-quick-filter" role="group" aria-label="Filter cepat nilai">
        <button type="button" data-filter="all" onclick="setNilaiQuickFilter('all')">Semua</button>
        <button type="button" data-filter="empty" onclick="setNilaiQuickFilter('empty')">Kosong</button>
        <button type="button" data-filter="partial" onclick="setNilaiQuickFilter('partial')">Belum lengkap</button>
        <button type="button" data-filter="full" onclick="setNilaiQuickFilter('full')">Lengkap</button>
      </div>
      <div id="nilaiAutosaveStatus" class="nilai-autosave-status" hidden></div>
      ${canUseDraft ? `<div id="nilaiOfflineDraftInfo" class="nilai-offline-note" hidden></div>` : ""}

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
  const roleDescription = currentNilaiAccessMode === "wali"
    ? "Wali kelas hanya melihat rekap nilai untuk kelas yang aktif menjadi tanggung jawab wali."
    : role === "guru" && hasCoordinatorAccess && currentNilaiAccessMode === "koordinator"
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
        <div class="nilai-control-actions">
          <button type="button" class="btn-secondary" onclick="exportRekapNilaiExcel()">Export Excel</button>
        </div>
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

function scheduleNilaiPageStateRender() {
  if (window.NilaiData?.scheduleRender) {
    window.NilaiData.scheduleRender("renderFrameId", () => renderNilaiPageState());
    return;
  }
  if (nilaiRenderFrameId) return;
  nilaiRenderFrameId = window.requestAnimationFrame(() => {
    nilaiRenderFrameId = 0;
    renderNilaiPageState();
  });
}

function scheduleRekapNilaiStateRender() {
  if (window.NilaiData?.scheduleRender) {
    window.NilaiData.scheduleRender("rekapRenderFrameId", () => renderRekapNilaiState());
    return;
  }
  if (nilaiRekapRenderFrameId) return;
  nilaiRekapRenderFrameId = window.requestAnimationFrame(() => {
    nilaiRekapRenderFrameId = 0;
    renderRekapNilaiState();
  });
}

function loadRealtimeInputNilai() {
  if (window.NilaiData?.subscribeRealtime) {
    window.NilaiData.subscribeRealtime("input");
    syncNilaiStateFromStore();
    syncNilaiUnsubscribersFromStore();
    return;
  }
  if (unsubscribeNilaiSiswa) unsubscribeNilaiSiswa();
  if (unsubscribeNilaiMapel) unsubscribeNilaiMapel();
  if (unsubscribeNilaiMengajar) unsubscribeNilaiMengajar();
  if (unsubscribeNilaiKelas) unsubscribeNilaiKelas();
  if (unsubscribeNilaiData) unsubscribeNilaiData();

  const documentsApi = getNilaiDocumentsApi();
  const siswaQuery = typeof getSemesterCollectionQuery === "function" ? getSemesterCollectionQuery("siswa", "nama") : documentsApi.collection("siswa").orderBy("nama");
  unsubscribeNilaiSiswa = siswaQuery.onSnapshot(snapshot => {
    semuaDataNilaiSiswa = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    scheduleNilaiPageStateRender();
  });
  unsubscribeNilaiMapel = documentsApi.collection("mapel_bayangan").orderBy("kode_mapel").onSnapshot(snapshot => {
    semuaDataNilaiMapel = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    scheduleNilaiPageStateRender();
  });
  unsubscribeNilaiMengajar = documentsApi.collection("mengajar_bayangan").onSnapshot(snapshot => {
    semuaDataNilaiMengajar = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    scheduleNilaiPageStateRender();
  });
  unsubscribeNilaiKelas = typeof getSemesterCollectionQuery === "function"
    ? getSemesterCollectionQuery("kelas")
      .onSnapshot(snapshot => {
        semuaDataNilaiKelas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        scheduleNilaiPageStateRender();
      })
    : documentsApi.collection("kelas").onSnapshot(snapshot => {
        semuaDataNilaiKelas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        scheduleNilaiPageStateRender();
      });
  // Input nilai cukup memuat data nilai kelas-mapel yang sedang dipilih.
  // Mengambil seluruh koleksi nilai membuat mode offline sangat lambat di HP.
  unsubscribeNilaiData = () => {};
}

function loadRealtimeRekapNilai() {
  if (window.NilaiData?.subscribeRealtime) {
    window.NilaiData.subscribeRealtime("rekap");
    syncNilaiStateFromStore();
    syncNilaiUnsubscribersFromStore();
    return;
  }
  if (unsubscribeNilaiSiswa) unsubscribeNilaiSiswa();
  if (unsubscribeNilaiMapel) unsubscribeNilaiMapel();
  if (unsubscribeNilaiMengajar) unsubscribeNilaiMengajar();
  if (unsubscribeNilaiKelas) unsubscribeNilaiKelas();
  if (unsubscribeNilaiData) unsubscribeNilaiData();

  const documentsApi = getNilaiDocumentsApi();
  const siswaQuery = typeof getSemesterCollectionQuery === "function" ? getSemesterCollectionQuery("siswa", "nama") : documentsApi.collection("siswa").orderBy("nama");
  unsubscribeNilaiSiswa = siswaQuery.onSnapshot(snapshot => {
    semuaDataNilaiSiswa = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    scheduleRekapNilaiStateRender();
  });
  unsubscribeNilaiMapel = documentsApi.collection("mapel_bayangan").orderBy("kode_mapel").onSnapshot(snapshot => {
    semuaDataNilaiMapel = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    scheduleRekapNilaiStateRender();
  });
  unsubscribeNilaiMengajar = documentsApi.collection("mengajar_bayangan").onSnapshot(snapshot => {
    semuaDataNilaiMengajar = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    scheduleRekapNilaiStateRender();
  });
  unsubscribeNilaiKelas = typeof getSemesterCollectionQuery === "function"
    ? getSemesterCollectionQuery("kelas")
      .onSnapshot(snapshot => {
        semuaDataNilaiKelas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        scheduleRekapNilaiStateRender();
      })
    : documentsApi.collection("kelas").onSnapshot(snapshot => {
        semuaDataNilaiKelas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        scheduleRekapNilaiStateRender();
      });
  unsubscribeNilaiData = documentsApi.collection("nilai").onSnapshot(snapshot => {
    setSemuaDataNilai(snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(item => typeof isActiveTermDoc === "function" ? isActiveTermDoc(item) : true));
    scheduleRekapNilaiStateRender();
  });
}

function renderNilaiPageState() {
  syncNilaiStateFromStore();
  const assignmentSelect = document.getElementById("nilaiAssignmentSelect");
  const isSelectingAssignment = document.activeElement === assignmentSelect;
  const isEditingTable = document.activeElement?.classList?.contains("nilai-input-cell");
  renderNilaiInputModeUi();
  renderNilaiAssignmentOptions();
  syncCurrentNilaiAssignmentRows(getSelectedNilaiAssignment());
  if (isSelectingAssignment || isEditingTable) return;
  renderNilaiTableState();
  ensureSelectedNilaiAssignmentHydrated();
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
  const nextOptions = classes.length
    ? classes.map(item => `<option value="${escapeNilaiHtml(`${item.tingkat}|${item.rombel}`)}">${escapeNilaiHtml(item.label)}</option>`).join("")
    : `<option value="">Tidak ada kelas yang bisa diakses</option>`;
  if (nextOptions !== lastNilaiRekapClassOptionsKey || !select.children.length) {
    select.innerHTML = nextOptions;
    lastNilaiRekapClassOptionsKey = nextOptions;
  }
  if (currentValue && Array.from(select.options).some(option => option.value === currentValue)) {
    select.value = currentValue;
  }
  storeNilaiRekapClassKey(select.value || "");
}

function getNilaiAssignmentsForClass(tingkat = "", rombel = "") {
  const cacheKey = getNilaiAssignmentsForClassCacheKey(tingkat, rombel);
  if (nilaiDerivedCache.classAssignments.has(cacheKey)) {
    return nilaiDerivedCache.classAssignments.get(cacheKey);
  }
  const targetClassKey = getNilaiKelasParts(`${tingkat || ""}${rombel || ""}`).kelas;
  const rows = getNilaiAccessibleAssignments()
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
  nilaiDerivedCache.classAssignments.clear();
  nilaiDerivedCache.classAssignments.set(cacheKey, rows);
  return rows;
}

function renderRekapNilaiInfo(tingkat = "", rombel = "", assignments = [], students = []) {
  const info = document.getElementById("nilaiRekapInfo");
  if (!info) return;
  const nextInfoKey = JSON.stringify({ tingkat, rombel, assignments: assignments.length, students: students.length });
  if (!tingkat || !rombel) {
    if (lastNilaiRekapInfoKey !== nextInfoKey || !info.innerHTML) {
      info.innerHTML = "Pilih kelas untuk melihat rekap nilai.";
      lastNilaiRekapInfoKey = nextInfoKey;
    }
    return;
  }
  const nextHtml = `
    <span><strong>Kelas</strong>${escapeNilaiHtml(`${tingkat} ${rombel}`)}</span>
    <span><strong>Mapel</strong>${assignments.length}</span>
    <span><strong>Siswa</strong>${students.length}</span>
  `;
  if (nextInfoKey !== lastNilaiRekapInfoKey || info.innerHTML !== nextHtml) {
    info.innerHTML = nextHtml;
    lastNilaiRekapInfoKey = nextInfoKey;
  }
}

function renderRekapNilaiState() {
  syncNilaiStateFromStore();
  renderNilaiRekapClassOptions();
  const container = document.getElementById("nilaiRekapContainer");
  const select = document.getElementById("nilaiRekapClassSelect");
  if (!container || !select) return;

  storeNilaiRekapClassKey(select.value || "");
  const { tingkat, rombel } = getSelectedNilaiRekapClass();
  const assignments = getNilaiAssignmentsForClass(tingkat, rombel);
  const students = tingkat && rombel ? getNilaiStudentsForClass(tingkat, rombel) : [];

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

  const nextMarkup = `
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
  const renderKey = JSON.stringify({
    tingkat,
    rombel,
    assignmentIds: assignments.map(item => makeNilaiAssignmentId(item)),
    students: students.map(item => [item.nipd, item.nama, item.kelas, item.kelas_bayangan, item.updated_at || item.created_at || ""].map(value => String(value ?? "")).join("|")),
    nilaiRows: assignments.flatMap(assignment => students.map(student => {
      const nilaiDoc = getNilaiForStudent(assignment, student.nipd);
      return [makeNilaiAssignmentId(assignment), student.nipd, getNilaiFieldValue(nilaiDoc, "uh_1", ""), getNilaiFieldValue(nilaiDoc, "uh_2", ""), getNilaiFieldValue(nilaiDoc, "uh_3", ""), getNilaiFieldValue(nilaiDoc, "pts", ""), getNilaiItemTimestamp(nilaiDoc)].map(value => String(value ?? "")).join(":");
    }))
  });
  if (renderKey !== lastNilaiRekapRenderKey || !container.querySelector("table")) {
    container.innerHTML = nextMarkup;
    lastNilaiRekapRenderKey = renderKey;
  }
}

function getNilaiRoleDescription(modeRules = getNilaiModeRules()) {
  const user = getCurrentNilaiUser();
  const role = String(user.role || "").trim().toLowerCase();
  if (role === "guru") {
    return modeRules.isSemester
      ? "Mode semester aktif dari toggle pengaturan semester. Nilai yang berasal dari fase PTS tetap terkunci, sedangkan nilai yang Anda isi saat semester tetap bisa diedit."
      : "Mode PTS aktif dari toggle pengaturan semester. Guru menginput nilai PTS sesuai kelas dan mapel yang diajar.";
  }
  if (role === "koordinator") {
    return modeRules.isSemester
      ? `Koordinator sedang melihat mode semester untuk jenjang ${((typeof getCurrentCoordinatorLevelsSync === "function" ? getCurrentCoordinatorLevelsSync() : []).join(", ") || "-")}.`
      : `Koordinator sedang melihat mode PTS untuk jenjang ${((typeof getCurrentCoordinatorLevelsSync === "function" ? getCurrentCoordinatorLevelsSync() : []).join(", ") || "-")}.`;
  }
  return modeRules.isSemester
    ? "Admin sedang melihat mode semester. Nilai rapor dihitung otomatis dari UH, PTS, dan Semester."
    : "Admin sedang melihat mode PTS.";
}

function renderNilaiInputModeUi() {
  const modeRules = getNilaiModeRules();
  const title = document.getElementById("nilaiModeTitle");
  const description = document.getElementById("nilaiModeDescription");
  const selector = document.getElementById("nilaiModeSelect");
  const saveButton = document.querySelector(".nilai-save-action");
  if (title) title.textContent = getNilaiInputModeLabel();
  if (description) description.textContent = getNilaiRoleDescription(modeRules);
  if (selector) selector.value = modeRules.mode;
  if (saveButton) {
    const savesToDraft = shouldSaveNilaiAsOfflineDraft();
    saveButton.textContent = savesToDraft ? "Simpan Draft" : "Simpan";
    saveButton.title = savesToDraft
      ? "Perangkat sedang offline. Nilai akan disimpan sebagai draft di perangkat ini."
      : "Saat online, nilai langsung disimpan ke server.";
  }
}

function handleNilaiModeSelectorChange(event) {
  const nextMode = String(event?.target?.value || "pts").trim().toLowerCase() === "semester" ? "semester" : "pts";
  storeNilaiUiMode(nextMode);
  setNilaiInputMode(nextMode);
  renderNilaiInputModeUi();
  renderNilaiPageState();
}

function getCurrentRekapNilaiDataset() {
  const { tingkat, rombel } = getSelectedNilaiRekapClass();
  const assignments = getNilaiAssignmentsForClass(tingkat, rombel);
  const students = tingkat && rombel ? getNilaiStudentsForClass(tingkat, rombel) : [];

  return { tingkat, rombel, assignments, students };
}

function buildRekapNilaiSheetRows(assignments = [], students = []) {
  const topHeader = ["No", "Nama", "NIPD", "L/P"];
  const subHeader = ["", "", "", ""];
  const merges = [
    { s: { r: 0, c: 0 }, e: { r: 1, c: 0 } },
    { s: { r: 0, c: 1 }, e: { r: 1, c: 1 } },
    { s: { r: 0, c: 2 }, e: { r: 1, c: 2 } },
    { s: { r: 0, c: 3 }, e: { r: 1, c: 3 } }
  ];

  let currentCol = 4;
  assignments.forEach(item => {
    const mapel = getNilaiMapel(item.mapel_kode);
    const code = String(item.mapel_kode || "").toUpperCase();
    topHeader.push(code, "", "", "");
    subHeader.push("UH 1", "UH 2", "UH 3", "PTS");
    merges.push({
      s: { r: 0, c: currentCol },
      e: { r: 0, c: currentCol + 3 }
    });
    currentCol += 4;
  });

  const bodyRows = students.map((siswa, index) => {
    const row = [
      index + 1,
      String(siswa.nama || "").trim(),
      String(siswa.nipd || "").trim(),
      getNilaiGenderLabel(siswa)
    ];
    assignments.forEach(item => {
      const nilaiDoc = getNilaiForStudent(item, siswa.nipd);
      const fallbackNilai = nilaiDoc?.nilai ?? "";
      row.push(
        getNilaiFieldValue(nilaiDoc, "uh_1", fallbackNilai),
        getNilaiFieldValue(nilaiDoc, "uh_2", ""),
        getNilaiFieldValue(nilaiDoc, "uh_3", ""),
        getNilaiFieldValue(nilaiDoc, "pts", "")
      );
    });
    return row;
  });

  return {
    rows: [topHeader, subHeader, ...bodyRows],
    merges
  };
}

function applyRekapNilaiSheetStyles(worksheet, assignments = [], studentCount = 0) {
  if (!window.XLSX?.utils) return;
  const range = XLSX.utils.decode_range(worksheet["!ref"]);
  const thinBorder = {
    top: { style: "thin", color: { rgb: "CBD5E1" } },
    bottom: { style: "thin", color: { rgb: "CBD5E1" } },
    left: { style: "thin", color: { rgb: "CBD5E1" } },
    right: { style: "thin", color: { rgb: "CBD5E1" } }
  };
  const mediumBorder = {
    top: { style: "medium", color: { rgb: "93C5FD" } },
    bottom: { style: "medium", color: { rgb: "93C5FD" } },
    left: { style: "medium", color: { rgb: "93C5FD" } },
    right: { style: "medium", color: { rgb: "93C5FD" } }
  };
  const topHeaderStyle = {
    font: { bold: true, color: { rgb: "0F172A" } },
    fill: { fgColor: { rgb: "E0F2FE" } },
    alignment: { horizontal: "center", vertical: "center" },
    border: thinBorder
  };
  const subHeaderStyle = {
    font: { bold: true, color: { rgb: "0F172A" } },
    fill: { fgColor: { rgb: "F8FAFC" } },
    alignment: { horizontal: "center", vertical: "center" },
    border: thinBorder
  };
  const textCellStyle = {
    alignment: { horizontal: "left", vertical: "center" },
    border: thinBorder
  };
  const centerCellStyle = {
    alignment: { horizontal: "center", vertical: "center" },
    border: thinBorder
  };

  for (let col = range.s.c; col <= range.e.c; col += 1) {
    const topCell = worksheet[XLSX.utils.encode_cell({ r: 0, c: col })];
    if (topCell) topCell.s = topHeaderStyle;
    const subCell = worksheet[XLSX.utils.encode_cell({ r: 1, c: col })];
    if (subCell) subCell.s = subHeaderStyle;
  }

  for (let row = 2; row <= studentCount + 1; row += 1) {
    for (let col = range.s.c; col <= range.e.c; col += 1) {
      const address = XLSX.utils.encode_cell({ r: row, c: col });
      if (!worksheet[address]) worksheet[address] = { t: "s", v: "" };
      worksheet[address].s = col === 1 ? textCellStyle : centerCellStyle;
    }
  }

  assignments.forEach((_, index) => {
    const startCol = 4 + (index * 4);
    const endCol = startCol + 3;

    for (let col = startCol; col <= endCol; col += 1) {
      const topAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      const subAddress = XLSX.utils.encode_cell({ r: 1, c: col });
      if (worksheet[topAddress]) {
        worksheet[topAddress].s = {
          ...worksheet[topAddress].s,
          border: mediumBorder
        };
      }
      if (worksheet[subAddress]) {
        worksheet[subAddress].s = {
          ...worksheet[subAddress].s,
          border: {
            ...thinBorder,
            left: col === startCol ? mediumBorder.left : thinBorder.left,
            right: col === endCol ? mediumBorder.right : thinBorder.right,
            bottom: mediumBorder.bottom
          }
        };
      }

      for (let row = 2; row <= studentCount + 1; row += 1) {
        const bodyAddress = XLSX.utils.encode_cell({ r: row, c: col });
        if (!worksheet[bodyAddress]) continue;
        worksheet[bodyAddress].s = {
          ...worksheet[bodyAddress].s,
          border: {
            ...thinBorder,
            left: col === startCol ? mediumBorder.left : thinBorder.left,
            right: col === endCol ? mediumBorder.right : thinBorder.right
          }
        };
      }
    }
  });

  worksheet["!cols"] = [
    { wch: 4.5 },
    { wch: 22 },
    { wch: 11 },
    { wch: 5 },
    ...assignments.flatMap(() => ([{ wch: 6.5 }, { wch: 6.5 }, { wch: 6.5 }, { wch: 6.5 }]))
  ];
  worksheet["!rows"] = [{ hpt: 22 }, { hpt: 20 }];
}

async function exportRekapNilaiExcel() {
  await ensureSpreadsheetLibraries();
  const { tingkat, rombel, assignments, students } = getCurrentRekapNilaiDataset();
  if (!tingkat || !rombel) {
    Swal.fire("Pilih kelas", "Pilih kelas terlebih dahulu untuk export rekap nilai.", "warning");
    return;
  }
  if (!assignments.length) {
    Swal.fire("Belum ada mapel", `Belum ada mapel pada kelas ${tingkat} ${rombel}.`, "warning");
    return;
  }
  if (!students.length) {
    Swal.fire("Belum ada siswa", `Belum ada siswa pada kelas ${tingkat} ${rombel}.`, "warning");
    return;
  }

  const { rows, merges } = buildRekapNilaiSheetRows(assignments, students);
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  worksheet["!merges"] = merges;
  applyRekapNilaiSheetStyles(worksheet, assignments, students.length);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, `Rekap ${tingkat}${rombel}`);
  await saveNilaiWorkbookFile(workbook, `rekap-nilai-${tingkat}${rombel}.xlsx`);
}

async function handleNilaiAssignmentChange() {
  const assignment = getSelectedNilaiAssignment();
  syncCurrentNilaiAssignmentRows(assignment);
  if (assignment?.mapel_kode) {
    applyNilaiAssignmentLocalCache(assignment);
  }
  renderNilaiTableState();
  if (!assignment?.mapel_kode) return;
  try {
    setNilaiLoadState(assignment, { loading: true, error: "" });
    renderNilaiLoadStatus(assignment);
    const changed = await hydrateNilaiCacheForAssignment(assignment);
    syncCurrentNilaiAssignmentRows(assignment);
    setNilaiLoadState(assignment, {
      loading: false,
      source: window.GuruOffline?.isOnline?.() === false ? "cache" : "server",
      refreshedAt: new Date().toISOString(),
      rows: currentNilaiAssignmentRows.length,
      error: ""
    });
    if (changed || currentNilaiAssignmentRows.length > 0) {
      renderNilaiTableState();
    } else {
      renderNilaiLoadStatus(assignment);
    }
  } catch (error) {
    console.error("hydrate nilai assignment failed", error);
    setNilaiLoadState(assignment, {
      loading: false,
      error: error?.message || "Data belum berhasil diperbarui."
    });
    renderNilaiLoadStatus(assignment);
  }
}

async function ensureSelectedNilaiAssignmentHydrated() {
  const assignment = getSelectedNilaiAssignment();
  if (!assignment?.mapel_kode) return;
  const key = makeNilaiAssignmentHydrationKey(assignment);
  if (nilaiHydratedAssignmentKeys.has(key) || nilaiHydratingAssignmentKeys.has(key)) return;
  nilaiHydratingAssignmentKeys.add(key);
  try {
    if (applyNilaiAssignmentLocalCache(assignment)) {
      renderNilaiTableState();
    }
    setNilaiLoadState(assignment, { loading: true, error: "" });
    renderNilaiLoadStatus(assignment);
    const changed = await hydrateNilaiCacheForAssignment(assignment);
    syncCurrentNilaiAssignmentRows(assignment);
    setNilaiLoadState(assignment, {
      loading: false,
      source: window.GuruOffline?.isOnline?.() === false ? "cache" : "server",
      refreshedAt: new Date().toISOString(),
      rows: currentNilaiAssignmentRows.length,
      error: ""
    });
    if (changed || currentNilaiAssignmentRows.length > 0) {
      renderNilaiTableState();
    } else {
      renderNilaiLoadStatus(assignment);
    }
  } catch (error) {
    console.error("hydrate selected nilai assignment failed", error);
    setNilaiLoadState(assignment, {
      loading: false,
      error: error?.message || "Data belum berhasil diperbarui."
    });
    renderNilaiLoadStatus(assignment);
  } finally {
    nilaiHydratingAssignmentKeys.delete(key);
  }
}

async function refreshSelectedNilaiAssignment() {
  const assignment = getSelectedNilaiAssignment();
  if (!assignment?.mapel_kode) {
    Swal.fire("Pilih kelas dan mapel", "Refresh membutuhkan kelas dan mapel yang aktif.", "warning");
    return;
  }
  if (window.GuruOffline?.isOnline?.() === false) {
    applyNilaiAssignmentLocalCache(assignment);
    renderNilaiTableState();
    Swal.fire("Masih offline", "Data ditampilkan dari cache perangkat. Hubungkan internet untuk refresh dari server.", "info");
    return;
  }
  try {
    setNilaiLoadState(assignment, { loading: true, error: "" });
    renderNilaiLoadStatus(assignment);
    await hydrateNilaiCacheForAssignment(assignment, { force: true });
    syncCurrentNilaiAssignmentRows(assignment);
    setNilaiLoadState(assignment, {
      loading: false,
      source: "server",
      refreshedAt: new Date().toISOString(),
      rows: currentNilaiAssignmentRows.length,
      error: ""
    });
    renderNilaiTableState();
  } catch (error) {
    console.error("refresh nilai assignment failed", error);
    setNilaiLoadState(assignment, {
      loading: false,
      error: error?.message || "Refresh belum berhasil."
    });
    renderNilaiLoadStatus(assignment);
    Swal.fire("Refresh gagal", error?.message || "Data belum berhasil diperbarui.", "error");
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
  renderNilaiInputModeUi();
  renderNilaiAssignmentInfo(assignment);
  renderNilaiLoadStatus(assignment);
  renderNilaiOfflineDraftInfo(assignment);
  if (!assignment.mapel_kode) {
    container.innerHTML = `<div class="empty-panel">Belum ada data pembagian mengajar kelas bayangan.</div>`;
    return;
  }

  const students = getNilaiStudentsForAssignment(assignment);
  const headerFieldConfigs = getNilaiInputFieldConfigs();
  if (students.length === 0) {
    container.innerHTML = `<div class="empty-panel">Belum ada siswa pada kelas bayangan ${escapeNilaiHtml(`${assignment.tingkat} ${assignment.rombel}`)}.</div>`;
    return;
  }

  const nextMarkup = `
    <table class="mapel-table nilai-table">
      <thead>
        <tr>
          <th>No</th>
          <th>Nama Siswa</th>
          ${headerFieldConfigs.map(field => `<th data-field="${escapeNilaiHtml(field.key)}" class="${escapeNilaiHtml(field.className.replace("input-", "") + "-head")}">${escapeNilaiHtml(field.label)}</th>`).join("")}
        </tr>
      </thead>
      <tbody>
        ${students.map((siswa, index) => {
          const draftDoc = getNilaiOfflineDraftDocForStudent(assignment, siswa.nipd);
          const nilaiDoc = draftDoc || getNilaiForStudent(assignment, siswa.nipd);
          const values = getNilaiUiValues(nilaiDoc);
          const ptsLockedUpto = getNilaiPtsLockedUpto(nilaiDoc, values);
          const rowFieldConfigs = getNilaiInputFieldConfigs(values, { ptsLockedUpto });
          const rowStatus = getNilaiRowCompletionStatus(values, rowFieldConfigs);
          return `
            <tr class="${draftDoc ? "nilai-draft-row" : ""} nilai-row-status-${rowStatus}" data-nilai-status="${rowStatus}">
              <td>${index + 1}</td>
              <td class="nilai-student-name">${escapeNilaiHtml(siswa.nama || "-")}</td>
              ${rowFieldConfigs.map(field => {
                const rowReadOnly = isNilaiRowFieldReadOnly(field, values, { ptsLockedUpto });
                return `
                <td data-field="${escapeNilaiHtml(field.key)}">
                  <input
                    class="nilai-input-cell ${escapeNilaiHtml(field.className)}${rowReadOnly ? " nilai-input-readonly" : ""}"
                    data-row="${index}"
                    data-field="${escapeNilaiHtml(field.key)}"
                    data-pts-locked-upto="${ptsLockedUpto}"
                    id="nilai-${escapeNilaiHtml(field.key)}-${escapeNilaiHtml(siswa.nipd)}"
                    type="${field.key === "rapor" ? "text" : "number"}"
                    min="0"
                    max="100"
                    step="${field.key === "rapor" ? "0.01" : "1"}"
                    value="${escapeNilaiHtml(values[field.key])}"
                    ${rowReadOnly ? "readonly" : ""}
                  >
                </td>
              `;
              }).join("")}
            </tr>
          `;
        }).join("")}
      </tbody>
    </table>
  `;
  const renderKey = JSON.stringify({
    assignmentId: makeNilaiAssignmentId(assignment),
    mode: currentNilaiInputMode,
    quickFilter: nilaiQuickFilter,
    fields: headerFieldConfigs.map(field => field.key),
    students: students.map(item => [item.nipd, item.nama, item.kelas, item.kelas_bayangan, item.updated_at || item.created_at || ""].map(value => String(value ?? "")).join("|")),
    nilaiRows: students.map(student => {
      const draftDoc = getNilaiOfflineDraftDocForStudent(assignment, student.nipd);
      const nilaiDoc = draftDoc || getNilaiForStudent(assignment, student.nipd);
      const values = getNilaiUiValues(nilaiDoc);
      return [student.nipd, values.uh1, values.uh2, values.uh3, values.pts, values.rapor, Boolean(draftDoc), getNilaiItemTimestamp(nilaiDoc)].map(value => String(value ?? "")).join(":");
    })
  });
  if (renderKey !== lastNilaiTableRenderKey || !container.querySelector("table")) {
    container.innerHTML = nextMarkup;
    lastNilaiTableRenderKey = renderKey;
    setupNilaiTableInputs();
    window.ResponsiveTables?.enhanceAll?.();
  }
  applyNilaiTableColumnVisibility(container);
  renderNilaiQuickFilterState();
}

function renderNilaiLoadStatus(assignment) {
  const panel = document.getElementById("nilaiLoadStatus");
  if (!panel) return;
  if (!assignment?.mapel_kode) {
    panel.hidden = true;
    panel.innerHTML = "";
    return;
  }
  const state = getNilaiLoadState(assignment);
  const cacheInfo = getNilaiAssignmentCacheInfo(assignment);
  const online = window.GuruOffline?.isOnline?.() !== false;
  const cacheTime = cacheInfo?.savedAt ? new Date(cacheInfo.savedAt).toLocaleString("id-ID") : "";
  const refreshTime = state.refreshedAt ? new Date(state.refreshedAt).toLocaleString("id-ID") : "";
  const saveMode = canSaveNilaiAsOfflineDraft()
    ? online ? "Simpan langsung ke server" : "Simpan menjadi draft offline"
    : "Simpan langsung ke server";
  const statusText = state.loading
    ? "Memperbarui data nilai..."
    : state.error
    ? "Refresh terakhir gagal"
    : !online
    ? "Offline, memakai data cache bila tersedia"
    : state.source === "server"
    ? "Data sudah diperbarui dari server"
    : cacheInfo
    ? "Data cache siap, tekan Refresh untuk mengambil versi terbaru"
    : "Data siap dimuat, tekan Refresh bila nilai belum muncul";
  const meta = [
    saveMode,
    cacheInfo ? `Cache ${cacheInfo.rows} nilai${cacheTime ? `, ${cacheTime}` : ""}` : "",
    refreshTime ? `Refresh ${refreshTime}` : "",
    state.error ? state.error : ""
  ].filter(Boolean);
  panel.hidden = false;
  panel.classList.toggle("is-loading", Boolean(state.loading));
  panel.classList.toggle("is-offline", !online);
  panel.classList.toggle("has-error", Boolean(state.error));
  panel.innerHTML = `
    <strong>${escapeNilaiHtml(statusText)}</strong>
    <span>${escapeNilaiHtml(meta.join(" | "))}</span>
  `;
}

function applyNilaiTableColumnVisibility(container) {
  if (!container) return;
  const hiddenFields = new Set(getNilaiModeRules().hiddenFieldKeys);
  container.querySelectorAll("th[data-field], td[data-field]").forEach(cell => {
    const field = String(cell.getAttribute("data-field") || "").trim();
    cell.style.display = hiddenFields.has(field) ? "none" : "";
  });
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

function getNormalizedNilaiCellValueByRowOptional(rowIndex, field, fallback = "") {
  const input = getNilaiTableInput(rowIndex, field);
  if (!input) return fallback;
  const normalized = normalizeNilaiManualInputValue(input.value);
  input.value = normalized;
  return normalized;
}

function toNilaiPayloadNumber(value) {
  const normalized = normalizeNilaiManualInputValue(value);
  return normalized === "" ? "" : Number(normalized);
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

  const supabaseClient = getNilaiSupabaseClient();
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
  saveNilaiAssignmentOfflineCache(assignment, getNilaiRowsFromCacheForAssignment(assignment));
  return JSON.stringify(semuaDataNilai) !== previousSerialized;
}

async function hydrateNilaiCacheForAssignment(assignment, options = {}) {
  if (!assignment?.mapel_kode) return false;
  const supabaseClient = getNilaiSupabaseClient();
  const documentsTable = window.supabaseConfig?.documentsTable || "app_documents";
  const key = makeNilaiAssignmentHydrationKey(assignment);
  if (!options.force && nilaiHydratedAssignmentKeys.has(key)) return false;

  const useOfflineCache = async () => {
    const cachedRows = loadNilaiAssignmentOfflineCache(assignment);
    if (cachedRows.length) {
      nilaiHydratedAssignmentKeys.add(key);
      currentNilaiAssignmentId = makeNilaiAssignmentId(assignment);
      currentNilaiAssignmentRows = cachedRows;
      const rows = cachedRows.map(item => ({
        id: item.id,
        siswa: { nipd: item.nipd || String(item.id || "").split("_").at(-1) || "" },
        payload: item
      }));
      return mergeSavedNilaiRowsIntoCache(rows, assignment);
    }
    const persistedRows = await loadNilaiAssignmentFromPersistedCollection(assignment);
    if (!persistedRows.length) return false;
    nilaiHydratedAssignmentKeys.add(key);
    currentNilaiAssignmentId = makeNilaiAssignmentId(assignment);
    currentNilaiAssignmentRows = rowsToNilaiCacheItems(persistedRows, assignment);
    saveNilaiAssignmentOfflineCache(assignment, persistedRows);
    return mergeSavedNilaiRowsIntoCache(persistedRows, assignment);
  };

  if (!supabaseClient?.from || window.GuruOffline?.isOnline?.() === false) {
    return useOfflineCache();
  }

  try {
    const { data, error } = await supabaseClient
      .from(documentsTable)
      .select("id,data")
      .eq("collection_path", "nilai")
      .filter("data->>mapel_kode", "eq", String(assignment.mapel_kode || "").toUpperCase());

    if (error) throw error;

    const students = getNilaiStudentsForAssignment(assignment);
    const existingIds = new Set((data || []).map(item => item?.id).filter(Boolean));
    const directIds = students
      .flatMap(siswa => getNilaiPossibleDocIds(assignment, siswa.nipd))
      .filter(id => id && !existingIds.has(id));
    const directRows = [];
    for (let index = 0; index < directIds.length; index += 150) {
      const idChunk = directIds.slice(index, index + 150);
      if (!idChunk.length) continue;
      const { data: chunkData, error: chunkError } = await supabaseClient
        .from(documentsTable)
        .select("id,data")
        .eq("collection_path", "nilai")
        .in("id", idChunk);
      if (chunkError) throw chunkError;
      directRows.push(...(chunkData || []));
    }

    nilaiHydratedAssignmentKeys.add(key);
    const rows = [...(data || []), ...directRows]
      .filter(item => typeof isActiveTermDoc === "function" ? isActiveTermDoc(item?.data || {}) : true)
      .filter(item => isNilaiDocMatchingAssignment(item?.data || {}, assignment))
      .map(item => ({
        id: item?.id || "",
        siswa: { nipd: item?.data?.nipd || String(item?.id || "").split("_").at(-1) || "" },
        payload: { ...(item?.data || {}) }
      }));
    currentNilaiAssignmentId = makeNilaiAssignmentId(assignment);
    currentNilaiAssignmentRows = rowsToNilaiCacheItems(rows, assignment);
    saveNilaiAssignmentOfflineCache(assignment, rows);
    return mergeSavedNilaiRowsIntoCache(rows, assignment);
  } catch (error) {
    window.GuruOffline?.markOffline?.();
    if (await useOfflineCache()) return true;
    throw error;
  }
}

function getNilaiTableInput(rowIndex, field) {
  return document.querySelector(`.nilai-input-cell[data-row="${rowIndex}"][data-field="${field}"]`);
}

function getNilaiRowPtsLockedUpto(rowIndex) {
  const input = document.querySelector(`.nilai-input-cell[data-row="${rowIndex}"]`);
  const stored = Number(input?.dataset?.ptsLockedUpto);
  return Number.isInteger(stored) && stored >= 0 ? stored : 0;
}

function updateNilaiInputDependencies(rowIndex) {
  const sequence = getNilaiSequentialUhFields();
  if (getNilaiModeRules().isSemester && getNilaiModeRules().isGuruMode) {
    const activeInput = document.activeElement?.classList?.contains("nilai-input-cell")
      ? document.activeElement
      : null;
    const activeField = String(activeInput?.dataset?.field || "").trim();
    const activeRowIndex = Number(activeInput?.dataset?.row);
    const rowValues = {};
    sequence.forEach(field => {
      const input = getNilaiTableInput(rowIndex, field);
      rowValues[field] = input ? normalizeNilaiManualInputValue(input.value) : "";
    });
    const ptsLockedUpto = getNilaiRowPtsLockedUpto(rowIndex);
    const lockedFields = getNilaiModeRules(rowValues, { ptsLockedUpto }).lockedSemesterUhKeys;
    const nextEditableIndex = lockedFields.size;
    sequence.forEach((field, index) => {
      const input = getNilaiTableInput(rowIndex, field);
      if (!input || input.readOnly) return;
      const shouldEnable = index <= nextEditableIndex;
      input.disabled = !shouldEnable;
      input.classList.toggle("is-disabled", !shouldEnable);
      if (!shouldEnable) input.value = "";
    });

    if (!Number.isNaN(activeRowIndex) && activeRowIndex === rowIndex && activeField) {
      const restoredInput = getNilaiTableInput(rowIndex, activeField);
      if (restoredInput && !restoredInput.disabled && !restoredInput.readOnly && document.activeElement !== restoredInput) {
        restoredInput.focus();
      }
    }

    const raporInput = getNilaiTableInput(rowIndex, "rapor");
    if (raporInput) {
      const values = {};
      ["uh1", "uh2", "uh3", "uh4", "uh5", "pts", "semester"].forEach(field => {
        const input = getNilaiTableInput(rowIndex, field);
        values[field] = input ? normalizeNilaiManualInputValue(input.value) : "";
      });
      raporInput.value = normalizeNilaiOutputNumber(calculateNilaiRapor(values));
    }
    return;
  }

  sequence.forEach((field, index) => {
    if (index === 0) return;
    const previousInput = getNilaiTableInput(rowIndex, sequence[index - 1]);
    const currentInput = getNilaiTableInput(rowIndex, field);
    if (!previousInput || !currentInput || currentInput.readOnly) return;

    const hasPrevious = String(previousInput.value || "").trim() !== "";
    currentInput.disabled = !hasPrevious;
    currentInput.classList.toggle("is-disabled", !hasPrevious);
    if (!hasPrevious) currentInput.value = "";
  });

  const raporInput = getNilaiTableInput(rowIndex, "rapor");
  if (raporInput) {
    const values = {};
    ["uh1", "uh2", "uh3", "uh4", "uh5", "pts", "semester"].forEach(field => {
      const input = getNilaiTableInput(rowIndex, field);
      values[field] = input ? normalizeNilaiManualInputValue(input.value) : "";
    });
    raporInput.value = normalizeNilaiOutputNumber(calculateNilaiRapor(values));
  }
}

function handleNilaiTableInput(event) {
  const input = event.target;
  if (!input?.classList?.contains("nilai-input-cell")) return;
  input.value = normalizeNilaiManualInputValue(input.value);
  const rowIndex = Number(input.dataset.row);
  if (!Number.isNaN(rowIndex)) updateNilaiInputDependencies(rowIndex);
  scheduleNilaiDraftAutosave();
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
  const nextHtml = `
    <span><strong>Kelas</strong>${escapeNilaiHtml(`${assignment.tingkat} ${assignment.rombel}`)}</span>
    <span><strong>Mapel</strong>${escapeNilaiHtml(mapel?.nama_mapel || assignment.mapel_kode)}</span>
    <span><strong>Siswa</strong>${siswaCount}</span>
  `;
  if (infoKey !== lastNilaiAssignmentInfoKey || info.innerHTML !== nextHtml) {
    info.innerHTML = nextHtml;
    lastNilaiAssignmentInfoKey = infoKey;
  }
}

function getNilaiRowCompletionStatus(values = {}, fieldConfigs = getNilaiInputFieldConfigs(values)) {
  const editableKeys = fieldConfigs
    .filter(field => !field.readOnly && field.key !== "rapor")
    .map(field => field.key);
  const keys = editableKeys.length ? editableKeys : fieldConfigs.map(field => field.key).filter(key => key !== "rapor");
  const filled = keys.filter(key => String(values[key] ?? "").trim() !== "").length;
  if (!filled) return "empty";
  return filled >= keys.length ? "full" : "partial";
}

function renderNilaiQuickFilterState() {
  const container = document.getElementById("nilaiTableContainer");
  if (container) container.dataset.filter = nilaiQuickFilter;
  document.querySelectorAll(".nilai-quick-filter button").forEach(button => {
    const active = button.dataset.filter === nilaiQuickFilter;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  });
}

function setNilaiQuickFilter(filter = "all") {
  nilaiQuickFilter = ["all", "empty", "partial", "full"].includes(filter) ? filter : "all";
  renderNilaiQuickFilterState();
}

function setNilaiAutosaveStatus(message = "", tone = "") {
  const panel = document.getElementById("nilaiAutosaveStatus");
  if (!panel) return;
  panel.hidden = true;
  panel.textContent = "";
  panel.className = "nilai-autosave-status";
}

function showNilaiOperationNotification() {
  return false;
}

function scheduleNilaiDraftAutosave() {
  if (!canSaveNilaiAsOfflineDraft()) return;
  const assignment = getSelectedNilaiAssignment();
  if (!assignment?.mapel_kode) return;
  window.clearTimeout(nilaiAutosaveTimer);
  nilaiAutosaveTimer = window.setTimeout(async () => {
    if (nilaiAutosaveInFlight || isNilaiSaving) return;
    nilaiAutosaveInFlight = true;
    try {
      const result = await saveNilaiAssignmentOfflineDraft({
        automatic: true,
        silent: true,
        skipRender: true
      });
      if (result?.saved) {
        setNilaiAutosaveStatus(`Draft otomatis tersimpan (${result.rows.length} perubahan)`, "saved");
        window.setTimeout(() => setNilaiAutosaveStatus("", ""), 3500);
      } else if (result?.reason === "no-change") {
        setNilaiAutosaveStatus("", "");
      }
    } finally {
      nilaiAutosaveInFlight = false;
    }
  }, 1800);
}

function getNilaiTemplateRows(assignment) {
  const fieldConfigs = getNilaiInputFieldConfigs();
  return getNilaiStudentsForAssignment(assignment).map((siswa, index) => {
    const nilaiDoc = getNilaiForStudent(assignment, siswa.nipd);
    const values = getNilaiUiValues(nilaiDoc);
    const row = {
      NO: index + 1,
      NIPD: siswa.nipd || "",
      NAMA: siswa.nama || ""
    };
    fieldConfigs.forEach(field => {
      row[getNilaiFieldExportHeader(field)] = values[field.key];
    });
    return row;
  });
}

function applyNilaiTemplateStyles(worksheet, rowCount) {
  const range = XLSX.utils.decode_range(worksheet["!ref"]);
  const fieldHeaders = getNilaiInputFieldConfigs().map(getNilaiFieldExportHeader);
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
  const semesterStyle = {
    fill: { fgColor: { rgb: "FEF3C7" } },
    border: headerStyle.border,
    protection: { locked: false }
  };
  const raporStyle = {
    fill: { fgColor: { rgb: "FDE68A" } },
    border: headerStyle.border,
    protection: { locked: true }
  };
  const lockedStyle = {
    border: headerStyle.border,
    protection: { locked: true }
  };

  for (let col = range.s.c; col <= range.e.c; col++) {
    const cell = worksheet[XLSX.utils.encode_cell({ r: 0, c: col })];
    if (!cell) continue;
    const fieldHeader = fieldHeaders[col - 3];
    if (/^UH[1-5]$/.test(fieldHeader || "")) cell.s = { ...headerStyle, fill: { fgColor: { rgb: "BFDBFE" } } };
    else if (fieldHeader === "PTS") cell.s = { ...headerStyle, fill: { fgColor: { rgb: "BBF7D0" } } };
    else if (fieldHeader === "SEMESTER") cell.s = { ...headerStyle, fill: { fgColor: { rgb: "FDE68A" } } };
    else if (fieldHeader === "NILAI_RAPOR") cell.s = { ...headerStyle, fill: { fgColor: { rgb: "FBBF24" } } };
    else cell.s = headerStyle;
  }

  for (let row = 1; row <= rowCount; row++) {
    for (let col = range.s.c; col <= range.e.c; col++) {
      const address = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = worksheet[address] || { t: "s", v: "" };
      worksheet[address] = cell;
      const fieldHeader = fieldHeaders[col - 3];
      if (/^UH[1-5]$/.test(fieldHeader || "") && getNilaiModeRules().isSemester && isFilledNilaiValue(cell.v)) cell.s = lockedStyle;
      else if (/^UH[1-5]$/.test(fieldHeader || "")) cell.s = uhStyle;
      else if (fieldHeader === "PTS" && getNilaiModeRules().isSemester) cell.s = lockedStyle;
      else if (fieldHeader === "PTS") cell.s = ptsStyle;
      else if (fieldHeader === "SEMESTER") cell.s = semesterStyle;
      else if (fieldHeader === "NILAI_RAPOR") cell.s = raporStyle;
      else cell.s = lockedStyle;
    }
  }

  worksheet["!cols"] = [{ wch: 6 }, { wch: 14 }, { wch: 30 }]
    .concat(fieldHeaders.map(field => field === "NILAI_RAPOR" ? { wch: 14 } : { wch: 10 }));
  // Sheet protection is intentionally not enabled because the browser XLSX build
  // can ignore per-cell unlock styles, causing every cell to be locked in Excel.
}

function getNilaiRaporDownloadClassOptions(assignment) {
  const students = getNilaiStudentsForAssignment(assignment);
  const options = new Map();
  students.forEach(siswa => {
    const originalClass = getNilaiKelasParts(siswa.kelas).kelas;
    if (originalClass) {
      options.set(`asli|${originalClass}`, {
        value: `asli|${originalClass}`,
        label: `Kelas asli: ${originalClass}`,
        source: "asli",
        classKey: originalClass
      });
    }
  });
  return [...options.values()].sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true, sensitivity: "base" }));
}

function sortNilaiExportStudents(students = []) {
  return students.sort((a, b) => {
    const byName = String(a.nama || "").localeCompare(String(b.nama || ""), undefined, { numeric: true, sensitivity: "base" });
    if (byName) return byName;
    return String(a.nipd || "").localeCompare(String(b.nipd || ""), undefined, { numeric: true, sensitivity: "base" });
  });
}

function getNilaiStudentsForOriginalClass(classKey = "", assignment = null) {
  const target = getNilaiKelasParts(classKey).kelas;
  return sortNilaiExportStudents(semuaDataNilaiSiswa
    .map(siswa => ({
      ...siswa,
      kelasAsliParts: getNilaiKelasParts(siswa.kelas),
      kelasNilaiParts: getNilaiKelasBayanganParts(siswa)
    }))
    .filter(siswa => {
      if (siswa.kelasAsliParts?.kelas !== target) return false;
      return true;
    }));
}

function getNilaiStudentsForEffectiveClass(classKey = "") {
  const target = getNilaiKelasParts(classKey).kelas;
  return sortNilaiExportStudents(semuaDataNilaiSiswa
    .map(siswa => ({ ...siswa, kelasNilaiParts: getNilaiKelasBayanganParts(siswa) }))
    .filter(siswa => siswa.kelasNilaiParts?.kelas === target));
}

function getNilaiRaporExportStudents(assignment, option) {
  return getNilaiStudentsForOriginalClass(option.classKey, assignment);
}

function makeNilaiExportAssignmentKey(assignment = {}) {
  return [
    assignment.tingkat,
    String(assignment.rombel || "").toUpperCase(),
    String(assignment.mapel_kode || "").toUpperCase(),
    String(assignment.guru_kode || "").toUpperCase()
  ].join("|");
}

function getNilaiAssignmentsForExportStudent(baseAssignment = {}, siswa = {}) {
  const mapelKode = String(baseAssignment.mapel_kode || "").trim().toUpperCase();
  if (!mapelKode) return [];
  const kelasCandidates = [
    getNilaiKelasBayanganParts(siswa),
    getNilaiKelasParts(siswa.kelas)
  ].filter(parts => parts?.tingkat && parts?.rombel);
  return semuaDataNilaiMengajar.filter(item => {
    if (String(item.mapel_kode || "").trim().toUpperCase() !== mapelKode) return false;
    return kelasCandidates.some(parts =>
      String(item.tingkat || "") === String(parts.tingkat || "") &&
      String(item.rombel || "").trim().toUpperCase() === String(parts.rombel || "").trim().toUpperCase()
    );
  });
}

async function hydrateNilaiCacheForRaporExport(assignment, option) {
  const students = getNilaiRaporExportStudents(assignment, option);
  const assignments = new Map();
  if (assignment?.mapel_kode) assignments.set(makeNilaiExportAssignmentKey(assignment), assignment);
  students.forEach(siswa => {
    getNilaiAssignmentsForExportStudent(assignment, siswa).forEach(item => {
      assignments.set(makeNilaiExportAssignmentKey(item), item);
    });
  });
  for (const item of assignments.values()) {
    try {
      await hydrateNilaiCacheForAssignment(item);
    } catch (error) {
      console.warn("Gagal memuat nilai untuk export rapor", item, error);
    }
  }
}

function getNilaiForStudentExport(assignment, nipd) {
  const directValue = getNilaiForStudent(assignment, nipd);
  if (directValue) return directValue;
  const mapelKode = String(assignment.mapel_kode || "").trim().toUpperCase();
  const guruKode = String(assignment.guru_kode || "").trim().toUpperCase();
  const matchesStudentMapel = item =>
    String(item?.nipd || "") === String(nipd || "") &&
    String(item?.mapel_kode || "").trim().toUpperCase() === mapelKode &&
    isNilaiDocInActiveTerm(item);
  const candidates = [
    ...currentNilaiAssignmentRows.filter(matchesStudentMapel),
    ...semuaDataNilai.filter(matchesStudentMapel)
  ];
  if (!candidates.length) return null;
  return candidates.sort((a, b) => {
    const aGuru = String(a?.guru_kode || "").trim().toUpperCase();
    const bGuru = String(b?.guru_kode || "").trim().toUpperCase();
    const aGuruMatch = guruKode && aGuru === guruKode ? 1 : 0;
    const bGuruMatch = guruKode && bGuru === guruKode ? 1 : 0;
    if (aGuruMatch !== bGuruMatch) return bGuruMatch - aGuruMatch;
    return getNilaiItemTimestamp(b) - getNilaiItemTimestamp(a);
  })[0] || null;
}

function getNilaiRaporRowsForExport(assignment, option) {
  const students = getNilaiRaporExportStudents(assignment, option);
  return students.map((siswa, index) => {
    const nilaiDoc = getNilaiForStudentExport(assignment, siswa.nipd);
    const values = getNilaiUiValues(nilaiDoc);
    return {
      NO: index + 1,
      NIPD: siswa.nipd || "",
      NAMA: siswa.nama || "",
      KELAS: siswa.kelasAsliParts?.kelas || option.classKey,
      NILAI_RAPOR: values.rapor
    };
  });
}

function getNilaiRaporEmptyRows(rows = []) {
  return rows.filter(row => String(row?.NILAI_RAPOR ?? "").trim() === "");
}

function makeNilaiDownloadSlug(value = "") {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "NILAI";
}

function isNilaiNativeDownloadAvailable() {
  return Boolean((window.Capacitor?.isNativePlatform?.() || window.isGuruSpenturiNativeApp?.())
    && window.Capacitor?.Plugins?.Filesystem?.writeFile);
}

function arrayBufferToNilaiBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode.apply(null, chunk);
  }
  return btoa(binary);
}

async function notifyNilaiDownloadFinished(fileName, options = {}) {
  const native = Boolean(options.native);
  await Swal.fire({
    title: native ? "File tersimpan" : "Download dimulai",
    html: native
      ? `File <strong>${escapeNilaiHtml(fileName)}</strong> disimpan ke folder <strong>Documents/Dokumen</strong> aplikasi Guru Spenturi. Cek aplikasi <strong>File Manager</strong> atau <strong>Files</strong> di HP.`
      : `File <strong>${escapeNilaiHtml(fileName)}</strong> dikirim ke download browser. Cek folder <strong>Download/Unduhan</strong>.`,
    icon: "success",
    confirmButtonText: "OK"
  });
}

async function saveNilaiWorkbookFile(workbook, fileName) {
  if (isNilaiNativeDownloadAvailable()) {
    Swal.fire({
      title: "Menyimpan file...",
      html: `Menyiapkan <strong>${escapeNilaiHtml(fileName)}</strong>.`,
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });
    const base64 = XLSX.write(workbook, { bookType: "xlsx", type: "base64" });
    await window.Capacitor.Plugins.Filesystem.writeFile({
      path: fileName,
      data: base64,
      directory: "DOCUMENTS",
      recursive: true
    });
    await notifyNilaiDownloadFinished(fileName, { native: true });
    return;
  }
  XLSX.writeFile(workbook, fileName);
  await notifyNilaiDownloadFinished(fileName, { native: false });
}

async function saveNilaiExcelBlobFile(blob, fileName) {
  if (isNilaiNativeDownloadAvailable()) {
    Swal.fire({
      title: "Menyimpan file...",
      html: `Menyiapkan <strong>${escapeNilaiHtml(fileName)}</strong>.`,
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });
    const base64 = arrayBufferToNilaiBase64(await blob.arrayBuffer());
    await window.Capacitor.Plugins.Filesystem.writeFile({
      path: fileName,
      data: base64,
      directory: "DOCUMENTS",
      recursive: true
    });
    await notifyNilaiDownloadFinished(fileName, { native: true });
    return;
  }
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
  await notifyNilaiDownloadFinished(fileName, { native: false });
}

function applyNilaiRaporExportStyles(worksheet, rowCount = 0, headers = ["NO", "NIPD", "NAMA", "KELAS", "NILAI_RAPOR"]) {
  if (!window.XLSX?.utils || !worksheet?.["!ref"]) return;
  const range = XLSX.utils.decode_range(worksheet["!ref"]);
  const headerStyle = {
    font: { bold: true, color: { rgb: "881337" } },
    fill: { fgColor: { rgb: "FFE4E6" } },
    alignment: { horizontal: "center", vertical: "center" },
    border: {
      top: { style: "thin", color: { rgb: "FDA4AF" } },
      bottom: { style: "thin", color: { rgb: "FDA4AF" } },
      left: { style: "thin", color: { rgb: "FDA4AF" } },
      right: { style: "thin", color: { rgb: "FDA4AF" } }
    }
  };
  const defaultBorder = {
    top: { style: "thin", color: { rgb: "E5E7EB" } },
    bottom: { style: "thin", color: { rgb: "E5E7EB" } },
    left: { style: "thin", color: { rgb: "E5E7EB" } },
    right: { style: "thin", color: { rgb: "E5E7EB" } }
  };
  for (let col = range.s.c; col <= range.e.c; col += 1) {
    const address = XLSX.utils.encode_cell({ r: 0, c: col });
    if (worksheet[address]) worksheet[address].s = headerStyle;
  }
  for (let row = 1; row <= rowCount; row += 1) {
    for (let col = range.s.c; col <= range.e.c; col += 1) {
      const address = XLSX.utils.encode_cell({ r: row, c: col });
      if (!worksheet[address]) worksheet[address] = { t: "s", v: "" };
      worksheet[address].s = {
        alignment: { horizontal: col === 2 ? "left" : "center", vertical: "center" },
        border: defaultBorder
      };
    }
  }
  const widthMap = {
    NO: { wch: 6 },
    NIPD: { wch: 14 },
    NAMA: { wch: 30 },
    KELAS: { wch: 10 },
    UH1: { wch: 9 },
    UH2: { wch: 9 },
    UH3: { wch: 9 },
    UH4: { wch: 9 },
    UH5: { wch: 9 },
    PTS: { wch: 9 },
    SEMESTER: { wch: 12 },
    NILAI_RAPOR: { wch: 14 }
  };
  worksheet["!cols"] = headers.map(header => widthMap[header] || { wch: 12 });
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

  const headers = ["NO", "NIPD", "NAMA"]
    .concat(getNilaiInputFieldConfigs().map(getNilaiFieldExportHeader));
  if (window.ExcelJS) {
    await downloadNilaiTemplateExcelJs(rows, assignment);
    return;
  }

  const worksheet = XLSX.utils.json_to_sheet(rows, { header: headers });
  applyNilaiTemplateStyles(worksheet, rows.length);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Template Nilai");
  await saveNilaiWorkbookFile(workbook, `template-nilai-${assignment.tingkat}${assignment.rombel}-${assignment.mapel_kode}.xlsx`);
}

async function openNilaiDownloadMenu() {
  const modeRules = getNilaiModeRules();
  const inputOptions = {
    template: "Template Input Nilai"
  };
  if (modeRules.canDownloadRapor) {
    inputOptions.rapor = "Nilai Rapor";
  }

  const result = await Swal.fire({
    title: "Download",
    text: modeRules.canDownloadRapor
      ? "Pilih jenis file yang ingin diunduh."
      : "Mode PTS hanya menyediakan template input nilai.",
    input: "select",
    inputOptions,
    inputValue: "template",
    showCancelButton: true,
    confirmButtonText: "Lanjut",
    cancelButtonText: "Batal",
    inputValidator: value => value ? undefined : "Pilih jenis download terlebih dahulu."
  });
  if (!result.isConfirmed || !result.value) return;
  if (result.value === "rapor") {
    await promptDownloadNilaiRapor();
    return;
  }
  await downloadNilaiTemplate();
}

async function promptDownloadNilaiRapor() {
  if (!getNilaiModeRules().canDownloadRapor) return;
  const assignment = getSelectedNilaiAssignment();
  if (!assignment.mapel_kode) {
    Swal.fire("Pilih kelas dan mapel", "Download nilai rapor dibuat dari kelas dan mapel yang sedang dipilih.", "warning");
    return;
  }
  const options = getNilaiRaporDownloadClassOptions(assignment);
  if (!options.length) {
    Swal.fire("Tidak ada kelas", "Belum ada kelas asli aktif yang bisa dipakai untuk download nilai rapor.", "warning");
    return;
  }
  const inputOptions = Object.fromEntries(options.map(option => [option.value, option.label]));
  const result = await Swal.fire({
    title: "Download Nilai Rapor",
    text: "Pilih kelas yang ingin diunduh.",
    input: "select",
    inputOptions,
    inputPlaceholder: "Pilih kelas",
    showCancelButton: true,
    confirmButtonText: "Download",
    cancelButtonText: "Batal",
    inputValidator: value => value ? undefined : "Pilih kelas terlebih dahulu."
  });
  if (!result.isConfirmed || !result.value) return;
  const selectedOption = options.find(option => option.value === result.value);
  if (!selectedOption) return;
  await downloadNilaiRapor(selectedOption, assignment);
}

async function downloadNilaiRapor(selectedOption, assignmentOverride = null) {
  await ensureSpreadsheetLibraries({ needsExcelJs: false });
  const assignment = assignmentOverride || getSelectedNilaiAssignment();
  if (!assignment?.mapel_kode) {
    Swal.fire("Pilih kelas dan mapel", "Download nilai rapor dibuat dari kelas dan mapel yang sedang dipilih.", "warning");
    return;
  }
  await hydrateNilaiCacheForRaporExport(assignment, selectedOption);
  const rows = getNilaiRaporRowsForExport(assignment, selectedOption);
  if (!rows.length) {
    Swal.fire("Tidak ada data", "Belum ada siswa pada kelas yang dipilih untuk diunduh.", "warning");
    return;
  }
  const emptyRows = getNilaiRaporEmptyRows(rows);
  if (emptyRows.length) {
    const result = await Swal.fire({
      title: "Nilai rapor belum lengkap",
      html: `
        <p>Ada <strong>${emptyRows.length}</strong> dari <strong>${rows.length}</strong> siswa yang nilai rapornya masih kosong.</p>
        <p>File tetap bisa diunduh, tetapi baris siswa tersebut akan kosong pada kolom <strong>NILAI_RAPOR</strong>.</p>
      `,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Tetap download",
      cancelButtonText: "Batal"
    });
    if (!result.isConfirmed) return;
  }
  const headers = ["NO", "NIPD", "NAMA", "KELAS", "NILAI_RAPOR"];
  const worksheet = XLSX.utils.json_to_sheet(rows, { header: headers });
  applyNilaiRaporExportStyles(worksheet, rows.length, headers);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Nilai Rapor");
  const kelasSlug = makeNilaiDownloadSlug(selectedOption.classKey);
  const mapelSlug = makeNilaiDownloadSlug(assignment.mapel_kode);
  await saveNilaiWorkbookFile(workbook, `${kelasSlug}-${mapelSlug}.xlsx`);
}

async function downloadNilaiTemplateExcelJs(rows, assignment) {
  await ensureSpreadsheetLibraries({ needsExcelJs: true });
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Template Nilai");
  const baseColumns = [
    { header: "NO", key: "NO", width: 6 },
    { header: "NIPD", key: "NIPD", width: 14 },
    { header: "NAMA", key: "NAMA", width: 32 }
  ];
  const modeRules = getNilaiModeRules();
  worksheet.columns = [
    ...baseColumns,
    ...getNilaiInputFieldConfigs().map(field => ({
      header: getNilaiFieldExportHeader(field),
      key: getNilaiFieldExportHeader(field),
      width: field.key === "rapor" ? 14 : field.key === "semester" ? 12 : 10
    }))
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
      const fieldHeader = String(worksheet.getRow(1).getCell(colNumber).value || "").toUpperCase();
      const isUhColumn = /^UH[1-5]$/.test(fieldHeader);
      const isPtsColumn = fieldHeader === "PTS";
      const isSemesterColumn = fieldHeader === "SEMESTER";
      const isRaporColumn = fieldHeader === "NILAI_RAPOR";
      const isLockedColumn = colNumber < 4
        || isRaporColumn
        || (modeRules.isSemester && isPtsColumn)
        || (modeRules.isSemester && isUhColumn && rowNumber > 1 && isFilledNilaiValue(cell.value));
      cell.protection = { locked: isLockedColumn };
      if (rowNumber === 1) {
        cell.font = { bold: true, color: { argb: "FF0F172A" } };
        cell.alignment = { vertical: "middle", horizontal: "center" };
      }
      if (isUhColumn) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowNumber === 1 ? "FFBFDBFE" : "FFDBEAFE" } };
      } else if (isPtsColumn) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowNumber === 1 ? "FFBBF7D0" : "FFDCFCE7" } };
      } else if (isSemesterColumn) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowNumber === 1 ? "FFFDE68A" : "FFFEF3C7" } };
      } else if (isRaporColumn) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowNumber === 1 ? "FFFBBF24" : "FFFDE68A" } };
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
  await saveNilaiExcelBlobFile(blob, `template-nilai-${assignment.tingkat}${assignment.rombel}-${assignment.mapel_kode}.xlsx`);
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

function getNilaiReadonlyFieldSet() {
  return new Set([...getNilaiModeRules().fixedReadOnlyKeys]);
}

function getNilaiPreviewFieldConfigs() {
  return getNilaiInputFieldConfigs().map(field => ({
    key: field.key,
    label: field.label,
    valueKey: field.key
  }));
}

function getNilaiNormalizedValuesForMode(rawValues = {}, fallbackValues = {}, options = {}) {
  const readonlyFields = getNilaiReadonlyFieldSet();
  const modeRules = getNilaiModeRules();
  const preserveBlankAsFallback = options.preserveBlankAsFallback === true;
  const resolved = {};
  NILAI_ALL_FIELD_CONFIGS.forEach(field => {
    const rawValue = rawValues[field.key];
    const fallbackValue = fallbackValues[field.key];
    resolved[field.key] = readonlyFields.has(field.key)
      ? fallbackValue
      : (preserveBlankAsFallback && !hasNilaiImportValue(rawValue))
        ? fallbackValue
      : hasNilaiImportValue(rawValue)
        ? rawValue
        : "";
  });
  ["uh1", "uh2", "uh3", "uh4", "uh5", "pts", "semester", "rapor"].forEach(fieldKey => {
    if (resolved[fieldKey] === undefined) {
      resolved[fieldKey] = fallbackValues[fieldKey] ?? "";
    }
  });
  if (modeRules.isSemester) {
    resolved.rapor = calculateNilaiRapor(resolved);
  }
  return resolved;
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
        const uh4Raw = getCellValue(row, ["UH_4", "UH 4", "UH4", "NILAI_UH_4"]);
        const uh5Raw = getCellValue(row, ["UH_5", "UH 5", "UH5", "NILAI_UH_5"]);
        const ptsRaw = getCellValue(row, ["PTS", "NILAI_PTS"]);
        const semesterRaw = getCellValue(row, ["SEMESTER", "SMSTR", "NILAI_SEMESTER"]);
        const uh1 = normalizeNilaiImportNumber(uh1Raw);
        const uh2 = normalizeNilaiImportNumber(uh2Raw);
        const uh3 = normalizeNilaiImportNumber(uh3Raw);
        const uh4 = normalizeNilaiImportNumber(uh4Raw);
        const uh5 = normalizeNilaiImportNumber(uh5Raw);
        const pts = normalizeNilaiImportNumber(ptsRaw);
        const semester = normalizeNilaiImportNumber(semesterRaw);
        const siswa = students.find(item => String(item.nipd || "") === nipd);
        const existing = siswa ? getNilaiForStudent(assignment, siswa.nipd) : null;
        const existingValues = getNilaiUiValues(existing);
        const normalizedImportValues = {
          uh1: hasNilaiImportValue(uh1Raw) ? uh1 : "",
          uh2: hasNilaiImportValue(uh2Raw) ? uh2 : "",
          uh3: hasNilaiImportValue(uh3Raw) ? uh3 : "",
          uh4: hasNilaiImportValue(uh4Raw) ? uh4 : "",
          uh5: hasNilaiImportValue(uh5Raw) ? uh5 : "",
          pts: hasNilaiImportValue(ptsRaw) ? pts : "",
          semester: hasNilaiImportValue(semesterRaw) ? semester : ""
        };
        const resolvedValues = getNilaiNormalizedValuesForMode(normalizedImportValues, existingValues, { preserveBlankAsFallback: true });
        const modeRules = getNilaiModeRules();
        const importRawValueMap = {
          uh1: uh1Raw,
          uh2: uh2Raw,
          uh3: uh3Raw,
          uh4: uh4Raw,
          uh5: uh5Raw,
          pts: ptsRaw,
          semester: semesterRaw
        };
        const importNumberMap = {
          uh1,
          uh2,
          uh3,
          uh4,
          uh5,
          pts,
          semester
        };
        const importFieldKeys = modeRules.visibleFieldKeys.filter(key => key !== "rapor" && !modeRules.fixedReadOnlyKeys.has(key));
        const importRawValues = importFieldKeys.map(key => importRawValueMap[key]);
        const importNumbers = importFieldKeys.map(key => importNumberMap[key]);

        let status = "update";
        let message = "";
        if (!nipd || !siswa) {
          status = "error";
          message = "Siswa tidak ditemukan pada kelas ini";
        } else if (mapelKode && mapelKode !== String(assignment.mapel_kode || "").toUpperCase()) {
          status = "error";
          message = "Kode mapel tidak sesuai";
        } else if (importRawValues.every(value => value === "" || value === null || value === undefined)) {
          status = "error";
          message = modeRules.isSemester ? "Kolom input semester kosong" : "Semua kolom nilai kosong";
        } else if (importNumbers.some(value => Number.isNaN(value))) {
          status = "error";
          message = "Nilai harus berupa angka antara 0 sampai 100";
        } else if (hasNilaiImportValue(uh2Raw) && !hasNilaiImportValue(resolvedValues.uh1)) {
          status = "error";
          message = "UH 1 wajib diisi sebelum mengisi UH 2";
        } else if (hasNilaiImportValue(uh3Raw) && !hasNilaiImportValue(resolvedValues.uh1)) {
          status = "error";
          message = "UH 1 wajib diisi sebelum mengisi UH 3";
        } else if (hasNilaiImportValue(uh3Raw) && !hasNilaiImportValue(resolvedValues.uh2)) {
          status = "error";
          message = "UH 2 wajib diisi sebelum mengisi UH 3";
        } else if (hasNilaiImportValue(uh4Raw) && !hasNilaiImportValue(resolvedValues.uh3)) {
          status = "error";
          message = "UH 3 wajib diisi sebelum mengisi UH 4";
        } else if (hasNilaiImportValue(uh5Raw) && !hasNilaiImportValue(resolvedValues.uh4)) {
          status = "error";
          message = "UH 4 wajib diisi sebelum mengisi UH 5";
        } else if (
          String(existingValues.uh1) === String(resolvedValues.uh1) &&
          String(existingValues.uh2) === String(resolvedValues.uh2) &&
          String(existingValues.uh3) === String(resolvedValues.uh3) &&
          String(existingValues.uh4) === String(resolvedValues.uh4) &&
          String(existingValues.uh5) === String(resolvedValues.uh5) &&
          String(existingValues.pts) === String(resolvedValues.pts) &&
          String(existingValues.semester) === String(resolvedValues.semester) &&
          String(existingValues.rapor) === String(resolvedValues.rapor)
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
          uh1: resolvedValues.uh1,
          uh2: resolvedValues.uh2,
          uh3: resolvedValues.uh3,
          uh4: resolvedValues.uh4,
          uh5: resolvedValues.uh5,
          pts: resolvedValues.pts,
          semester: resolvedValues.semester,
          rapor: resolvedValues.rapor,
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
  const previewFields = getNilaiPreviewFieldConfigs();

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
        ${previewFields.map(field => `<td>${escapeNilaiHtml(item[field.valueKey] === "" ? "-" : item[field.valueKey])}</td>`).join("")}
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
            ${previewFields.map(field => `<th>${escapeNilaiHtml(field.label)}</th>`).join("")}
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

function renderNilaiOfflineDraftInfo(assignment) {
  const panel = document.getElementById("nilaiOfflineDraftInfo");
  if (!panel) return;
  const user = getCurrentNilaiUser();
  const allDrafts = canUseNilaiOfflineDraft() && window.GuruOffline?.listNilaiDrafts
    ? window.GuruOffline.listNilaiDrafts(user)
    : [];
  if (!allDrafts.length) {
    panel.hidden = true;
    panel.innerHTML = "";
    return;
  }
  const activeKey = assignment?.mapel_kode ? makeNilaiOfflineAssignmentKey(assignment) : "";
  const totalRows = allDrafts.reduce((total, item) => total + Number(item.rows || 0), 0);
  const listItems = allDrafts.slice(0, 6).map(item => {
    const draftAssignment = item.draft?.assignment?.mapel_kode
      ? item.draft.assignment
      : parseNilaiOfflineAssignmentKey(item.assignmentKey);
    const mapel = getNilaiMapel(draftAssignment.mapel_kode);
    const savedAt = item.savedAt ? new Date(item.savedAt).toLocaleString("id-ID") : "waktu tidak diketahui";
    const isActive = item.assignmentKey === activeKey;
    const label = `${draftAssignment.tingkat || "-"} ${String(draftAssignment.rombel || "").toUpperCase()} - ${mapel?.nama_mapel || draftAssignment.mapel_kode || "-"}`;
    return `
      <li class="${isActive ? "is-active" : ""}">
        <strong>${escapeNilaiHtml(label)}</strong>
        <span>${Number(item.rows || 0)} baris | ${escapeNilaiHtml(savedAt)}${isActive ? " | sedang dibuka" : ""}</span>
      </li>
    `;
  }).join("");
  const moreCount = Math.max(0, allDrafts.length - 6);
  panel.hidden = false;
  panel.innerHTML = `
    <div class="nilai-draft-summary-head">
      <div>
        <strong>${allDrafts.length} draft tertunda</strong>
        <span>${totalRows} baris nilai menunggu sinkron. Baris kuning memakai draft lokal.</span>
      </div>
      <button type="button" class="btn-secondary" onclick="syncAllNilaiOfflineDrafts()">Sinkron sekarang</button>
    </div>
    <ul class="nilai-draft-summary-list">
      ${listItems}
      ${moreCount ? `<li><strong>+${moreCount} draft lain</strong><span>Buka kelas-mapel terkait atau gunakan Sinkron sekarang.</span></li>` : ""}
    </ul>
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
        uh_1: item.uh1 === "" ? "" : Number(item.uh1),
        uh_2: item.uh2 === "" ? "" : Number(item.uh2),
        uh_3: item.uh3 === "" ? "" : Number(item.uh3),
        uh_4: item.uh4 === "" ? "" : Number(item.uh4),
        uh_5: item.uh5 === "" ? "" : Number(item.uh5),
        pts: item.pts === "" ? "" : Number(item.pts),
        semester: item.semester === "" ? "" : Number(item.semester),
        rapor: item.rapor === "" ? "" : Number(item.rapor),
        pts_locked_upto: getNilaiModeRules().isSemester
          ? getNilaiPtsLockedUpto(item.existing || {}, item)
          : getNilaiPtsLockedUptoFromValues(item, 3),
        updated_by: user.username || "",
        updated_at: new Date().toISOString()
      }
    }));
    const snapshotIds = await createNilaiSnapshot(rows, assignment, "nilai_import");
    await upsertNilaiRows(rows, assignment);
    mergeSavedNilaiRowsIntoCache(rows, assignment);
    syncCurrentNilaiAssignmentRows(assignment);
    closeNilaiPreviewModal();
    batalImportNilai(false);
    renderNilaiTableState();
    recordNilaiAudit("nilai_import", {
      title: "Import Nilai",
      ringkasan: `${siapUpload.length} baris nilai diimport untuk ${assignment.tingkat}${assignment.rombel} ${assignment.mapel_kode}.`,
      rows: siapUpload.length,
      assignment,
      snapshot_ids: snapshotIds
    });
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

function buildNilaiRowsFromCurrentInputs(assignment, user = getCurrentNilaiUser()) {
  const students = getNilaiStudentsForAssignment(assignment);
  return students.map((siswa, index) => {
    const existing = getNilaiForStudent(assignment, siswa.nipd);
    const existingValues = getNilaiUiValues(existing);
    const existingPtsLockedUpto = getNilaiPtsLockedUpto(existing, existingValues);
    const currentValues = {
      uh1: getNormalizedNilaiCellValueByRow(index, "uh1"),
      uh2: getNormalizedNilaiCellValueByRow(index, "uh2"),
      uh3: getNormalizedNilaiCellValueByRow(index, "uh3"),
      uh4: getNormalizedNilaiCellValueByRowOptional(index, "uh4"),
      uh5: getNormalizedNilaiCellValueByRowOptional(index, "uh5"),
      pts: getNormalizedNilaiCellValueByRow(index, "pts"),
      semester: getNormalizedNilaiCellValueByRowOptional(index, "semester"),
      rapor: getNormalizedNilaiCellValueByRowOptional(index, "rapor")
    };
    const resolvedValues = getNilaiNormalizedValuesForMode(currentValues, existingValues, { preserveBlankAsFallback: false });
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
        uh_1: toNilaiPayloadNumber(resolvedValues.uh1),
        uh_2: toNilaiPayloadNumber(resolvedValues.uh2),
        uh_3: toNilaiPayloadNumber(resolvedValues.uh3),
        uh_4: toNilaiPayloadNumber(resolvedValues.uh4),
        uh_5: toNilaiPayloadNumber(resolvedValues.uh5),
        pts: toNilaiPayloadNumber(resolvedValues.pts),
        semester: toNilaiPayloadNumber(resolvedValues.semester),
        rapor: resolvedValues.rapor === "" ? "" : Number(normalizeNilaiOutputNumber(resolvedValues.rapor)),
        pts_locked_upto: getNilaiModeRules().isSemester
          ? existingPtsLockedUpto
          : getNilaiPtsLockedUptoFromValues(resolvedValues, 3),
        updated_by: user.username || "",
        updated_at: new Date().toISOString()
      }
    };
  });
}

function getNilaiPayloadComparableValue(value) {
  if (value === undefined || value === null) return "";
  return String(value);
}

function isNilaiRowChanged(row, assignment) {
  const existing = getNilaiForStudent(assignment, row?.siswa?.nipd || row?.payload?.nipd || "");
  const payload = cleanNilaiPayloadValue(row?.payload || {});
  const fields = ["uh_1", "uh_2", "uh_3", "uh_4", "uh_5", "pts", "semester", "rapor", "pts_locked_upto"];
  if (!existing) {
    return fields
      .filter(field => field !== "pts_locked_upto")
      .some(field => getNilaiPayloadComparableValue(payload[field]) !== "");
  }
  return fields.some(field =>
    getNilaiPayloadComparableValue(payload[field]) !== getNilaiPayloadComparableValue(existing[field])
  );
}

function validateNilaiRows(rows) {
  const invalidRow = rows.find(row =>
    ["uh_1", "uh_2", "uh_3", "uh_4", "uh_5", "pts", "semester", "rapor"].some(field => Number.isNaN(row.payload[field]))
  );
  if (invalidRow) {
    throw new Error(`Nilai tidak valid untuk ${invalidRow.siswa?.nama || invalidRow.siswa?.nipd || "siswa"}`);
  }
}

function makeNilaiSnapshotId(action = "nilai") {
  return `${Date.now()}_${String(action || "nilai").replace(/[^a-z0-9_-]+/gi, "_")}_${Math.random().toString(36).slice(2, 8)}`;
}

async function createNilaiSnapshot(rows = [], assignment = {}, action = "nilai_save") {
  if (!rows.length || !window.SupabaseDocuments?.collection) return [];
  const snapshotIds = [];
  for (let index = 0; index < rows.length; index += 80) {
    const chunk = rows.slice(index, index + 80);
    const snapshotId = makeNilaiSnapshotId(action);
    const payload = {
      action,
      assignment: { ...assignment },
      created_at: new Date().toISOString(),
      created_by: getCurrentNilaiUser()?.username || "",
      rows: chunk.map(row => {
        const nipd = row?.siswa?.nipd || row?.payload?.nipd || "";
        const docId = makeNilaiDocId(assignment, nipd);
        const before = getNilaiForStudent(assignment, nipd);
        return {
          doc_id: docId,
          nipd,
          nama_siswa: row?.payload?.nama_siswa || before?.nama_siswa || "",
          before: before ? cleanNilaiPayloadValue(before) : null,
          after: cleanNilaiPayloadValue(row?.payload || {})
        };
      })
    };
    await window.SupabaseDocuments.collection("nilai_snapshots").doc(snapshotId).set(payload);
    snapshotIds.push(snapshotId);
  }
  return snapshotIds;
}

function recordNilaiAudit(action, detail = {}) {
  window.AuditLog?.record?.(action, {
    module: "Nilai",
    ...detail
  }, {
    module: "Nilai",
    title: detail.title || action
  });
}

function assertGuruCanSaveNilaiAssignment(user, assignment) {
  const hasCoordinatorAccess = typeof canUseCoordinatorAccess === "function" && canUseCoordinatorAccess();
  if (user.role === "guru" && !(hasCoordinatorAccess && currentNilaiAccessMode === "koordinator") && String(assignment.guru_kode || "") !== String(user.kode_guru || "")) {
    Swal.fire("Akses ditolak", "Guru hanya dapat menginput nilai siswa yang diajar.", "warning");
    return false;
  }
  return true;
}

async function saveNilaiAssignmentOfflineDraft(options = {}) {
  const select = document.getElementById("nilaiAssignmentSelect");
  const assignment = parseNilaiAssignmentId(select?.value || "");
  const automatic = options?.automatic === true;
  const silent = options?.silent === true;
  if (!assignment.mapel_kode) {
    Swal.fire("Pilih kelas dan mapel", "", "warning");
    return { saved: false, reason: "missing-assignment" };
  }
  if (!canUseNilaiOfflineDraft() || !window.GuruOffline?.saveNilaiDraft) {
    Swal.fire("Tidak tersedia", "Draft offline hanya tersedia untuk role guru.", "warning");
    return { saved: false, reason: "unavailable" };
  }

  const user = getCurrentNilaiUser();
  if (!assertGuruCanSaveNilaiAssignment(user, assignment)) return { saved: false, reason: "access-denied" };

  try {
    const allRows = buildNilaiRowsFromCurrentInputs(assignment, user);
    validateNilaiRows(allRows);
    const rows = allRows.filter(row => isNilaiRowChanged(row, assignment));
    if (!rows.length) {
      return { saved: false, reason: "no-change" };
    }
    const assignmentKey = makeNilaiOfflineAssignmentKey(assignment);
    window.GuruOffline.saveNilaiDraft(assignmentKey, {
      assignment,
      inputMode: currentNilaiInputMode,
      rows
    }, user);
    if (!options?.skipRender) renderNilaiTableState();
    else {
      renderNilaiOfflineDraftInfo(assignment);
      window.GuruOffline?.renderStatus?.();
    }
    return { saved: true, rows, assignment, user, assignmentKey };
  } catch (error) {
    console.error(error);
    Swal.fire("Gagal menyimpan draft", error?.message || "Draft offline belum berhasil disimpan.", "error");
    return { saved: false, reason: "error", error };
  }
}

async function syncNilaiAssignmentOfflineDraft() {
  const select = document.getElementById("nilaiAssignmentSelect");
  const assignment = parseNilaiAssignmentId(select?.value || "");
  if (!assignment.mapel_kode) {
    Swal.fire("Pilih kelas dan mapel", "", "warning");
    return;
  }
  if (!window.GuruOffline?.isOnline?.()) {
    Swal.fire("Masih offline", "Hubungkan internet dulu, lalu coba sinkronkan kembali.", "warning");
    return;
  }

  const user = getCurrentNilaiUser();
  if (!assertGuruCanSaveNilaiAssignment(user, assignment)) return;

  const draft = getNilaiOfflineDraft(assignment);
  if (!draft?.rows?.length) return;

  try {
    setNilaiSavingState(true, "Menyinkronkan draft...");
    validateNilaiRows(draft.rows);
    const snapshotIds = await createNilaiSnapshot(draft.rows, assignment, "nilai_sync_draft");
    await upsertNilaiRows(draft.rows, assignment);
    mergeSavedNilaiRowsIntoCache(draft.rows, assignment);
    syncCurrentNilaiAssignmentRows(assignment);
    window.GuruOffline.clearNilaiDraft(makeNilaiOfflineAssignmentKey(assignment), user);
    setNilaiSavingState(false);
    renderNilaiTableState();
    window.GuruOffline.renderStatus?.();
    recordNilaiAudit("nilai_sync_draft", {
      title: "Sinkron Draft Nilai",
      ringkasan: `${draft.rows.length} baris draft nilai disinkronkan untuk ${assignment.tingkat}${assignment.rombel} ${assignment.mapel_kode}.`,
      rows: draft.rows.length,
      assignment,
      snapshot_ids: snapshotIds
    });
    showNilaiOperationNotification("Sinkron selesai", `${draft.rows.length} baris nilai draft sudah dikirim ke Supabase.`, "success");
  } catch (error) {
    console.error(error);
    setNilaiSavingState(false);
    Swal.fire("Gagal sinkron", error?.message || "Draft belum berhasil disinkronkan.", "error");
  }
}

let nilaiAutoSyncInProgress = false;

async function syncAllNilaiOfflineDrafts(options = {}) {
  const automatic = options?.automatic === true;
  if (!window.GuruOffline?.isOnline?.()) {
    if (!automatic) {
      Swal.fire("Masih offline", "Hubungkan internet dulu, lalu coba sinkronkan kembali.", "warning");
    }
    return { synced: 0, failed: 0, skipped: true };
  }
  if (!window.GuruOffline?.listNilaiDrafts) {
    if (!automatic) {
      Swal.fire("Belum siap", "Daftar draft offline belum bisa dibaca.", "warning");
    }
    return { synced: 0, failed: 0, skipped: true };
  }
  const user = getCurrentNilaiUser();
  const drafts = window.GuruOffline.listNilaiDrafts(user);
  if (!drafts.length) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;
  try {
    if (!automatic) {
      setNilaiSavingState(true, "Menyinkronkan semua draft...");
    }
    for (const item of drafts) {
      const draft = item.draft;
      const draftAssignment = draft?.assignment?.mapel_kode
        ? draft.assignment
        : parseNilaiOfflineAssignmentKey(item.assignmentKey);
      if (!draftAssignment?.mapel_kode || !Array.isArray(draft?.rows) || !draft.rows.length) {
        window.GuruOffline?.clearNilaiDraft?.(item.assignmentKey, user);
        continue;
      }
      try {
        validateNilaiRows(draft.rows);
        const snapshotIds = await createNilaiSnapshot(draft.rows, draftAssignment, "nilai_sync_all_drafts");
        await upsertNilaiRows(draft.rows, draftAssignment);
        mergeSavedNilaiRowsIntoCache(draft.rows, draftAssignment);
        if (snapshotIds.length) {
          recordNilaiAudit("nilai_sync_draft", {
            title: "Sinkron Semua Draft Nilai",
            ringkasan: `${draft.rows.length} baris draft nilai disinkronkan untuk ${draftAssignment.tingkat}${draftAssignment.rombel} ${draftAssignment.mapel_kode}.`,
            rows: draft.rows.length,
            assignment: draftAssignment,
            snapshot_ids: snapshotIds
          });
        }
        window.GuruOffline.clearNilaiDraft(item.assignmentKey, user);
        synced += draft.rows.length;
      } catch (error) {
        console.error("sync draft failed", item.assignmentKey, error);
        failed += 1;
      }
    }
    syncCurrentNilaiAssignmentRows(getSelectedNilaiAssignment());
    if (!automatic) {
      setNilaiSavingState(false);
    }
    renderNilaiTableState();
    window.GuruOffline.renderStatus?.();
    if (!synced) return { synced, failed };
    if (!automatic) {
      showNilaiOperationNotification(
        failed ? "Sinkron sebagian selesai" : "Sinkron selesai",
        failed ? `${synced} baris terkirim, ${failed} draft belum berhasil.` : `${synced} baris draft sudah dikirim ke Supabase.`,
        failed ? "warning" : "success"
      );
    } else if (failed) {
      showNilaiOperationNotification("Sinkron draft sebagian gagal", `${synced} baris terkirim, ${failed} draft belum berhasil.`, "warning");
    }
    return { synced, failed };
  } catch (error) {
    console.error(error);
    if (!automatic) {
      setNilaiSavingState(false);
      Swal.fire("Gagal sinkron", error?.message || "Draft belum berhasil disinkronkan.", "error");
    }
    return { synced, failed: failed + 1, error };
  }
}

async function autoSyncNilaiOfflineDrafts() {
  if (nilaiAutoSyncInProgress || !canSaveNilaiAsOfflineDraft() || !window.GuruOffline?.isOnline?.()) return;
  const drafts = window.GuruOffline?.listNilaiDrafts?.(getCurrentNilaiUser()) || [];
  if (!drafts.length) return;
  nilaiAutoSyncInProgress = true;
  try {
    await syncAllNilaiOfflineDrafts({ automatic: true });
  } finally {
    nilaiAutoSyncInProgress = false;
  }
}

function initNilaiAutoSync() {
  if (window.__nilaiAutoSyncInitialized) return;
  window.__nilaiAutoSyncInitialized = true;
  window.addEventListener?.("guru-spenturi-online", () => {
    setTimeout(() => autoSyncNilaiOfflineDrafts(), 500);
  });
  window.addEventListener?.("online", () => {
    setTimeout(() => autoSyncNilaiOfflineDrafts(), 800);
  });
  document.addEventListener?.("visibilitychange", () => {
    if (!document.hidden) setTimeout(() => autoSyncNilaiOfflineDrafts(), 800);
  });
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
  if (!assertGuruCanSaveNilaiAssignment(user, assignment)) return;

  if (canSaveNilaiAsOfflineDraft()) {
    const draftResult = await saveNilaiAssignmentOfflineDraft({ automatic: true, silent: true });
    if (!draftResult?.saved) {
      return;
    }

    if (shouldSaveNilaiAsOfflineDraft()) {
      showNilaiOperationNotification("Draft tersimpan", `${draftResult.rows.length} perubahan nilai disimpan di perangkat ini. Sinkronkan saat internet tersedia.`, "success");
      return;
    }

    try {
      setNilaiSavingState(true, "Mengirim draft ke server...");
      validateNilaiRows(draftResult.rows);
      const snapshotIds = await createNilaiSnapshot(draftResult.rows, assignment, "nilai_save");
      await upsertNilaiRows(draftResult.rows, assignment);
      mergeSavedNilaiRowsIntoCache(draftResult.rows, assignment);
      syncCurrentNilaiAssignmentRows(assignment);
      window.GuruOffline?.clearNilaiDraft?.(draftResult.assignmentKey, user);
      setNilaiSavingState(false);
      renderNilaiTableState();
      window.GuruOffline?.renderStatus?.();
      recordNilaiAudit("nilai_save", {
        title: "Simpan Nilai",
        ringkasan: `${draftResult.rows.length} baris nilai disimpan untuk ${assignment.tingkat}${assignment.rombel} ${assignment.mapel_kode}.`,
        rows: draftResult.rows.length,
        mode: getCurrentNilaiInputMode(),
        assignment,
        snapshot_ids: snapshotIds
      });
      showNilaiOperationNotification("Tersimpan", "Draft nilai sudah aman di perangkat dan berhasil dikirim ke server.", "success");
    } catch (error) {
      console.error(error);
      setNilaiSavingState(false);
      if (isNilaiNetworkSaveError(error)) {
        window.GuruOffline?.markOffline?.();
        renderNilaiInputModeUi();
        showNilaiOperationNotification("Draft tersimpan", "Koneksi terputus saat mengirim. Nilai sudah aman sebagai draft dan bisa disinkronkan nanti.", "warning");
        return;
      }
      renderNilaiTableState();
      showNilaiOperationNotification("Draft tersimpan, kirim gagal", error?.message || "Nilai sudah aman sebagai draft, tetapi belum berhasil dikirim ke server.", "warning");
    }
    return;
  }

  try {
    setNilaiSavingState(true);
    const allRows = buildNilaiRowsFromCurrentInputs(assignment, user);
    validateNilaiRows(allRows);
    const rows = allRows.filter(row => isNilaiRowChanged(row, assignment));
    if (!rows.length) {
      setNilaiSavingState(false);
      return;
    }

    const snapshotIds = await createNilaiSnapshot(rows, assignment, "nilai_save");
    await upsertNilaiRows(rows, assignment);
    mergeSavedNilaiRowsIntoCache(rows, assignment);
    syncCurrentNilaiAssignmentRows(assignment);
    if (canUseNilaiOfflineDraft()) {
      window.GuruOffline?.clearNilaiDraft?.(makeNilaiOfflineAssignmentKey(assignment), user);
    }
    setNilaiSavingState(false);
    renderNilaiTableState();
    recordNilaiAudit("nilai_save", {
      title: "Simpan Nilai",
      ringkasan: `${rows.length} baris nilai disimpan untuk ${assignment.tingkat}${assignment.rombel} ${assignment.mapel_kode}.`,
      rows: rows.length,
      mode: getCurrentNilaiInputMode(),
      assignment,
      snapshot_ids: snapshotIds
    });
    showNilaiOperationNotification("Tersimpan", "Nilai sudah disimpan.", "success");
  } catch (error) {
    console.error(error);
    setNilaiSavingState(false);
    if (canSaveNilaiAsOfflineDraft() && isNilaiNetworkSaveError(error)) {
      window.GuruOffline?.markOffline?.();
      renderNilaiInputModeUi();
      await saveNilaiAssignmentOfflineDraft({ automatic: true });
      return;
    }
    Swal.fire("Gagal menyimpan", error?.message || "Nilai belum berhasil disimpan.", "error");
  }
}

window.NilaiEngine = {
  getCurrentMode: getCurrentNilaiInputMode,
  setMode: setNilaiInputMode,
  getModeRules: getNilaiModeRules,
  getFieldConfigs: getNilaiInputFieldConfigs,
  getUiValues: getNilaiUiValues,
  calculateRapor: calculateNilaiRapor,
  getKelasParts: getNilaiKelasParts,
  getKelasBayanganParts: getNilaiKelasBayanganParts,
  isDocMatchingAssignment: isNilaiDocMatchingAssignment,
  getStudentsForAssignment: getNilaiStudentsForAssignment,
  getStudentsForOriginalClass: getNilaiStudentsForOriginalClass,
  getRaporRowsForExport: getNilaiRaporRowsForExport,
  hydrateRaporExport: hydrateNilaiCacheForRaporExport
};

window.renderNilaiTableState = renderNilaiTableState;
window.renderNilaiPageState = renderNilaiPageState;
window.openNilaiDownloadMenu = openNilaiDownloadMenu;
window.promptDownloadNilaiRapor = promptDownloadNilaiRapor;
window.refreshSelectedNilaiAssignment = refreshSelectedNilaiAssignment;
window.setNilaiQuickFilter = setNilaiQuickFilter;
window.handleNilaiModeSelectorChange = handleNilaiModeSelectorChange;
window.resolveNilaiInputModeForCurrentRole = resolveNilaiInputModeForCurrentRole;
window.storeNilaiUiMode = storeNilaiUiMode;
window.saveNilaiAssignmentOfflineDraft = saveNilaiAssignmentOfflineDraft;
window.syncNilaiAssignmentOfflineDraft = syncNilaiAssignmentOfflineDraft;
window.syncAllNilaiOfflineDrafts = syncAllNilaiOfflineDrafts;
window.autoSyncNilaiOfflineDrafts = autoSyncNilaiOfflineDrafts;
initNilaiAutoSync();
