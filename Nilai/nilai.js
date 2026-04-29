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
let nilaiRenderFrameId = 0;
let nilaiRekapRenderFrameId = 0;
let currentNilaiAssignmentId = "";
let currentNilaiAssignmentRows = [];
let nilaiMapelCacheVersion = 0;
let nilaiSiswaCacheVersion = 0;
let nilaiMengajarCacheVersion = 0;
let nilaiKelasCacheVersion = 0;
let nilaiRowsCacheVersion = 0;
const nilaiMapelByKodeCache = new Map();
const nilaiAccessibleAssignmentsCache = new Map();
const nilaiAssignmentsByClassCache = new Map();
const nilaiStudentsByAssignmentCache = new Map();
const nilaiRowsByAssignmentCache = new Map();
let nilaiRowsByIdCache = new Map();

function getNilaiDocumentsApi() {
  return window.SupabaseDocuments;
}

function invalidateNilaiMapelCaches() {
  nilaiMapelCacheVersion += 1;
  nilaiMapelByKodeCache.clear();
  nilaiAssignmentsByClassCache.clear();
  nilaiStudentsByAssignmentCache.clear();
}

function invalidateNilaiSiswaCaches() {
  nilaiSiswaCacheVersion += 1;
  nilaiAccessibleAssignmentsCache.clear();
  nilaiAssignmentsByClassCache.clear();
  nilaiStudentsByAssignmentCache.clear();
}

function invalidateNilaiMengajarCaches() {
  nilaiMengajarCacheVersion += 1;
  nilaiAccessibleAssignmentsCache.clear();
  nilaiAssignmentsByClassCache.clear();
}

function invalidateNilaiKelasCaches() {
  nilaiKelasCacheVersion += 1;
  nilaiAccessibleAssignmentsCache.clear();
  nilaiAssignmentsByClassCache.clear();
}

function invalidateNilaiRowsCaches() {
  nilaiRowsCacheVersion += 1;
  nilaiRowsByAssignmentCache.clear();
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
  if (!target) return null;
  const cacheKey = `${nilaiMapelCacheVersion}:${target}`;
  if (nilaiMapelByKodeCache.has(cacheKey)) return nilaiMapelByKodeCache.get(cacheKey);
  const value = semuaDataNilaiMapel.find(item =>
    String(item.kode_mapel || item.id || "").toUpperCase() === target
  ) || null;
  nilaiMapelByKodeCache.set(cacheKey, value);
  return value;
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
  const user = getCurrentNilaiUser();
  const role = user.role || "admin";
  const coordinatorLevels = typeof getCurrentCoordinatorLevelsSync === "function" ? getCurrentCoordinatorLevelsSync() : [];
  const hasCoordinatorAccess = typeof canUseCoordinatorAccess === "function" && canUseCoordinatorAccess();
  const coordinatorWaliClasses = getNilaiCoordinatorWaliClassSet();
  const ownWaliClasses = getNilaiOwnWaliClassSet();
  const cacheKey = [
    nilaiMengajarCacheVersion,
    nilaiKelasCacheVersion,
    nilaiSiswaCacheVersion,
    currentNilaiAccessMode,
    String(role || "").trim().toLowerCase(),
    String(user.kode_guru || "").trim(),
    hasCoordinatorAccess ? "1" : "0",
    coordinatorLevels.join(","),
    [...coordinatorWaliClasses].sort().join(","),
    [...ownWaliClasses].sort().join(",")
  ].join("|");
  if (nilaiAccessibleAssignmentsCache.has(cacheKey)) return nilaiAccessibleAssignmentsCache.get(cacheKey);
  const assignments = semuaDataNilaiMengajar
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
  nilaiAccessibleAssignmentsCache.set(cacheKey, assignments);
  return assignments;
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
  nilaiRowsByIdCache = new Map(semuaDataNilai.map(item => [item.id, item]));
  invalidateNilaiRowsCaches();
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
    && (!guruKode ? true : itemGuruKode === guruKode);
}

function getNilaiRowsFromCacheForAssignment(assignment) {
  if (!assignment?.mapel_kode) return [];
  const cacheKey = `${nilaiRowsCacheVersion}:${makeNilaiAssignmentHydrationKey(assignment)}`;
  if (nilaiRowsByAssignmentCache.has(cacheKey)) return nilaiRowsByAssignmentCache.get(cacheKey);
  const rows = semuaDataNilai.filter(item => isNilaiDocMatchingAssignment(item, assignment));
  nilaiRowsByAssignmentCache.set(cacheKey, rows);
  return rows;
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
  const legacyDocId = makeNilaiLegacyDocId(assignment, nipd);
  for (let index = currentNilaiAssignmentRows.length - 1; index >= 0; index -= 1) {
    if (currentNilaiAssignmentRows[index]?.id === docId) return currentNilaiAssignmentRows[index];
  }
  if (nilaiRowsByIdCache.has(docId)) return nilaiRowsByIdCache.get(docId);
  for (let index = currentNilaiAssignmentRows.length - 1; index >= 0; index -= 1) {
    if (currentNilaiAssignmentRows[index]?.id === legacyDocId && isNilaiDocMatchingAssignment(currentNilaiAssignmentRows[index], assignment)) {
      return currentNilaiAssignmentRows[index];
    }
  }
  if (nilaiRowsByIdCache.has(legacyDocId)) {
    const legacyItem = nilaiRowsByIdCache.get(legacyDocId);
    if (isNilaiDocMatchingAssignment(legacyItem, assignment)) return legacyItem;
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

function makeNilaiOfflineAssignmentKey(assignment) {
  return makeNilaiAssignmentHydrationKey(assignment);
}

function canUseNilaiOfflineDraft() {
  const user = getCurrentNilaiUser();
  return String(user.role || "").trim().toLowerCase() === "guru" && currentNilaiAccessMode === "guru";
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
  const cacheKey = `${nilaiSiswaCacheVersion}:${nilaiMapelCacheVersion}:${makeNilaiAssignmentHydrationKey(assignment)}`;
  if (nilaiStudentsByAssignmentCache.has(cacheKey)) return nilaiStudentsByAssignmentCache.get(cacheKey);
  const mapel = getNilaiMapel(assignment.mapel_kode);
  const students = semuaDataNilaiSiswa
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
  nilaiStudentsByAssignmentCache.set(cacheKey, students);
  return students;
}

function renderInputNilaiPage() {
  const user = getCurrentNilaiUser();
  const role = user.role || "admin";
  const modeRules = getNilaiModeRules();
  const showModeSelector = String(role || "").trim().toLowerCase() !== "guru";
  const showOfflineDraft = canUseNilaiOfflineDraft() && window.isGuruSpenturiNativeApp?.();
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
          <details class="nilai-download-menu nilai-action-group nilai-action-group-download" id="nilaiDownloadMenu">
            <summary class="btn-secondary nilai-action-btn nilai-action-download">Download</summary>
            <div class="nilai-download-menu-panel">
              <button type="button" class="btn-secondary" onclick="downloadNilaiTemplate()">Template</button>
              <button type="button" id="nilaiRaporDownloadBtn" class="btn-rapor-download" onclick="promptDownloadNilaiRapor()" ${modeRules.canDownloadRapor ? "" : "hidden"}>Nilai Rapor</button>
            </div>
          </details>
          <button type="button" class="btn-secondary nilai-action-btn nilai-action-import" onclick="triggerNilaiImport()">Import Nilai</button>
          ${showOfflineDraft ? `
          <details class="nilai-download-menu nilai-draft-menu nilai-action-group nilai-action-group-draft" id="nilaiDraftMenu">
            <summary class="btn-secondary nilai-action-btn nilai-action-draft">Draft</summary>
            <div class="nilai-download-menu-panel">
              <button type="button" class="btn-secondary" onclick="saveNilaiAssignmentOfflineDraft()">Simpan Draft</button>
              <button type="button" class="btn-secondary" onclick="syncNilaiAssignmentOfflineDraft()">Sinkronkan</button>
            </div>
          </details>` : ""}
          <button type="button" class="btn-primary nilai-action-btn nilai-action-save" onclick="saveNilaiAssignment()">Simpan Nilai</button>
          <input id="nilaiImportInput" type="file" accept=".xlsx,.xls" onchange="importNilaiExcel(event)" hidden>
        </div>
      </div>

      <div id="nilaiAssignmentInfo" class="nilai-assignment-info">Memuat data pembagian mengajar...</div>
      ${showOfflineDraft ? `<div id="nilaiOfflineDraftInfo" class="nilai-offline-note" hidden></div>` : ""}

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
  if (nilaiRenderFrameId) return;
  nilaiRenderFrameId = window.requestAnimationFrame(() => {
    nilaiRenderFrameId = 0;
    renderNilaiPageState();
  });
}

function scheduleRekapNilaiStateRender() {
  if (nilaiRekapRenderFrameId) return;
  nilaiRekapRenderFrameId = window.requestAnimationFrame(() => {
    nilaiRekapRenderFrameId = 0;
    renderRekapNilaiState();
  });
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
    invalidateNilaiSiswaCaches();
    scheduleNilaiPageStateRender();
  });
  unsubscribeNilaiMapel = documentsApi.collection("mapel_bayangan").orderBy("kode_mapel").onSnapshot(snapshot => {
    semuaDataNilaiMapel = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    invalidateNilaiMapelCaches();
    scheduleNilaiPageStateRender();
  });
  unsubscribeNilaiMengajar = documentsApi.collection("mengajar_bayangan").onSnapshot(snapshot => {
    semuaDataNilaiMengajar = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    invalidateNilaiMengajarCaches();
    scheduleNilaiPageStateRender();
  });
  unsubscribeNilaiKelas = typeof getSemesterCollectionQuery === "function"
    ? getSemesterCollectionQuery("kelas")
      .onSnapshot(snapshot => {
        semuaDataNilaiKelas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        invalidateNilaiKelasCaches();
        scheduleNilaiPageStateRender();
      })
    : documentsApi.collection("kelas").onSnapshot(snapshot => {
        semuaDataNilaiKelas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        invalidateNilaiKelasCaches();
        scheduleNilaiPageStateRender();
      });
  unsubscribeNilaiData = documentsApi.collection("nilai").onSnapshot(snapshot => {
    setSemuaDataNilai(snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(item => typeof isActiveTermDoc === "function" ? isActiveTermDoc(item) : true));
    scheduleNilaiPageStateRender();
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
    invalidateNilaiSiswaCaches();
    scheduleRekapNilaiStateRender();
  });
  unsubscribeNilaiMapel = documentsApi.collection("mapel_bayangan").orderBy("kode_mapel").onSnapshot(snapshot => {
    semuaDataNilaiMapel = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    invalidateNilaiMapelCaches();
    scheduleRekapNilaiStateRender();
  });
  unsubscribeNilaiMengajar = documentsApi.collection("mengajar_bayangan").onSnapshot(snapshot => {
    semuaDataNilaiMengajar = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    invalidateNilaiMengajarCaches();
    scheduleRekapNilaiStateRender();
  });
  unsubscribeNilaiKelas = typeof getSemesterCollectionQuery === "function"
    ? getSemesterCollectionQuery("kelas")
      .onSnapshot(snapshot => {
        semuaDataNilaiKelas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        invalidateNilaiKelasCaches();
        scheduleRekapNilaiStateRender();
      })
    : documentsApi.collection("kelas").onSnapshot(snapshot => {
        semuaDataNilaiKelas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        invalidateNilaiKelasCaches();
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
  const assignmentSelect = document.getElementById("nilaiAssignmentSelect");
  const isSelectingAssignment = document.activeElement === assignmentSelect;
  const isEditingTable = document.activeElement?.classList?.contains("nilai-input-cell");
  renderNilaiInputModeUi();
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
  const cacheKey = [
    nilaiMengajarCacheVersion,
    nilaiKelasCacheVersion,
    nilaiSiswaCacheVersion,
    nilaiMapelCacheVersion,
    currentNilaiAccessMode,
    targetClassKey,
    String(getCurrentNilaiUser()?.kode_guru || ""),
    String(getCurrentNilaiUser()?.role || ""),
    (typeof getCurrentCoordinatorLevelsSync === "function" ? getCurrentCoordinatorLevelsSync() : []).join(","),
    (typeof canUseCoordinatorAccess === "function" && canUseCoordinatorAccess()) ? "1" : "0"
  ].join("|");
  if (nilaiAssignmentsByClassCache.has(cacheKey)) return nilaiAssignmentsByClassCache.get(cacheKey);
  const assignments = getNilaiAccessibleAssignments()
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
  nilaiAssignmentsByClassCache.set(cacheKey, assignments);
  return assignments;
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
  const raporButton = document.getElementById("nilaiRaporDownloadBtn");
  if (title) title.textContent = getNilaiInputModeLabel();
  if (description) description.textContent = getNilaiRoleDescription(modeRules);
  if (selector) selector.value = modeRules.mode;
  if (raporButton) raporButton.hidden = !modeRules.canDownloadRapor;
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
  XLSX.writeFile(workbook, `rekap-nilai-${tingkat}${rombel}.xlsx`);
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

  container.innerHTML = `
    <table class="mapel-table nilai-table nilai-input-table">
      <colgroup>
        <col class="nilai-col-no">
        <col class="nilai-col-student">
        ${headerFieldConfigs.map(field => `<col class="nilai-col-field" data-field="${escapeNilaiHtml(field.key)}">`).join("")}
      </colgroup>
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
          return `
            <tr class="${draftDoc ? "nilai-draft-row" : ""}">
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
  applyNilaiTableColumnVisibility(container);
  setupNilaiTableInputs();
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
    id: item?.id || "",
    siswa: { nipd: item?.data?.nipd || String(item?.id || "").split("_").at(-1) || "" },
    payload: { ...(item?.data || {}) }
  }));
  currentNilaiAssignmentId = makeNilaiAssignmentId(assignment);
  currentNilaiAssignmentRows = rows.map(row => ({
    id: row.id || makeNilaiDocId(assignment, row.siswa.nipd),
    ...cleanNilaiPayloadValue(row.payload)
  }));
  return mergeSavedNilaiRowsIntoCache(rows, assignment);
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
    const shadowClass = siswa.kelasNilaiParts?.kelas || "";
    if (originalClass) {
      options.set(`asli|${originalClass}`, {
        value: `asli|${originalClass}`,
        label: `Kelas asli aktif: ${originalClass}`,
        source: "asli",
        classKey: originalClass
      });
    }
    if (shadowClass) {
      options.set(`bayangan|${shadowClass}`, {
        value: `bayangan|${shadowClass}`,
        label: `Kelas bayangan: ${shadowClass}`,
        source: "bayangan",
        classKey: shadowClass
      });
    }
  });
  return [...options.values()].sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true, sensitivity: "base" }));
}

function getNilaiRaporRowsForExport(assignment, option) {
  const students = getNilaiStudentsForAssignment(assignment).filter(siswa => {
    const originalClass = getNilaiKelasParts(siswa.kelas).kelas;
    const shadowClass = siswa.kelasNilaiParts?.kelas || "";
    if (option.source === "asli") return originalClass === option.classKey;
    return shadowClass === option.classKey;
  });
  return students.map((siswa, index) => {
    const nilaiDoc = getNilaiForStudent(assignment, siswa.nipd);
    const values = getNilaiUiValues(nilaiDoc);
    return {
      NO: index + 1,
      NIPD: siswa.nipd || "",
      NAMA: siswa.nama || "",
      KELAS: option.classKey,
      NILAI_RAPOR: values.rapor
    };
  });
}

function applyNilaiRaporExportStyles(worksheet, rowCount = 0) {
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
  worksheet["!cols"] = [
    { wch: 6 },
    { wch: 14 },
    { wch: 30 },
    { wch: 10 },
    { wch: 14 }
  ];
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
  XLSX.writeFile(workbook, `template-nilai-${assignment.tingkat}${assignment.rombel}-${assignment.mapel_kode}.xlsx`);
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
    Swal.fire("Tidak ada kelas", "Belum ada kelas asli atau kelas bayangan yang bisa dipakai untuk download nilai rapor.", "warning");
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
  const rows = getNilaiRaporRowsForExport(assignment, selectedOption);
  if (!rows.length) {
    Swal.fire("Tidak ada data", "Belum ada siswa pada kelas yang dipilih untuk diunduh.", "warning");
    return;
  }
  const worksheet = XLSX.utils.json_to_sheet(rows, { header: ["NO", "NIPD", "NAMA", "KELAS", "NILAI_RAPOR"] });
  applyNilaiRaporExportStyles(worksheet, rows.length);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Nilai Rapor");
  const kelasSlug = String(selectedOption.classKey || "").replace(/\s+/g, "");
  XLSX.writeFile(workbook, `nilai-rapor-${kelasSlug}-${String(assignment.mapel_kode || "").toUpperCase()}.xlsx`);
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
  const draft = canUseNilaiOfflineDraft() ? getNilaiOfflineDraft(assignment) : null;
  if (!draft?.rows?.length) {
    panel.hidden = true;
    panel.innerHTML = "";
    return;
  }
  const savedAt = draft.savedAt ? new Date(draft.savedAt).toLocaleString("id-ID") : "waktu tidak diketahui";
  panel.hidden = false;
  panel.innerHTML = `
    Ada <strong>${draft.rows.length}</strong> baris draft nilai offline untuk kelas/mapel ini.
    Disimpan: <strong>${escapeNilaiHtml(savedAt)}</strong>.
    Baris berwarna kuning memakai nilai dari draft lokal sampai draft disinkronkan atau diperbarui.
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

function validateNilaiRows(rows) {
  const invalidRow = rows.find(row =>
    ["uh_1", "uh_2", "uh_3", "uh_4", "uh_5", "pts", "semester", "rapor"].some(field => Number.isNaN(row.payload[field]))
  );
  if (invalidRow) {
    throw new Error(`Nilai tidak valid untuk ${invalidRow.siswa?.nama || invalidRow.siswa?.nipd || "siswa"}`);
  }
}

function assertGuruCanSaveNilaiAssignment(user, assignment) {
  const hasCoordinatorAccess = typeof canUseCoordinatorAccess === "function" && canUseCoordinatorAccess();
  if (user.role === "guru" && !(hasCoordinatorAccess && currentNilaiAccessMode === "koordinator") && String(assignment.guru_kode || "") !== String(user.kode_guru || "")) {
    Swal.fire("Akses ditolak", "Guru hanya dapat menginput nilai siswa yang diajar.", "warning");
    return false;
  }
  return true;
}

async function saveNilaiAssignmentOfflineDraft() {
  const select = document.getElementById("nilaiAssignmentSelect");
  const assignment = parseNilaiAssignmentId(select?.value || "");
  if (!assignment.mapel_kode) {
    Swal.fire("Pilih kelas dan mapel", "", "warning");
    return;
  }
  if (!canUseNilaiOfflineDraft() || !window.GuruOffline?.saveNilaiDraft) {
    Swal.fire("Tidak tersedia", "Draft offline hanya tersedia untuk role guru.", "warning");
    return;
  }

  const user = getCurrentNilaiUser();
  if (!assertGuruCanSaveNilaiAssignment(user, assignment)) return;

  try {
    const rows = buildNilaiRowsFromCurrentInputs(assignment, user);
    validateNilaiRows(rows);
    window.GuruOffline.saveNilaiDraft(makeNilaiOfflineAssignmentKey(assignment), {
      assignment,
      inputMode: currentNilaiInputMode,
      rows
    }, user);
    renderNilaiOfflineDraftInfo(assignment);
    Swal.fire("Draft tersimpan", "Nilai disimpan di perangkat ini. Sinkronkan saat internet tersedia.", "success");
  } catch (error) {
    console.error(error);
    Swal.fire("Gagal menyimpan draft", error?.message || "Draft offline belum berhasil disimpan.", "error");
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
  if (!draft?.rows?.length) {
    Swal.fire("Tidak ada draft", "Belum ada draft offline untuk kelas/mapel ini.", "info");
    return;
  }

  try {
    setNilaiSavingState(true, "Menyinkronkan draft...");
    validateNilaiRows(draft.rows);
    await upsertNilaiRows(draft.rows, assignment);
    mergeSavedNilaiRowsIntoCache(draft.rows, assignment);
    syncCurrentNilaiAssignmentRows(assignment);
    window.GuruOffline.clearNilaiDraft(makeNilaiOfflineAssignmentKey(assignment), user);
    setNilaiSavingState(false);
    renderNilaiTableState();
    window.GuruOffline.renderStatus?.();
    Swal.fire("Sinkron selesai", `${draft.rows.length} baris nilai draft sudah dikirim ke Supabase.`, "success");
  } catch (error) {
    console.error(error);
    setNilaiSavingState(false);
    Swal.fire("Gagal sinkron", error?.message || "Draft belum berhasil disinkronkan.", "error");
  }
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

  try {
    setNilaiSavingState(true);
    const rows = buildNilaiRowsFromCurrentInputs(assignment, user);
    validateNilaiRows(rows);

    await upsertNilaiRows(rows, assignment);
    mergeSavedNilaiRowsIntoCache(rows, assignment);
    syncCurrentNilaiAssignmentRows(assignment);
    if (canUseNilaiOfflineDraft()) {
      window.GuruOffline?.clearNilaiDraft?.(makeNilaiOfflineAssignmentKey(assignment), user);
    }
    setNilaiSavingState(false);
    renderNilaiTableState();
    Swal.fire("Tersimpan", "Nilai sudah disimpan.", "success");
  } catch (error) {
    console.error(error);
    setNilaiSavingState(false);
    Swal.fire("Gagal menyimpan", error?.message || "Nilai belum berhasil disimpan.", "error");
  }
}

window.renderNilaiTableState = renderNilaiTableState;
window.renderNilaiPageState = renderNilaiPageState;
window.promptDownloadNilaiRapor = promptDownloadNilaiRapor;
window.handleNilaiModeSelectorChange = handleNilaiModeSelectorChange;
window.resolveNilaiInputModeForCurrentRole = resolveNilaiInputModeForCurrentRole;
window.storeNilaiUiMode = storeNilaiUiMode;
window.saveNilaiAssignmentOfflineDraft = saveNilaiAssignmentOfflineDraft;
window.syncNilaiAssignmentOfflineDraft = syncNilaiAssignmentOfflineDraft;
