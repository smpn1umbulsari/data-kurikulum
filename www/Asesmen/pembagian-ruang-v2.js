// ================= STATE ASESMEN =================
let semuaDataAsesmenSiswa = [];
let unsubscribeAsesmenSiswa = null;
let jumlahRuangUjian = Number(localStorage.getItem("asesmenJumlahRuangUjian") || 1);
let draftJumlahRuangUjian = jumlahRuangUjian;
let pembagianKelasAsesmen = ["manual", "20siswa"].includes(localStorage.getItem("asesmenPembagianKelas")) ? localStorage.getItem("asesmenPembagianKelas") : "setengah";
let draftPembagianKelasAsesmen = pembagianKelasAsesmen;
const asesmenRuangStore = window.AsesmenRuangStore || null;
let asesmenSaveStateTimer = null;
const asesmenStudentLevelCache = new Map();
const asesmenUnassignedLevelCache = new Map();
const asesmenOrderedStudentsCache = new Map();
const asesmenPresensiIndexCache = new Map();
const asesmenLevelRoomsCache = new Map();
const asesmenRoomsCache = new Map();
const asesmenDecoratedRoomsCache = new Map();
let asesmenRoomUsageCache = null;
let asesmenCombinedRoomMapCache = null;
const createAsesmenLevelSettings = asesmenRuangStore?.createLevelSettings || ((mode = "setengah") => ({
  enabled: true,
  mode,
  order: "az",
  roomRanges: [{ start: "", end: "" }, { start: "", end: "" }],
  manualCounts: []
}));
const asesmenLevelSettings = {
  7: createAsesmenLevelSettings(pembagianKelasAsesmen),
  8: createAsesmenLevelSettings(pembagianKelasAsesmen),
  9: createAsesmenLevelSettings(pembagianKelasAsesmen)
};
const draftAsesmenLevelSettings = {
  7: cloneAsesmenLevelSettings(asesmenLevelSettings[7]),
  8: cloneAsesmenLevelSettings(asesmenLevelSettings[8]),
  9: cloneAsesmenLevelSettings(asesmenLevelSettings[9])
};
const appliedAsesmenLevels = new Set();
const ASESMEN_STORAGE_KEY = "asesmenPembagianRuangV2";
const ASESMEN_PAGE_TAB_KEY = "asesmenKepersetaanTab";
const ASESMEN_PAGE_TABS = [
  { key: "pembagian-ruang", label: "Pembagian Ruang" },
  { key: "administrasi", label: "Administrasi" }
];
let asesmenPageTab = normalizeAsesmenPageTab(localStorage.getItem(ASESMEN_PAGE_TAB_KEY) || "pembagian-ruang");
let lastKepersetaanPageHtml = "";
let lastAsesmenRoomArrangementHtml = "";
const lastAsesmenPreviewHtmlByLevel = {};

function normalizeAsesmenPageTab(tab) {
  return ASESMEN_PAGE_TABS.some(item => item.key === tab) ? tab : "pembagian-ruang";
}

function setAsesmenPageTab(tab, options = {}) {
  asesmenPageTab = normalizeAsesmenPageTab(tab);
  localStorage.setItem(ASESMEN_PAGE_TAB_KEY, asesmenPageTab);
  if (options.skipReload) return;
  if (asesmenPageTab === "administrasi") {
    loadRealtimeAdministrasiAsesmen();
    return;
  }
  loadRealtimePembagianRuang();
}

function setAsesmenHtmlIfChanged(element, html) {
  if (element.innerHTML !== html) element.innerHTML = html;
}

function invalidateAsesmenStudentCaches() {
  asesmenStudentLevelCache.clear();
  asesmenUnassignedLevelCache.clear();
  asesmenOrderedStudentsCache.clear();
  asesmenPresensiIndexCache.clear();
  invalidateAsesmenRoomCaches();
}

function invalidateAsesmenRoomCaches() {
  asesmenLevelRoomsCache.clear();
  asesmenRoomsCache.clear();
  asesmenDecoratedRoomsCache.clear();
  asesmenRoomUsageCache = null;
  asesmenCombinedRoomMapCache = null;
}

function cloneAsesmenLevelSettings(settings) {
  if (asesmenRuangStore?.cloneLevelSettings) {
    return asesmenRuangStore.cloneLevelSettings(settings);
  }
  return {
    enabled: settings.enabled !== false,
    mode: settings.mode,
    order: settings.order,
    roomRanges: settings.roomRanges.map(range => ({ ...range })),
    manualCounts: [...settings.manualCounts]
  };
}

function syncAsesmenManualCountLength(settings) {
  if (asesmenRuangStore?.syncManualCountLength) {
    asesmenRuangStore.syncManualCountLength(settings, jumlahRuangUjian);
    return;
  }
  while (settings.manualCounts.length < jumlahRuangUjian) settings.manualCounts.push("");
  if (settings.manualCounts.length > jumlahRuangUjian) settings.manualCounts.length = jumlahRuangUjian;
}

function sanitizeAsesmenLevelSettings(settings = {}, fallbackMode = pembagianKelasAsesmen) {
  if (asesmenRuangStore?.sanitizeLevelSettings) {
    return asesmenRuangStore.sanitizeLevelSettings(settings, {
      fallbackMode,
      jumlahRuangUjian
    });
  }
  const roomRanges = Array.isArray(settings.roomRanges) ? settings.roomRanges : [];
  const sanitizedRanges = [0, 1].map(index => {
    const range = roomRanges[index] || {};
    return {
      start: String(range.start ?? "").trim(),
      end: String(range.end ?? "").trim()
    };
  });
  const manualCounts = Array.isArray(settings.manualCounts)
    ? settings.manualCounts.map(value => String(value ?? "").trim())
    : [];
  const sanitized = {
    enabled: settings.enabled !== false,
    mode: ["manual", "20siswa", "setengah"].includes(settings.mode) ? settings.mode : fallbackMode,
    order: settings.order === "za" ? "za" : "az",
    roomRanges: sanitizedRanges,
    manualCounts
  };
  syncAsesmenManualCountLength(sanitized);
  return sanitized;
}

function saveAsesmenPembagianRuangState() {
  if (asesmenSaveStateTimer) {
    clearTimeout(asesmenSaveStateTimer);
    asesmenSaveStateTimer = null;
  }
  if (asesmenRuangStore?.save) {
    asesmenRuangStore.save(ASESMEN_STORAGE_KEY, {
      jumlahRuangUjian,
      draftJumlahRuangUjian,
      pembagianKelasAsesmen,
      draftPembagianKelasAsesmen,
      appliedLevels: Array.from(appliedAsesmenLevels),
      asesmenLevelSettings,
      draftAsesmenLevelSettings
    });
    return;
  }
  const payload = {
    jumlahRuangUjian,
    draftJumlahRuangUjian,
    pembagianKelasAsesmen,
    draftPembagianKelasAsesmen,
    appliedLevels: Array.from(appliedAsesmenLevels),
    asesmenLevelSettings: {
      7: sanitizeAsesmenLevelSettings(asesmenLevelSettings[7]),
      8: sanitizeAsesmenLevelSettings(asesmenLevelSettings[8]),
      9: sanitizeAsesmenLevelSettings(asesmenLevelSettings[9])
    },
    draftAsesmenLevelSettings: {
      7: sanitizeAsesmenLevelSettings(draftAsesmenLevelSettings[7]),
      8: sanitizeAsesmenLevelSettings(draftAsesmenLevelSettings[8]),
      9: sanitizeAsesmenLevelSettings(draftAsesmenLevelSettings[9])
    }
  };
  localStorage.setItem(ASESMEN_STORAGE_KEY, JSON.stringify(payload));
}

function scheduleAsesmenPembagianRuangSave(delayMs = 140) {
  if (asesmenSaveStateTimer) clearTimeout(asesmenSaveStateTimer);
  asesmenSaveStateTimer = setTimeout(() => {
    saveAsesmenPembagianRuangState();
  }, delayMs);
}

function loadAsesmenPembagianRuangState() {
  if (asesmenRuangStore?.load) {
    const saved = asesmenRuangStore.load(ASESMEN_STORAGE_KEY, {
      jumlahRuangUjian,
      pembagianKelasAsesmen,
      asesmenLevelSettings
    });
    if (!saved) return;
    jumlahRuangUjian = saved.jumlahRuangUjian;
    draftJumlahRuangUjian = saved.draftJumlahRuangUjian;
    pembagianKelasAsesmen = saved.pembagianKelasAsesmen;
    draftPembagianKelasAsesmen = saved.draftPembagianKelasAsesmen;
    [7, 8, 9].forEach(level => {
      asesmenLevelSettings[level] = saved.asesmenLevelSettings[level];
      draftAsesmenLevelSettings[level] = saved.draftAsesmenLevelSettings[level];
    });
    appliedAsesmenLevels.clear();
    saved.appliedLevels.forEach(level => appliedAsesmenLevels.add(String(level)));
    localStorage.setItem("asesmenJumlahRuangUjian", String(jumlahRuangUjian));
    localStorage.setItem("asesmenPembagianKelas", pembagianKelasAsesmen);
    return;
  }
  try {
    const raw = localStorage.getItem(ASESMEN_STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    const savedJumlah = Math.min(Math.max(Number(saved?.jumlahRuangUjian) || jumlahRuangUjian, 1), 99);
    jumlahRuangUjian = savedJumlah;
    draftJumlahRuangUjian = Math.min(Math.max(Number(saved?.draftJumlahRuangUjian) || savedJumlah, 1), 99);
    pembagianKelasAsesmen = ["manual", "20siswa", "setengah"].includes(saved?.pembagianKelasAsesmen) ? saved.pembagianKelasAsesmen : "setengah";
    draftPembagianKelasAsesmen = ["manual", "20siswa", "setengah"].includes(saved?.draftPembagianKelasAsesmen) ? saved.draftPembagianKelasAsesmen : pembagianKelasAsesmen;

    [7, 8, 9].forEach(level => {
      asesmenLevelSettings[level] = sanitizeAsesmenLevelSettings(
        saved?.asesmenLevelSettings?.[level] || saved?.asesmenLevelSettings?.[String(level)] || asesmenLevelSettings[level],
        pembagianKelasAsesmen
      );
      draftAsesmenLevelSettings[level] = sanitizeAsesmenLevelSettings(
        saved?.draftAsesmenLevelSettings?.[level] || saved?.draftAsesmenLevelSettings?.[String(level)] || asesmenLevelSettings[level],
        draftPembagianKelasAsesmen
      );
    });

    appliedAsesmenLevels.clear();
    const appliedLevels = Array.isArray(saved?.appliedLevels) ? saved.appliedLevels : [];
    appliedLevels.forEach(level => {
      const normalized = String(level || "").trim();
      if (["7", "8", "9"].includes(normalized)) appliedAsesmenLevels.add(normalized);
    });

    localStorage.setItem("asesmenJumlahRuangUjian", String(jumlahRuangUjian));
    localStorage.setItem("asesmenPembagianKelas", pembagianKelasAsesmen);
  } catch (error) {
    console.error("Gagal memuat pengaturan pembagian ruang asesmen", error);
  }
}

loadAsesmenPembagianRuangState();

function isAsesmenLevelApplied(level) {
  return appliedAsesmenLevels.has(String(level));
}

function isAsesmenLevelEnabled(level) {
  return draftAsesmenLevelSettings[level]?.enabled !== false;
}

function escapeAsesmenHtml(value) {
  if (window.AppUtils?.escapeHtml) return window.AppUtils.escapeHtml(value);
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function asesmenCompare(left, right, direction = "asc") {
  const result = String(left ?? "").trim().localeCompare(String(right ?? "").trim(), undefined, {
    numeric: true,
    sensitivity: "base"
  });
  return direction === "asc" ? result : -result;
}

function getAsesmenKelasParts(kelasValue = "") {
  if (window.AppUtils?.parseKelas) return window.AppUtils.parseKelas(kelasValue);
  const normalized = String(kelasValue || "").trim().toUpperCase().replace(/\s+/g, "");
  const match = normalized.match(/([7-9])([A-Z]+)$/);
  return {
    tingkat: match ? match[1] : "",
    rombel: match ? match[2] : "",
    kelas: match ? `${match[1]} ${match[2]}` : String(kelasValue || "").trim().toUpperCase()
  };
}

function isAsesmenRombelBayanganUtama(rombel) {
  return /^[A-H]$/.test(String(rombel || "").trim().toUpperCase());
}

function isAsesmenSiswaTambahanBayangan(siswa) {
  const kelasAsli = String(siswa?.asliKelasParts?.kelas || siswa?.kelas || "").trim().toUpperCase();
  const kelasAcuan = String(siswa?.kelasParts?.kelas || "").trim().toUpperCase();
  return Boolean(kelasAsli && kelasAcuan && kelasAsli !== kelasAcuan);
}

function compareAsesmenSiswaDalamKelas(a, b) {
  const tambahanA = isAsesmenSiswaTambahanBayangan(a) ? 1 : 0;
  const tambahanB = isAsesmenSiswaTambahanBayangan(b) ? 1 : 0;
  if (tambahanA !== tambahanB) return tambahanA - tambahanB;
  return asesmenCompare(a.nama, b.nama, "asc");
}

function getAsesmenKelasBayanganParts(siswa) {
  if (window.AppUtils?.getPrimaryKelasParts) return window.AppUtils.getPrimaryKelasParts(siswa);
  const asliParts = getAsesmenKelasParts(siswa.kelas);
  const bayanganParts = getAsesmenKelasParts(siswa.kelas_bayangan);

  if (bayanganParts.tingkat === asliParts.tingkat && isAsesmenRombelBayanganUtama(bayanganParts.rombel)) {
    return bayanganParts;
  }

  if (isAsesmenRombelBayanganUtama(asliParts.rombel)) {
    return asliParts;
  }

  return { tingkat: asliParts.tingkat, rombel: "", kelas: "" };
}

function getAsesmenStudentsByLevel(level) {
  const cacheKey = String(level);
  if (asesmenStudentLevelCache.has(cacheKey)) return asesmenStudentLevelCache.get(cacheKey);

  const students = semuaDataAsesmenSiswa
    .map(siswa => {
      const asliKelasParts = getAsesmenKelasParts(siswa.kelas);
      const kelasParts = getAsesmenKelasBayanganParts(siswa);
      return { ...siswa, asliKelasParts, kelasParts };
    })
    .filter(siswa => siswa.kelasParts.tingkat === String(level) && siswa.kelasParts.rombel)
    .sort((a, b) => {
      const kelasResult = asesmenCompare(a.kelasParts.rombel, b.kelasParts.rombel, "asc");
      if (kelasResult !== 0) return kelasResult;
      return compareAsesmenSiswaDalamKelas(a, b);
    });
  asesmenStudentLevelCache.set(cacheKey, students);
  return students;
}

function getAsesmenRombelCode(rombel = "") {
  const letter = String(rombel || "").trim().toUpperCase().charAt(0);
  if (!/^[A-Z]$/.test(letter)) return "0";
  return String(letter.charCodeAt(0) - 64);
}

function getAsesmenJenisKelaminCode(jk = "") {
  const normalized = String(jk || "").trim().toUpperCase();
  if (normalized === "L") return "1";
  if (normalized === "P") return "2";
  return "-";
}

function isSameAsesmenSiswa(left, right) {
  if (left?.nipd && right?.nipd) return String(left.nipd) === String(right.nipd);
  if (left?.nisn && right?.nisn) return String(left.nisn) === String(right.nisn);
  return String(left?.nama || "") === String(right?.nama || "")
    && String(left?.kelasParts?.kelas || left?.kelas || "") === String(right?.kelasParts?.kelas || right?.kelas || "");
}

function getAsesmenStudentKey(siswa = {}) {
  if (siswa.nipd) return `nipd:${String(siswa.nipd)}`;
  if (siswa.nisn) return `nisn:${String(siswa.nisn)}`;
  return `nama:${String(siswa.nama || "")}|kelas:${String(siswa.kelasParts?.kelas || siswa.kelas || "")}`;
}

function getAsesmenPresensiIndexByLevel(level) {
  const cacheKey = String(level || "");
  if (asesmenPresensiIndexCache.has(cacheKey)) return asesmenPresensiIndexCache.get(cacheKey);

  const byClass = new Map();
  getAsesmenStudentsByLevel(level).forEach(siswa => {
    const kelas = siswa?.kelasParts?.kelas || "";
    if (!kelas) return;
    if (!byClass.has(kelas)) byClass.set(kelas, []);
    byClass.get(kelas).push(siswa);
  });

  const indexByStudent = new Map();
  byClass.forEach(students => {
    [...students]
      .sort(compareAsesmenSiswaDalamKelas)
      .forEach((siswa, index) => {
        indexByStudent.set(getAsesmenStudentKey(siswa), index + 1);
      });
  });
  asesmenPresensiIndexCache.set(cacheKey, indexByStudent);
  return indexByStudent;
}

function getAsesmenNomorPresensi(siswa) {
  const presensi = getAsesmenPresensiIndexByLevel(siswa?.kelasParts?.tingkat).get(getAsesmenStudentKey(siswa)) || 0;
  return String(presensi).padStart(3, "0");
}

function getAsesmenNomorUjian(siswa) {
  const tingkat = siswa?.kelasParts?.tingkat || "-";
  const rombelCode = getAsesmenRombelCode(siswa?.kelasParts?.rombel);
  const presensi = getAsesmenNomorPresensi(siswa);
  const jkCode = getAsesmenJenisKelaminCode(siswa?.jk);
  return `${tingkat}${rombelCode}-130-${presensi}-${jkCode}`;
}

function getAsesmenKelasAsliNote(siswa) {
  const kelasAsli = siswa?.asliKelasParts?.kelas || siswa?.kelas || "";
  const kelasAcuan = siswa?.kelasParts?.kelas || "";
  return kelasAsli && kelasAcuan && kelasAsli !== kelasAcuan ? ` <small>(${escapeAsesmenHtml(kelasAsli)})</small>` : "";
}

function getAsesmenUnassignedStudentsByLevel(level) {
  const cacheKey = String(level);
  if (asesmenUnassignedLevelCache.has(cacheKey)) return asesmenUnassignedLevelCache.get(cacheKey);

  const students = semuaDataAsesmenSiswa
    .map(siswa => {
      const asliKelasParts = getAsesmenKelasParts(siswa.kelas);
      const kelasParts = getAsesmenKelasBayanganParts(siswa);
      return { ...siswa, asliKelasParts, kelasParts };
    })
    .filter(siswa => siswa.asliKelasParts.tingkat === String(level) && !siswa.kelasParts.rombel);
  asesmenUnassignedLevelCache.set(cacheKey, students);
  return students;
}

function getOrderedAsesmenStudents(level) {
  const cacheKey = `${level}:${asesmenLevelSettings[level]?.order || "az"}`;
  if (asesmenOrderedStudentsCache.has(cacheKey)) return asesmenOrderedStudentsCache.get(cacheKey);
  const settings = asesmenLevelSettings[level];
  const classDirection = settings.order === "za" ? "desc" : "asc";
  const students = [...getAsesmenStudentsByLevel(level)].sort((a, b) => {
    const kelasResult = asesmenCompare(a.kelasParts.rombel, b.kelasParts.rombel, classDirection);
    if (kelasResult !== 0) return kelasResult;
    return compareAsesmenSiswaDalamKelas(a, b);
  });
  asesmenOrderedStudentsCache.set(cacheKey, students);
  return students;
}

function chunkAsesmenStudents(students, size) {
  const safeSize = Math.min(Math.max(Number(size) || 1, 1), 20);
  const chunks = [];
  for (let index = 0; index < students.length; index += safeSize) {
    chunks.push(students.slice(index, index + safeSize));
  }
  return chunks;
}

function expandAsesmenRange(startValue, endValue) {
  const start = Number(startValue);
  const end = Number(endValue || startValue);
  if (!Number.isFinite(start) || start <= 0) return [];
  if (!Number.isFinite(end) || end <= 0) return [start];

  const rooms = [];
  const step = start <= end ? 1 : -1;
  for (let room = start; step > 0 ? room <= end : room >= end; room += step) {
    rooms.push(room);
  }
  return rooms;
}

function getAsesmenLevelRooms(level) {
  if (!isAsesmenLevelApplied(level)) return [];
  const cacheKey = String(level);
  if (asesmenLevelRoomsCache.has(cacheKey)) return asesmenLevelRoomsCache.get(cacheKey);

  const seen = new Set();
  const rooms = [];
  asesmenLevelSettings[level].roomRanges.forEach(range => {
    expandAsesmenRange(range.start, range.end).forEach(room => {
      if (!seen.has(room)) {
        seen.add(room);
        rooms.push(room);
      }
    });
  });
  asesmenLevelRoomsCache.set(cacheKey, rooms);
  return rooms;
}

function getAsesmenRoomUsage() {
  if (asesmenRoomUsageCache) return asesmenRoomUsageCache;
  const usage = new Map();
  [7, 8, 9].forEach(level => {
    getAsesmenLevelRooms(level).forEach(roomNumber => {
      if (!usage.has(roomNumber)) usage.set(roomNumber, []);
      usage.get(roomNumber).push(String(level));
    });
  });
  asesmenRoomUsageCache = usage;
  return usage;
}

function getAsesmenRoomConflictMessages(level) {
  const usage = getAsesmenRoomUsage();
  return getAsesmenLevelRooms(level)
    .filter(roomNumber => (usage.get(roomNumber) || []).length > 2)
    .map(roomNumber => `Ruang ${roomNumber} dipakai oleh kelas ${usage.get(roomNumber).join(", ")}`);
}

function decorateAsesmenRooms(level, rooms) {
  const physicalRooms = getAsesmenLevelRooms(level);
  return rooms.map((students, index) => ({
    level: String(level),
    students,
    roomNumber: physicalRooms[index] || index + 1,
    missingPhysicalRoom: physicalRooms.length > 0 && !physicalRooms[index]
  }));
}

function buildSetengahAsesmenRooms(level) {
  const settings = asesmenLevelSettings[level];
  const classDirection = settings.order === "za" ? "desc" : "asc";
  const grouped = new Map();
  getAsesmenStudentsByLevel(level).forEach(siswa => {
    const kelas = siswa.kelasParts.kelas;
    if (!grouped.has(kelas)) grouped.set(kelas, []);
    grouped.get(kelas).push(siswa);
  });

  const kelasList = Array.from(grouped.keys()).sort((a, b) => {
    const rombelA = getAsesmenKelasParts(a).rombel;
    const rombelB = getAsesmenKelasParts(b).rombel;
    return asesmenCompare(rombelA, rombelB, classDirection);
  });

  return kelasList.flatMap(kelas => {
    const siswaKelas = grouped.get(kelas).sort(compareAsesmenSiswaDalamKelas);
    const halfSize = Math.max(1, Math.ceil(siswaKelas.length / 2));
    return chunkAsesmenStudents(siswaKelas, halfSize);
  });
}

function buildTwentyStudentsAsesmenRooms(level) {
  return chunkAsesmenStudents(getOrderedAsesmenStudents(level), 20);
}

function buildManualAsesmenRooms(level) {
  const settings = asesmenLevelSettings[level];
  const students = getOrderedAsesmenStudents(level);
  let cursor = 0;

  return settings.manualCounts
    .slice(0, jumlahRuangUjian)
    .map(count => Math.min(Math.max(Number(count) || 0, 0), 20))
    .filter(count => count > 0)
    .map(count => {
      const roomStudents = students.slice(cursor, cursor + count);
      cursor += count;
      return roomStudents;
    });
}

function getAsesmenRooms(level) {
  if (!isAsesmenLevelApplied(level)) return [];
  const cacheKey = String(level);
  if (asesmenRoomsCache.has(cacheKey)) return asesmenRoomsCache.get(cacheKey);

  const settings = asesmenLevelSettings[level];
  const rooms = settings.mode === "manual"
    ? buildManualAsesmenRooms(level)
    : settings.mode === "20siswa"
      ? buildTwentyStudentsAsesmenRooms(level)
      : buildSetengahAsesmenRooms(level);
  asesmenRoomsCache.set(cacheKey, rooms);
  return rooms;
}

function getDecoratedAsesmenRoomsByLevel(level) {
  const cacheKey = String(level);
  if (asesmenDecoratedRoomsCache.has(cacheKey)) return asesmenDecoratedRoomsCache.get(cacheKey);
  const rooms = decorateAsesmenRooms(level, getAsesmenRooms(level));
  asesmenDecoratedRoomsCache.set(cacheKey, rooms);
  return rooms;
}

function getCombinedAsesmenRoomMap() {
  if (asesmenCombinedRoomMapCache) return asesmenCombinedRoomMapCache;
  const roomMap = new Map();
  [7, 8, 9].forEach(level => {
    getDecoratedAsesmenRoomsByLevel(level).forEach(room => {
      if (!roomMap.has(room.roomNumber)) roomMap.set(room.roomNumber, []);
      roomMap.get(room.roomNumber).push(room);
    });
  });
  asesmenCombinedRoomMapCache = new Map(Array.from(roomMap.entries()).sort((a, b) => Number(a[0]) - Number(b[0])));
  return asesmenCombinedRoomMapCache;
}

function setJumlahRuangUjian(value) {
  draftJumlahRuangUjian = Math.min(Math.max(Number(value) || 1, 1), 99);
  scheduleAsesmenPembagianRuangSave();
}

function setPembagianKelasAsesmen(value) {
  const normalizedValue = ["manual", "20siswa"].includes(value) ? value : "setengah";
  const previousValue = draftPembagianKelasAsesmen;
  draftPembagianKelasAsesmen = normalizedValue;
  scheduleAsesmenPembagianRuangSave();
  if (normalizedValue === "manual" && previousValue !== "manual") {
    setTimeout(() => openAsesmenManualCountDialog(["7", "8", "9"]), 0);
  }
}

function applyJumlahRuangUjian() {
  jumlahRuangUjian = Math.min(Math.max(Number(draftJumlahRuangUjian) || 1, 1), 99);
  pembagianKelasAsesmen = ["manual", "20siswa"].includes(draftPembagianKelasAsesmen) ? draftPembagianKelasAsesmen : "setengah";
  localStorage.setItem("asesmenJumlahRuangUjian", String(jumlahRuangUjian));
  localStorage.setItem("asesmenPembagianKelas", pembagianKelasAsesmen);
  appliedAsesmenLevels.clear();
  [7, 8, 9].forEach(level => {
    asesmenLevelSettings[level].mode = pembagianKelasAsesmen;
    draftAsesmenLevelSettings[level].mode = pembagianKelasAsesmen;
    syncAsesmenManualCountLength(asesmenLevelSettings[level]);
    syncAsesmenManualCountLength(draftAsesmenLevelSettings[level]);
  });
  invalidateAsesmenRoomCaches();
  saveAsesmenPembagianRuangState();
  renderPembagianRuangState();
  if (typeof showFloatingToast === "function") showFloatingToast("Pengaturan telah diset");
}

function setAsesmenLevelEnabled(level, enabled) {
  const normalizedLevel = String(level);
  const safeEnabled = enabled === true || enabled === "true";
  draftAsesmenLevelSettings[normalizedLevel].enabled = safeEnabled;
  asesmenLevelSettings[normalizedLevel].enabled = safeEnabled;
  if (!safeEnabled) appliedAsesmenLevels.delete(normalizedLevel);
  invalidateAsesmenRoomCaches();
  saveAsesmenPembagianRuangState();
  renderPembagianRuangState();
  if (typeof showFloatingToast === "function") {
    showFloatingToast(safeEnabled ? `Kelas ${normalizedLevel} diaktifkan` : `Kelas ${normalizedLevel} dinonaktifkan`);
  }
}

function setAsesmenOrder(level, value) {
  draftAsesmenLevelSettings[level].order = value === "za" ? "za" : "az";
  scheduleAsesmenPembagianRuangSave();
}

function setAsesmenRoomRange(level, rangeIndex, key, value) {
  draftAsesmenLevelSettings[level].roomRanges[rangeIndex][key] = value;
  scheduleAsesmenPembagianRuangSave();
}

function setAsesmenManualCount(level, roomIndex, value) {
  draftAsesmenLevelSettings[level].manualCounts[roomIndex] = value;
  scheduleAsesmenPembagianRuangSave();
}

function normalizeAsesmenManualDialogLevels(levelOrLevels) {
  const levelKeys = (Array.isArray(levelOrLevels) ? levelOrLevels : [levelOrLevels])
    .map(level => String(level))
    .filter(level => draftAsesmenLevelSettings[level]?.enabled !== false);
  return levelKeys.length ? levelKeys : ["7", "8", "9"].filter(level => draftAsesmenLevelSettings[level]);
}

function renderAsesmenManualPopupTable(levelKey, settings, roomCount) {
  const totalSiswa = getAsesmenStudentsByLevel(levelKey).length;
  const rows = Array.from({ length: roomCount }, (_, index) => {
    const value = settings.manualCounts[index] || "";
    return `
      <tr>
        <td>Ruang ${index + 1}</td>
        <td>
          <label class="asesmen-manual-popup-field">
            <input
              id="asesmenManualCount-${levelKey}-${index}"
              type="number"
              min="0"
              max="20"
              value="${escapeAsesmenHtml(value)}"
              placeholder="0-20"
              inputmode="numeric"
            >
          </label>
        </td>
      </tr>
    `;
  }).join("");
  return `
    <section class="asesmen-manual-popup-section">
      <div class="asesmen-manual-popup-section-head">
        <strong>Kelas ${levelKey}</strong>
        <span>${totalSiswa} siswa</span>
      </div>
      <div class="table-container asesmen-manual-popup-table-wrap">
        <table class="mapel-table asesmen-manual-popup-table">
          <thead>
            <tr>
              <th>Ruangan</th>
              <th>Jumlah</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </section>
  `;
}

function openAsesmenManualCountDialog(levelOrLevels) {
  const levelKeys = normalizeAsesmenManualDialogLevels(levelOrLevels);
  if (!levelKeys.length) return;
  const roomCount = Math.min(Math.max(Number(draftJumlahRuangUjian) || Number(jumlahRuangUjian) || 1, 1), 99);
  levelKeys.forEach(levelKey => {
    const settings = draftAsesmenLevelSettings[levelKey];
    while (settings.manualCounts.length < roomCount) settings.manualCounts.push("");
    if (settings.manualCounts.length > roomCount) settings.manualCounts.length = roomCount;
  });
  const tables = levelKeys
    .map(levelKey => renderAsesmenManualPopupTable(levelKey, draftAsesmenLevelSettings[levelKey], roomCount))
    .join("");

  Swal.fire({
    title: levelKeys.length === 1 ? `Manual Kelas ${levelKeys[0]}` : "Mode Pembagian Manual",
    html: `
      <div class="asesmen-manual-popup">
        <p>Isi jumlah siswa untuk tiap ruangan. Batas maksimal 20 siswa per ruang.</p>
        ${tables}
      </div>
    `,
    width: 820,
    showCancelButton: true,
    confirmButtonText: "Gunakan",
    cancelButtonText: "Batal",
    focusConfirm: false,
    preConfirm: () => {
      const result = {};
      levelKeys.forEach(levelKey => {
        const values = Array.from({ length: roomCount }, (_, index) => {
          const input = document.getElementById(`asesmenManualCount-${levelKey}-${index}`);
          return Math.min(Math.max(Number(input?.value) || 0, 0), 20);
        });
        result[levelKey] = values.map(value => (value > 0 ? String(value) : ""));
      });
      return result;
    }
  }).then(result => {
    if (!result.isConfirmed || !result.value || typeof result.value !== "object") return;
    levelKeys.forEach(levelKey => {
      if (Array.isArray(result.value[levelKey])) {
        draftAsesmenLevelSettings[levelKey].manualCounts = result.value[levelKey];
      }
    });
    invalidateAsesmenRoomCaches();
    saveAsesmenPembagianRuangState();
    renderPembagianRuangState();
  });
}

function applyAsesmenLevelSettings(level) {
  if (draftAsesmenLevelSettings[level].enabled === false) {
    appliedAsesmenLevels.delete(String(level));
    invalidateAsesmenRoomCaches();
    saveAsesmenPembagianRuangState();
    renderPembagianRuangState();
    return;
  }
  syncAsesmenManualCountLength(draftAsesmenLevelSettings[level]);
  draftAsesmenLevelSettings[level].mode = pembagianKelasAsesmen;
  asesmenLevelSettings[level] = cloneAsesmenLevelSettings(draftAsesmenLevelSettings[level]);
  appliedAsesmenLevels.add(String(level));
  invalidateAsesmenRoomCaches();
  saveAsesmenPembagianRuangState();
  renderPembagianRuangState();
}

function loadRealtimePembagianRuang() {
  if (window.AsesmenRuangService?.loadPembagianRuang) {
    unsubscribeAsesmenSiswa = window.AsesmenRuangService.loadPembagianRuang(unsubscribeAsesmenSiswa, {
      onData: data => {
        semuaDataAsesmenSiswa = data;
        invalidateAsesmenStudentCaches();
      },
      onRender: () => renderPembagianRuangState()
    });
    return;
  }
  if (unsubscribeAsesmenSiswa) unsubscribeAsesmenSiswa();
  unsubscribeAsesmenSiswa = listenSiswa(data => {
    semuaDataAsesmenSiswa = data;
    invalidateAsesmenStudentCaches();
    renderPembagianRuangState();
  });
}

function loadRealtimeAdministrasiAsesmen() {
  if (window.AsesmenRuangService?.loadAdministrasi) {
    unsubscribeAsesmenSiswa = window.AsesmenRuangService.loadAdministrasi(unsubscribeAsesmenSiswa, {
      onData: data => {
        semuaDataAsesmenSiswa = data;
        invalidateAsesmenStudentCaches();
      },
      onRender: () => renderAdministrasiAsesmenState()
    });
    return;
  }
  if (unsubscribeAsesmenSiswa) unsubscribeAsesmenSiswa();
  if (typeof loadKepalaSekolahTtdSettings === "function") {
    loadKepalaSekolahTtdSettings().then(renderAdministrasiAsesmenState);
  }
  unsubscribeAsesmenSiswa = listenSiswa(data => {
    semuaDataAsesmenSiswa = data;
    invalidateAsesmenStudentCaches();
    renderAdministrasiAsesmenState();
  });
}

function renderPembagianRuangState() {
  const content = document.getElementById("content");
  if (!content) return;
  const nextHtml = renderKepersetaanPage();
  const expectedId = asesmenPageTab === "pembagian-ruang" ? "asesmenRoomArrangement" : "asesmenAdministrasiPage";
  if (nextHtml !== lastKepersetaanPageHtml || !document.getElementById(expectedId)) {
    content.innerHTML = nextHtml;
    lastKepersetaanPageHtml = nextHtml;
    lastAsesmenRoomArrangementHtml = "";
    Object.keys(lastAsesmenPreviewHtmlByLevel).forEach(key => {
      lastAsesmenPreviewHtmlByLevel[key] = "";
    });
  }
  if (asesmenPageTab === "pembagian-ruang") renderAllAsesmenPreviews();
}

function renderAdministrasiAsesmenState() {
  const content = document.getElementById("content");
  if (!content) return;
  const nextHtml = renderKepersetaanPage();
  if (nextHtml !== lastKepersetaanPageHtml || !content.children.length) {
    content.innerHTML = nextHtml;
    lastKepersetaanPageHtml = nextHtml;
  }
}

function setAdministrasiAsesmenSetting(key, value) {
  if (window.AsesmenAdministrasiSettings?.set) {
    window.AsesmenAdministrasiSettings.set(key, value);
    return;
  }
  localStorage.setItem(`asesmenAdministrasi${key}`, value);
}

function getAdministrasiAsesmenSetting(key, fallback = "") {
  if (window.AsesmenAdministrasiSettings?.get) {
    return window.AsesmenAdministrasiSettings.get(key, fallback);
  }
  return localStorage.getItem(`asesmenAdministrasi${key}`) || fallback;
}

function renderAdministrasiAsesmenKeteranganSelect() {
  if (window.AsesmenRuangView?.renderAdministrasiKeteranganSelect) {
    return window.AsesmenRuangView.renderAdministrasiKeteranganSelect({
      getSetting: getAdministrasiAsesmenSetting,
      keteranganOptions: window.AsesmenAdministrasiSettings?.getKeteranganOptions
        ? window.AsesmenAdministrasiSettings.getKeteranganOptions()
        : [
          "Tengah Semester Ganjil",
          "Akhir Semester Ganjil",
          "Tengah Semester Genap",
          "Akhir Tahun",
          "Akhir Jenjang"
        ],
      escape: escapeAsesmenHtml
    });
  }
  const value = getAdministrasiAsesmenSetting("Keterangan", "Akhir Tahun");
  const options = window.AsesmenAdministrasiSettings?.getKeteranganOptions
    ? window.AsesmenAdministrasiSettings.getKeteranganOptions()
    : [
      "Tengah Semester Ganjil",
      "Akhir Semester Ganjil",
      "Tengah Semester Genap",
      "Akhir Tahun",
      "Akhir Jenjang"
    ];
  const hasStoredValue = options.includes(value);
  const extraOption = value && !hasStoredValue
    ? `<option value="${escapeAsesmenHtml(value)}" selected>${escapeAsesmenHtml(value)}</option>`
    : "";

  return `
    <select class="kelas-inline-select" onchange="setAdministrasiAsesmenSetting('Keterangan', this.value)">
      ${extraOption}
      ${options.map(option => `<option value="${escapeAsesmenHtml(option)}" ${option === value ? "selected" : ""}>${escapeAsesmenHtml(option)}</option>`).join("")}
    </select>
  `;
}

function renderAdministrasiAsesmenPage() {
  if (window.AsesmenRuangView?.renderAdministrasiPage) {
    return window.AsesmenRuangView.renderAdministrasiPage({
      getSetting: getAdministrasiAsesmenSetting,
      escape: escapeAsesmenHtml,
      ttdPanelHtml: typeof renderKepalaSekolahTtdPanelHtml === "function" ? renderKepalaSekolahTtdPanelHtml() : "",
      keteranganOptions: window.AsesmenAdministrasiSettings?.getKeteranganOptions
        ? window.AsesmenAdministrasiSettings.getKeteranganOptions()
        : [
          "Tengah Semester Ganjil",
          "Akhir Semester Ganjil",
          "Tengah Semester Genap",
          "Akhir Tahun",
          "Akhir Jenjang"
        ]
    });
  }
  return `
    <div class="card">
      <div class="asesmen-page-head">
        <div>
          <span class="dashboard-eyebrow">Asesmen</span>
          <h2>Administrasi</h2>
          <p>Siapkan dokumen administrasi asesmen dari susunan ruang yang sudah di-set.</p>
        </div>
      </div>

      <div class="rekap-letter-settings asesmen-admin-settings">
        <label class="form-group">
          <span>Judul</span>
          <input value="${escapeAsesmenHtml(getAdministrasiAsesmenSetting("Judul", "Asesmen Sumatif"))}" oninput="setAdministrasiAsesmenSetting('Judul', this.value)">
        </label>
        <label class="form-group">
          <span>Keterangan</span>
          ${renderAdministrasiAsesmenKeteranganSelect()}
        </label>
        <label class="form-group">
          <span>Tahun Pelajaran</span>
          <input value="${escapeAsesmenHtml(getAdministrasiAsesmenSetting("TahunPelajaran", ""))}" placeholder="2025/2026" oninput="setAdministrasiAsesmenSetting('TahunPelajaran', this.value)">
        </label>
      </div>

      ${typeof renderKepalaSekolahTtdPanelHtml === "function" ? renderKepalaSekolahTtdPanelHtml() : ""}

      <div class="table-container mapel-table-container">
        <table class="mapel-table">
          <thead>
            <tr>
              <th>Administrasi</th>
              <th>Export PDF</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Tempel Kaca</td>
              <td><button type="button" class="btn-primary btn-table-compact" onclick="exportTempelKacaPDF()">Export PDF</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderAllAsesmenPreviews() {
  [7, 8, 9].forEach(level => renderAsesmenPreview(level));
  renderAsesmenRoomArrangement();
}

function renderKepersetaanPage() {
  const isAdministrasi = asesmenPageTab === "administrasi";
  return `
    <div class="kepangawasan-page">
      <div class="kepangawasan-tabbar" role="tablist" aria-label="Menu Kepersetaan">
        ${ASESMEN_PAGE_TABS.map(item => `
          <button
            type="button"
            class="kepangawasan-tab ${item.key === asesmenPageTab ? "active" : ""}"
            aria-selected="${item.key === asesmenPageTab ? "true" : "false"}"
            onclick="setAsesmenPageTab('${item.key}')"
          >
            ${item.label}
          </button>
        `).join("")}
      </div>
      ${isAdministrasi ? renderAdministrasiAsesmenPage() : renderPembagianRuangPage()}
    </div>
  `;
}

function renderAsesmenManualInputs(level) {
  if (window.AsesmenRuangView?.renderManualInputs) {
    return window.AsesmenRuangView.renderManualInputs({
      draftSettings: draftAsesmenLevelSettings,
      jumlahRuangUjian,
      escape: escapeAsesmenHtml
    }, level);
  }
  const settings = draftAsesmenLevelSettings[level];
  const isEnabled = settings.enabled !== false;
  if (settings.mode !== "manual") return "";

  const filledCounts = settings.manualCounts
    .slice(0, jumlahRuangUjian)
    .map(value => Math.min(Math.max(Number(value) || 0, 0), 20));

  return `
    <div class="asesmen-manual-summary">
      <div class="asesmen-manual-summary-head">
        <span>Manual per ruang</span>
          <button type="button" class="btn-secondary btn-table-compact" onclick="openAsesmenManualCountDialog('${level}')" ${isEnabled ? "" : "disabled"}>Set Pembagian Manual</button>
      </div>
      <div class="asesmen-level-summary">
        ${Array.from({ length: jumlahRuangUjian }, (_, index) => `<span>Ruang ${index + 1}: ${filledCounts[index] || 0}</span>`).join("")}
      </div>
    </div>
  `;
}

function renderAsesmenRoomRangeInputs(level) {
  if (window.AsesmenRuangView?.renderRoomRangeInputs) {
    return window.AsesmenRuangView.renderRoomRangeInputs({
      draftSettings: draftAsesmenLevelSettings,
      escape: escapeAsesmenHtml
    }, level);
  }
  const ranges = draftAsesmenLevelSettings[level].roomRanges;
  const isEnabled = draftAsesmenLevelSettings[level].enabled !== false;
  return `
    <div class="asesmen-range-grid">
      ${ranges.map((range, index) => `
        <div class="asesmen-range-group">
          <span>Rentang ${index + 1}</span>
            <input
              type="number"
              min="1"
              value="${escapeAsesmenHtml(range.start)}"
              placeholder="Awal"
              ${isEnabled ? "" : "disabled"}
              oninput="setAsesmenRoomRange('${level}', ${index}, 'start', this.value)"
            >
            <input
              type="number"
              min="1"
              value="${escapeAsesmenHtml(range.end)}"
              placeholder="Akhir"
              ${isEnabled ? "" : "disabled"}
              oninput="setAsesmenRoomRange('${level}', ${index}, 'end', this.value)"
            >
        </div>
      `).join("")}
    </div>
  `;
}

function renderAsesmenLevelPanel(level) {
  if (window.AsesmenRuangView?.renderLevelPanel) {
    return window.AsesmenRuangView.renderLevelPanel({
      draftSettings: draftAsesmenLevelSettings,
      escape: escapeAsesmenHtml,
      jumlahRuangUjian,
      getStudentCount: currentLevel => getAsesmenStudentsByLevel(currentLevel).length
    }, level);
  }
  const settings = draftAsesmenLevelSettings[level];
  const totalSiswa = getAsesmenStudentsByLevel(level).length;
  const isEnabled = settings.enabled !== false;

  return `
    <section class="asesmen-level-panel ${isEnabled ? "" : "asesmen-level-panel-disabled"}">
      <div class="asesmen-panel-head">
        <div>
          <span class="mapel-row-hint">Panel Kelas ${level}</span>
          <h3>Kelas ${level}</h3>
        </div>
        <div class="asesmen-panel-head-meta">
          <strong>${totalSiswa} siswa</strong>
          <button type="button" class="kalender-toggle-btn ${isEnabled ? "is-active" : ""}" onclick="setAsesmenLevelEnabled('${level}', ${isEnabled ? "false" : "true"})" aria-label="${isEnabled ? "Nonaktifkan" : "Aktifkan"}"><span>${isEnabled ? "Aktif" : "Nonaktif"}</span></button>
        </div>
      </div>

      <div class="asesmen-control-grid">
        <label class="form-group">
          <span>Urutan</span>
          <select class="kelas-inline-select" onchange="setAsesmenOrder('${level}', this.value)" ${isEnabled ? "" : "disabled"}>
            <option value="az" ${settings.order === "az" ? "selected" : ""}>A-Z</option>
            <option value="za" ${settings.order === "za" ? "selected" : ""}>Z-A</option>
          </select>
        </label>
      </div>

      ${renderAsesmenRoomRangeInputs(level)}
      ${renderAsesmenManualInputs(level)}

      <div class="asesmen-panel-actions">
        <button type="button" class="btn-primary btn-table-compact" onclick="applyAsesmenLevelSettings('${level}')" ${isEnabled ? "" : "disabled"}>Set Kelas ${level}</button>
        <span class="mapel-row-hint">${isEnabled ? "Perubahan panel ini diterapkan setelah klik Set." : `Kelas ${level} nonaktif dan dikeluarkan dari pembagian ruang.`}</span>
      </div>

      <div id="asesmenPreview-${level}" class="asesmen-preview"></div>
    </section>
  `;
}

function renderPembagianRuangPage() {
  if (window.AsesmenRuangView?.renderPembagianPage) {
    return window.AsesmenRuangView.renderPembagianPage({
      draftJumlahRuangUjian,
      draftPembagianKelasAsesmen,
      draftSettings: draftAsesmenLevelSettings,
      jumlahRuangUjian,
      escape: escapeAsesmenHtml,
      getStudentCount: level => getAsesmenStudentsByLevel(level).length
    });
  }
  return `
    <div class="card">
      <div class="asesmen-page-head">
        <div>
          <span class="dashboard-eyebrow">Asesmen</span>
          <h2>Pembagian Ruang</h2>
          <p>Atur ruang ujian dan susunan dua jenjang per ruang.</p>
        </div>
        <label class="asesmen-room-total">
          <span>Pengaturan global</span>
          <div class="asesmen-room-total-note">
            <span>Jumlah ruang -> isi banyak ruang yang dipakai.</span>
            <span>Mode pembagian -> pilih setengah, 20 siswa, atau manual.</span>
            <span>Jika pilih Manual, popup tabel jumlah siswa per ruang akan langsung muncul.</span>
          </div>
          <div class="asesmen-room-total-control">
            <label class="asesmen-room-total-field">
              <span>Jumlah ruang</span>
              <input type="number" min="1" max="99" value="${draftJumlahRuangUjian}" oninput="setJumlahRuangUjian(this.value)" title="Jumlah ruang ujian">
            </label>
            <label class="asesmen-room-total-field">
              <span>Mode pembagian</span>
              <select class="kelas-inline-select" onchange="setPembagianKelasAsesmen(this.value)" title="Pembagian kelas">
                <option value="setengah" ${draftPembagianKelasAsesmen === "setengah" ? "selected" : ""}>Setengah</option>
                <option value="20siswa" ${draftPembagianKelasAsesmen === "20siswa" ? "selected" : ""}>20 siswa</option>
                <option value="manual" ${draftPembagianKelasAsesmen === "manual" ? "selected" : ""}>Manual</option>
              </select>
            </label>
            <button type="button" class="btn-primary" onclick="applyJumlahRuangUjian()">Set</button>
          </div>
        </label>
      </div>

      <div class="matrix-toolbar-note">
        Isi dua rentang ruang per jenjang. Satu ruang fisik hanya boleh dipakai maksimal dua jenjang; susunan ruang menampilkan jenjang rendah di kiri dan jenjang tinggi di kanan.
      </div>

      <div class="asesmen-level-grid">
        ${[7, 8, 9].map(renderAsesmenLevelPanel).join("")}
      </div>

      <section class="asesmen-arrangement">
        <div class="asesmen-arrangement-head">
          <div>
            <span class="mapel-row-hint">Susunan Ruang</span>
            <h3>Preview Ruang Ujian</h3>
          </div>
        </div>
        <div id="asesmenRoomArrangement"></div>
      </section>
    </div>
  `;
}

function renderAsesmenPreview(level) {
  const container = document.getElementById(`asesmenPreview-${level}`);
  if (!container) return;

  const rooms = getAsesmenRooms(level);
  const decoratedRooms = getDecoratedAsesmenRoomsByLevel(level);
  const totalSiswa = getAsesmenStudentsByLevel(level).length;
  const belumBayangan = getAsesmenUnassignedStudentsByLevel(level).length;
  const assigned = rooms.reduce((sum, room) => sum + room.length, 0);
  const physicalRooms = getAsesmenLevelRooms(level);
  const missingPhysicalCount = decoratedRooms.filter(room => room.missingPhysicalRoom).length;
  const conflictMessages = getAsesmenRoomConflictMessages(level);
  const warnings = [];

  if (totalSiswa === 0) {
    const message = belumBayangan > 0
      ? `${belumBayangan} siswa kelas ${level} belum memiliki kelas bayangan.`
      : `Belum ada siswa kelas ${level}.`;
    const nextHtml = `<div class="empty-panel">${escapeAsesmenHtml(message)}</div>`;
    if (nextHtml !== lastAsesmenPreviewHtmlByLevel[level] || !container.children.length) {
      container.innerHTML = nextHtml;
      lastAsesmenPreviewHtmlByLevel[level] = nextHtml;
    }
    return;
  }

  if (!isAsesmenLevelApplied(level)) {
    const nextHtml = `<div class="empty-panel">Panel kelas ${escapeAsesmenHtml(level)} belum di-set.</div>`;
    if (nextHtml !== lastAsesmenPreviewHtmlByLevel[level] || !container.children.length) {
      container.innerHTML = nextHtml;
      lastAsesmenPreviewHtmlByLevel[level] = nextHtml;
    }
    return;
  }

  if (assigned < totalSiswa) warnings.push(`${totalSiswa - assigned} siswa belum masuk ruang.`);
  if (belumBayangan > 0) warnings.push(`${belumBayangan} siswa belum memiliki kelas bayangan.`);
  if (physicalRooms.length === 0) warnings.push("Ruang fisik belum diisi.");
  if (missingPhysicalCount > 0) warnings.push(`${missingPhysicalCount} bagian belum mendapat nomor ruang fisik.`);
  conflictMessages.forEach(message => warnings.push(message));

  const nextHtml = `
    ${warnings.map(message => `<div class="asesmen-warning">${escapeAsesmenHtml(message)}</div>`).join("")}
    <div class="asesmen-level-summary">
      <span>${decoratedRooms.length} bagian</span>
      <span>${physicalRooms.length} ruang dipilih</span>
      <span>A-H dari kelas bayangan</span>
      <span>${assigned}/${totalSiswa} siswa</span>
    </div>
  `;
  if (nextHtml !== lastAsesmenPreviewHtmlByLevel[level] || !container.children.length) {
    container.innerHTML = nextHtml;
    lastAsesmenPreviewHtmlByLevel[level] = nextHtml;
  }
}

function renderAsesmenStudentColumn(entry) {
  return `
    <section class="asesmen-room-column">
      <div class="asesmen-room-column-head">
        <strong>Kelas ${escapeAsesmenHtml(entry.level)}</strong>
        <span>${entry.students.length} siswa</span>
      </div>
      <div class="asesmen-student-list">
        ${entry.students.map(siswa => `
          <span>${escapeAsesmenHtml(siswa.kelasParts.kelas)}, ${escapeAsesmenHtml(getAsesmenNomorUjian(siswa))}, ${escapeAsesmenHtml(siswa.nama || "-")}${getAsesmenKelasAsliNote(siswa)}</span>
        `).join("")}
      </div>
    </section>
  `;
}

function renderTempelKacaRows(students = []) {
  return Array.from({ length: 20 }, (_, index) => students[index] || null).map((siswa, index) => siswa ? `
    <tr>
      <td class="tempel-no">${index + 1}</td>
      <td class="tempel-kelas">${escapeAsesmenHtml(siswa.kelasParts?.kelas || "-")}</td>
      <td class="tempel-nama">${escapeAsesmenHtml(siswa.nama || "-")}</td>
    </tr>
  ` : `
    <tr>
      <td class="tempel-no">&nbsp;</td>
      <td class="tempel-kelas">&nbsp;</td>
      <td class="tempel-nama">&nbsp;</td>
    </tr>
  `).join("");
}

function renderTempelKacaStudentTable(entry, label) {
  if (!entry) return `<section class="tempel-student-panel tempel-student-panel-empty"></section>`;

  return `
    <section class="tempel-student-panel">
      <table>
        <thead>
          <tr>
            <th class="tempel-no">No</th>
            <th class="tempel-kelas">Kelas</th>
            <th class="tempel-nama">Nama</th>
          </tr>
        </thead>
        <tbody>${renderTempelKacaRows(entry?.students || [])}</tbody>
      </table>
    </section>
  `;
}

function renderDataMapRows(students = [], totalRows = 20) {
  return Array.from({ length: totalRows }, (_, index) => students[index] || null).map((siswa, index) => siswa ? `
    <tr>
      <td class="data-map-no">${index + 1}</td>
      <td class="data-map-number">${escapeAsesmenHtml(getAsesmenNomorUjian(siswa) || "-")}</td>
      <td class="data-map-name">${escapeAsesmenHtml(siswa.nama || "-")}</td>
      <td class="data-map-class">${escapeAsesmenHtml(siswa.kelasParts?.kelas || "-")}</td>
    </tr>
  ` : `
    <tr>
      <td class="data-map-no">&nbsp;</td>
      <td class="data-map-number">&nbsp;</td>
      <td class="data-map-name">&nbsp;</td>
      <td class="data-map-class">&nbsp;</td>
    </tr>
  `).join("");
}

function renderDataMapTable(entry) {
  if (!entry) return `<section class="data-map-panel data-map-panel-empty"></section>`;

  return `
    <section class="data-map-panel">
      <table class="data-map-table">
        <thead>
          <tr>
            <th class="data-map-no">No</th>
            <th class="data-map-number">Nomor Peserta</th>
            <th class="data-map-name">Nama</th>
            <th class="data-map-class">Kelas</th>
          </tr>
        </thead>
        <tbody>${renderDataMapRows(entry.students || [], 20)}</tbody>
      </table>
    </section>
  `;
}

function renderDataMapPage(roomNumber, entries) {
  const sortedEntries = [...entries].sort((a, b) => Number(b.level) - Number(a.level));
  const leftEntry = sortedEntries[0] || null;
  const rightEntry = sortedEntries[1] || null;

  return `
    <section class="data-map-page">
      <div class="data-map-sheet">
        <header class="data-map-header">
          <h1>DAFTAR NAMA PESERTA ASESMEN</h1>
          <div>Ruang : ${escapeAsesmenHtml(roomNumber)}</div>
        </header>
        <div class="data-map-grid">
          ${renderDataMapTable(leftEntry)}
          ${renderDataMapTable(rightEntry)}
        </div>
      </div>
    </section>
  `;
}

function getDenahSeatNumbers() {
  return [
    [20, 19, 18, 17],
    [13, 14, 15, 16],
    [12, 11, 10, 9],
    [5, 6, 7, 8],
    [4, 3, 2, 1]
  ];
}

function getDenahSeatDirections() {
  return [
    ["left", "left", "left", "left"],
    ["right", "right", "right", "up"],
    ["up", "left", "left", "left"],
    ["right", "right", "right", "up"],
    ["up", "left", "left", "start"]
  ];
}

function getDenahSeatData(entries = [], seatNumber) {
  const sortedEntries = [...entries].sort((a, b) => Number(a.level) - Number(b.level));
  return sortedEntries.map(entry => ({
    level: String(entry.level || ""),
    student: entry.students?.[seatNumber - 1] || null
  }));
}

function getKepangawasanExamType() {
  try {
    const parsed = JSON.parse(localStorage.getItem("kepangawasanAsesmenState") || "{}");
    const examType = String(parsed?.examType || "").trim();
    return examType || "Asesmen Sumatif";
  } catch {
    return "Asesmen Sumatif";
  }
}

function getActiveSchoolYearLabel() {
  if (typeof window.getActiveSemesterContext === "function") {
    const active = window.getActiveSemesterContext() || {};
    const tahun = String(active?.tahun || "").trim();
    if (tahun) return tahun;
  }
  return "2024/2025";
}

function renderDenahSeat(entryData, seatNumber, direction) {
  const topEntry = entryData[0] || { level: "", student: null };
  const bottomEntry = entryData[1] || { level: "", student: null };
  const topName = topEntry.student?.nama || "";
  const bottomName = bottomEntry.student?.nama || "";
  const topLabel = topName ? topName : "&nbsp;";
  const bottomLabel = bottomName ? bottomName : "&nbsp;";
  const seatModifier = !topName && !bottomName ? " denah-seat-empty" : "";
  const arrowMap = {
    left: "\u2190",
    right: "\u2192",
    up: "\u2191",
    start: "AWAL"
  };
  const arrowText = arrowMap[direction] || "";
  const arrowClass = direction === "start" ? " denah-arrow-start" : "";

  return `
    <div class="denah-seat-wrap">
      <div class="denah-seat${seatModifier}">
        <div class="denah-seat-number">${seatNumber}</div>
        <div class="denah-seat-body">
          <div class="denah-seat-half denah-seat-top">
            <span>${topName ? escapeAsesmenHtml(topLabel) : topLabel}</span>
          </div>
          <div class="denah-seat-half denah-seat-bottom">
            <span>${bottomName ? escapeAsesmenHtml(bottomLabel) : bottomLabel}</span>
          </div>
        </div>
      </div>
      ${arrowText ? `<div class="denah-arrow denah-arrow-${escapeAsesmenHtml(direction)}${arrowClass}">${escapeAsesmenHtml(arrowText)}</div>` : ""}
    </div>
  `;
}

function renderDenahGrid(entries = []) {
  const seatRows = getDenahSeatNumbers();
  const directionRows = getDenahSeatDirections();
  return `
    <div class="denah-grid">
      ${seatRows.map((row, rowIndex) => `
        <div class="denah-grid-row">
          ${row.map((seatNumber, colIndex) => renderDenahSeat(getDenahSeatData(entries, seatNumber), seatNumber, directionRows[rowIndex][colIndex])).join("")}
        </div>
      `).join("")}
      <div class="denah-board">PAPAN TULIS</div>
    </div>
  `;
}

function renderDenahLegend(entries = []) {
  const sortedLevels = [...new Set(entries.map(entry => String(entry.level || "").trim()).filter(Boolean))]
    .sort((a, b) => Number(b) - Number(a));
  const firstLevel = sortedLevels[0] || "";
  const secondLevel = sortedLevels[1] || "";
  return `
    <div class="denah-legend">
      <strong>Ket:</strong>
      <div class="denah-legend-row">
        <span class="denah-legend-stack">
          <span class="denah-legend-box denah-legend-top"></span>
          <span class="denah-legend-box denah-legend-bottom"></span>
        </span>
        <span class="denah-legend-labels">
          <span>${firstLevel ? `: KELAS ${escapeAsesmenHtml(firstLevel)}` : "&nbsp;"}</span>
          <span>${secondLevel ? `: KELAS ${escapeAsesmenHtml(secondLevel)}` : "&nbsp;"}</span>
        </span>
      </div>
    </div>
  `;
}

function renderDenahPesertaPage(roomNumber, entries) {
  const jenisUjian = getKepangawasanExamType();
  const tahunPelajaran = getActiveSchoolYearLabel();
  const logoSekolahUrl = new URL("img/logo_sekolah.png", window.location.href).href;

  return `
    <section class="denah-page">
      <div class="denah-sheet">
        <aside class="denah-side">
          <div class="denah-side-head">
            <img src="${escapeAsesmenHtml(logoSekolahUrl)}" alt="Logo Sekolah">
            <div class="denah-side-title">
              <strong>DENAH DUDUK PESERTA</strong>
              <strong>${escapeAsesmenHtml(jenisUjian)}</strong>
              <strong>${escapeAsesmenHtml(tahunPelajaran)}</strong>
            </div>
          </div>
          <div class="denah-room-panel">
            <div class="denah-room-label">Ruang :</div>
            <div class="denah-room-value">${escapeAsesmenHtml(roomNumber)}</div>
          </div>
          ${renderDenahLegend(entries)}
        </aside>
        <div class="denah-main">
          ${renderDenahGrid(entries)}
        </div>
      </div>
    </section>
  `;
}

function getDenahPesertaPrintHtml() {
  const roomMap = getCombinedAsesmenRoomMap();
  const pages = Array.from(roomMap.entries()).map(([roomNumber, entries]) => renderDenahPesertaPage(roomNumber, entries)).join("");

  return `
    <!doctype html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Denah Peserta</title>
      <style>
        * { box-sizing: border-box; }
        body { margin: 0; background: #ffffff; color: #111827; font-family: Arial, Helvetica, sans-serif; }
        .denah-page {
          width: 100%;
          height: 210mm;
          padding: 6mm;
          page-break-after: always;
          break-after: page;
          overflow: hidden;
        }
        .denah-page:last-child { page-break-after: auto; break-after: auto; }
        .denah-sheet {
          height: calc(210mm - 12mm);
          border: 1.3px solid #111827;
          display: grid;
          grid-template-columns: 27.5% 72.5%;
          overflow: hidden;
          background: #ffffff;
        }
        .denah-side {
          border-right: 1.3px solid #111827;
          padding: 4.2mm 3.6mm 3.4mm;
          display: grid;
          grid-template-rows: auto 1fr auto;
          gap: 3.1mm;
        }
        .denah-side-head {
          display: grid;
          grid-template-columns: 50px minmax(0, 1fr);
          gap: 8px;
          align-items: start;
        }
        .denah-side-head img {
          width: 42px;
          height: 42px;
          object-fit: contain;
          margin-top: 4px;
        }
        .denah-side-title {
          display: grid;
          gap: 4px;
          padding: 4px 0 0 9px;
          border-left: 2.2px solid #111827;
          font-size: 15px;
          line-height: 1.2;
          text-transform: uppercase;
        }
        .denah-side-title strong:first-child {
          font-size: 18px;
        }
        .denah-room-panel {
          width: 100%;
          border: 1.3px solid #111827;
          display: grid;
          grid-template-rows: auto 1fr;
          align-self: center;
          overflow: hidden;
        }
        .denah-room-label {
          padding: 6mm 3mm 5mm;
          border-bottom: 1.3px solid #111827;
          text-align: center;
          font-size: 24px;
          font-weight: 800;
        }
        .denah-room-value {
          min-height: 66mm;
          display: grid;
          place-items: center;
          font-size: 150px;
          font-weight: 900;
          line-height: 0.8;
          letter-spacing: -5px;
          padding: 2mm 1mm 2mm;
          overflow: hidden;
        }
        .denah-legend {
          display: grid;
          gap: 2mm;
          font-size: 18px;
          font-weight: 700;
        }
        .denah-legend > strong {
          font-size: 18px;
        }
        .denah-legend-row {
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }
        .denah-legend-stack {
          display: grid;
          width: 78px;
          border: 1px solid #111827;
        }
        .denah-legend-box {
          width: 100%;
          height: 18px;
          display: inline-block;
        }
        .denah-legend-top { background: #ffffff; }
        .denah-legend-bottom {
          background: #e1e1e1;
          border-top: 1px solid #111827;
        }
        .denah-legend-labels {
          display: grid;
          gap: 12px;
          padding-top: 2px;
          font-size: 18px;
          line-height: 1;
        }
        .denah-main {
          padding: 3.4mm 3.4mm 3mm;
          display: grid;
        }
        .denah-grid {
          display: grid;
          grid-template-rows: repeat(5, 1fr) auto;
          gap: 2.35mm;
          height: 100%;
        }
        .denah-grid-row {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 2.35mm;
          align-items: center;
        }
        .denah-seat-wrap {
          display: grid;
          gap: 0.55mm;
          justify-items: center;
        }
        .denah-seat {
          width: 100%;
          min-width: 0;
          border: 1.25px solid #111827;
          display: grid;
          grid-template-columns: 26px minmax(0, 1fr);
          background: #ffffff;
          overflow: hidden;
          height: 28.2mm;
        }
        .denah-seat-empty {
          opacity: 1;
        }
        .denah-seat-number {
          border-right: 1.25px solid #111827;
          display: grid;
          place-items: center;
          font-size: 11px;
          font-weight: 900;
          background: #ffffff;
        }
        .denah-seat-body {
          display: grid;
          grid-template-rows: 1fr 1fr;
          height: 100%;
        }
        .denah-seat-half {
          display: grid;
          grid-template-rows: 1fr;
          align-content: center;
          align-items: center;
          justify-items: center;
          padding: 3px 4px;
          text-align: center;
          line-height: 1.04;
          min-height: 0;
          overflow: hidden;
        }
        .denah-seat-half span {
          display: -webkit-box;
          width: 100%;
          max-height: 100%;
          overflow: hidden;
          align-self: center;
          font-size: 4.35mm;
          font-weight: 800;
          text-transform: uppercase;
          line-height: 1.03;
          word-break: break-word;
          overflow-wrap: anywhere;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 3;
        }
        .denah-seat-top {
          background: #ffffff;
          border-bottom: 1.1px solid #111827;
        }
        .denah-seat-bottom {
          background: #e1e1e1;
        }
        .denah-arrow {
          min-height: 15px;
          color: #fb923c;
          font-size: 22px;
          font-weight: 900;
          line-height: 0.9;
          text-align: center;
          text-shadow: 0 0 0 #c2410c;
        }
        .denah-arrow-start {
          min-width: 58px;
          padding: 2px 10px;
          border: 1px solid #c2410c;
          background: #fb923c;
          color: #ffffff;
          font-size: 10px;
          border-radius: 0;
          letter-spacing: 0.3px;
        }
        .denah-board {
          width: 66%;
          margin: 0 auto;
          border: 1.2px solid #111827;
          background: #d4d4d4;
          text-align: center;
          font-size: 10.2px;
          font-weight: 800;
          padding: 1px 0;
          letter-spacing: 0.3px;
        }
        @page {
          size: A4 landscape;
          margin: 0;
        }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      </style>
    </head>
    <body>${pages}</body>
    </html>
  `;
}

function getDataMapPrintHtml() {
  const roomMap = getCombinedAsesmenRoomMap();
  const pages = Array.from(roomMap.entries()).map(([roomNumber, entries]) => renderDataMapPage(roomNumber, entries)).join("");

  return `
    <!doctype html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Data Map</title>
      <style>
        * { box-sizing: border-box; }
        body { margin: 0; background: #ffffff; color: #111827; font-family: Arial, Helvetica, sans-serif; }
        .data-map-page {
          width: 100%;
          height: 210mm;
          padding: 8mm 10mm;
          page-break-after: always;
          break-after: page;
          background: #ffffff;
          overflow: hidden;
        }
        .data-map-page:last-child { page-break-after: auto; break-after: auto; }
        .data-map-sheet {
          width: 100%;
          height: calc(210mm - 16mm);
          border: 1.3px solid #4b5563;
          padding: 6mm 6mm 5mm;
          overflow: hidden;
        }
        .data-map-header {
          margin-bottom: 5mm;
          text-align: center;
          line-height: 1.25;
        }
        .data-map-header h1 {
          margin: 0 0 1.5mm;
          font-size: 17px;
          font-weight: 800;
          letter-spacing: 0.2px;
        }
        .data-map-header div {
          font-size: 15px;
          font-weight: 700;
        }
        .data-map-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 5mm;
          align-items: start;
        }
        .data-map-panel {
          min-width: 0;
        }
        .data-map-panel-empty {
          visibility: hidden;
        }
        .data-map-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          font-size: 10.5px;
        }
        .data-map-table th,
        .data-map-table td {
          border: 1px solid #52525b;
          padding: 3px 6px;
          vertical-align: middle;
        }
        .data-map-table thead th {
          height: 10mm;
          font-size: 9.6px;
          font-weight: 800;
          text-transform: uppercase;
          background: #ffffff;
          color: #111827;
          white-space: nowrap;
        }
        .data-map-table tbody tr {
          height: 7.4mm;
        }
        .data-map-no {
          width: 28px;
          text-align: center;
        }
        .data-map-number {
          width: 98px;
          text-align: center;
          white-space: nowrap;
        }
        .data-map-name {
          text-align: left;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: clip;
        }
        .data-map-class {
          width: 48px;
          text-align: center;
          white-space: nowrap;
        }
        @page {
          size: A4 landscape;
          margin: 0;
        }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      </style>
    </head>
    <body>${pages}</body>
    </html>
  `;
}

function renderTempelKacaPage(roomNumber, entries) {
  const sortedEntries = [...entries].sort((a, b) => Number(b.level) - Number(a.level));
  const highEntry = sortedEntries[0] || null;
  const lowEntry = sortedEntries[1] || null;
  const singleEntryClass = lowEntry ? "" : " tempel-kaca-page-single";
  const jenisUjian = getKepangawasanExamType();
  const tahunPelajaran = getActiveSchoolYearLabel();
  const logoPemdaUrl = new URL("img/logo_pemda.png", window.location.href).href;
  const logoSekolahUrl = new URL("img/logo_sekolah.png", window.location.href).href;

  return `
    <section class="tempel-kaca-page${singleEntryClass}">
      <div class="tempel-room-id-panel">
        <div class="tempel-kop">
          <div class="tempel-kop-head">
            <img src="${escapeAsesmenHtml(logoPemdaUrl)}" alt="Logo Pemda">
            <div class="tempel-kop-text">
              <span class="tempel-kop-top">PEMERINTAH KABUPATEN JEMBER</span>
              <strong>SMP NEGERI 1 UMBULSARI</strong>
              <small>Jl. Pb. Sudirman 12 - (0336) 321441 Gunungsari - Umbulsari - Jember</small>
            </div>
            <img src="${escapeAsesmenHtml(logoSekolahUrl)}" alt="Logo Sekolah">
          </div>
          <div class="tempel-kop-divider"></div>
          <div class="tempel-kop-title">
            <span>DAFTAR PESERTA</span>
            <span>${escapeAsesmenHtml(jenisUjian)}</span>
            <span>TAHUN PELAJARAN ${escapeAsesmenHtml(tahunPelajaran)}</span>
          </div>
        </div>
        <div class="tempel-room-label">RUANG :</div>
        <div class="tempel-room-box">
          <strong>${escapeAsesmenHtml(roomNumber)}</strong>
        </div>
      </div>
      ${renderTempelKacaStudentTable(highEntry, `Kelas ${highEntry?.level || ""}`)}
      ${lowEntry ? renderTempelKacaStudentTable(lowEntry, `Kelas ${lowEntry.level}`) : ""}
    </section>
  `;
}

function getTempelKacaPrintHtml() {
  const roomMap = getCombinedAsesmenRoomMap();
  const pages = Array.from(roomMap.entries()).map(([roomNumber, entries]) => renderTempelKacaPage(roomNumber, entries)).join("");
  const baseHref = window.location.href;
  const logoPemdaUrl = new URL("img/logo_pemda.png", window.location.href).href;
  const logoSekolahUrl = new URL("img/logo_sekolah.png", window.location.href).href;

  return `
    <!doctype html>
    <html>
    <head>
      <meta charset="utf-8">
      <base href="${escapeAsesmenHtml(baseHref)}">
      <title>Tempel Kaca</title>
      <style>
        * { box-sizing: border-box; }
        body { margin: 0; background: #ffffff; color: #111827; font-family: Arial, Helvetica, sans-serif; }
        .tempel-print-toolbar {
          position: sticky;
          top: 0;
          z-index: 10;
          display: flex;
          justify-content: flex-end;
          padding: 10px 12px 0;
          background: #ffffff;
        }
        .tempel-print-toolbar button {
          min-height: 38px;
          padding: 8px 14px;
          border: 1px solid #0e7490;
          border-radius: 999px;
          background: #0e7490;
          color: #ffffff;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
        }
        .tempel-kaca-page {
          width: 100%;
          min-height: calc(210mm - 10mm);
          display: grid;
          grid-template-columns: 42.5% 28.75% 28.75%;
          gap: 10px;
          border: 1.2px solid #111827;
          padding: 10px;
          page-break-after: always;
          break-after: page;
          overflow: hidden;
          background: #ffffff;
        }
        .tempel-kaca-page-single {
          grid-template-columns: 42.5% 57.5%;
        }
        .tempel-kaca-page:last-child { page-break-after: auto; break-after: auto; }
        .tempel-room-id-panel,
        .tempel-student-panel {
          min-width: 0;
          border: 1px solid #1f2937;
          border-radius: 10px;
          overflow: hidden;
          background: #ffffff;
          box-shadow: inset 0 0 0 0.45px rgba(148, 163, 184, 0.55);
        }
        .tempel-room-id-panel {
          display: grid;
          grid-template-rows: auto auto 1fr;
          padding: 10px 14px 12px;
          background:
            linear-gradient(180deg, rgba(248, 250, 252, 0.98) 0%, rgba(255, 255, 255, 1) 18%);
        }
        .tempel-kop {
          display: grid;
          gap: 12px;
          text-align: center;
          font-family: "Segoe UI", "Trebuchet MS", Arial, sans-serif;
        }
        .tempel-kop-head {
          display: grid;
          grid-template-columns: 58px minmax(0, 1fr) 58px;
          gap: 8px;
          align-items: center;
        }
        .tempel-kop-head img {
          width: 52px;
          height: 52px;
          object-fit: contain;
          justify-self: center;
        }
        .tempel-kop-text {
          display: grid;
          gap: 4px;
          text-align: center;
          line-height: 1.14;
        }
        .tempel-kop-top {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.35px;
          color: #1f2937;
        }
        .tempel-kop-text strong {
          font-size: 16px;
          font-weight: 800;
          letter-spacing: 0.25px;
        }
        .tempel-kop-text small {
          font-size: 8px;
          font-weight: 600;
          color: #475569;
        }
        .tempel-kop-divider {
          height: 1.5px;
          background: linear-gradient(90deg, #0f172a 0%, #334155 48%, #0f172a 100%);
        }
        .tempel-kop-title {
          display: grid;
          gap: 8px;
          justify-items: center;
          padding: 16px 8px 24px;
          text-align: center;
          line-height: 1.2;
        }
        .tempel-kop-title span {
          font-size: 18px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.45px;
          color: #111827;
        }
        .tempel-kop-title span:first-child {
          font-size: 26px;
          margin-bottom: 4px;
          letter-spacing: 0.65px;
        }
        .tempel-kop-title span:nth-child(2),
        .tempel-kop-title span:nth-child(3) {
          font-size: 18px;
        }
        .tempel-room-label {
          padding: 6px 0 6px;
          text-align: center;
          font-size: 34px;
          font-weight: 800;
          letter-spacing: 0.5px;
          color: #0f172a;
        }
        .tempel-room-box {
          align-self: center;
          margin: 0 auto;
          width: 100%;
          min-height: 290px;
          display: grid;
          place-items: center;
          border: 1.15px solid #1f2937;
          border-radius: 12px;
          text-align: center;
          padding: 12px;
          background:
            linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
          box-shadow: inset 0 0 0 0.8px rgba(148, 163, 184, 0.28);
        }
        .tempel-room-box strong {
          display: block;
          font-size: 190px;
          line-height: 0.9;
          font-weight: 900;
          color: #020617;
          letter-spacing: -2px;
        }
        table {
          width: 100%;
          height: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          font-size: 12px;
          font-family: "Segoe UI", "Trebuchet MS", Arial, sans-serif;
        }
        th, td {
          border: 1px solid #334155;
          padding: 3px 7px;
          vertical-align: middle;
        }
        th {
          font-size: 10px;
          background: linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%);
          color: #0f172a;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.35px;
          height: 28px;
        }
        tbody tr {
          height: 24px;
          background: #ffffff;
        }
        tbody tr:nth-child(even) {
          background: #fbfdff;
        }
        .tempel-no { width: 26px; text-align: center; }
        .tempel-kelas {
          width: 40px;
          text-align: center;
          font-weight: 800;
          font-size: 12px;
          color: #1e3a8a;
          white-space: nowrap;
        }
        .tempel-nama {
          text-align: left;
          font-size: 12px;
          font-weight: 700;
          color: #111827;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: clip;
        }
        .tempel-empty { text-align: center; color: #6b7280; }
        .tempel-student-panel-empty { background: #ffffff; border-color: transparent; }
        @page { size: A4 landscape; margin: 5mm; }
        @media print {
          .tempel-print-toolbar { display: none; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      </style>
    </head>
    <body data-logo-pemda="${escapeAsesmenHtml(logoPemdaUrl)}" data-logo-sekolah="${escapeAsesmenHtml(logoSekolahUrl)}">
      <div class="tempel-print-toolbar">
        <button type="button" onclick="window.print()">Print / Simpan PDF</button>
      </div>
      ${pages}
    </body>
    </html>
  `;
}

function exportTempelKacaPDF() {
  const roomMap = getCombinedAsesmenRoomMap();
  if (roomMap.size === 0) {
    Swal.fire("Belum ada ruang", "Set panel kelas dan ruang ujian terlebih dahulu di menu Pembagian Ruang.", "warning");
    return;
  }

  const html = getTempelKacaPrintHtml();
  if (window.AppPrint?.openHtml) {
    window.AppPrint.openHtml(html, {
      documentTitle: "Tempel Kaca",
      popupBlockedTitle: "Popup diblokir",
      popupBlockedMessage: "Izinkan popup browser untuk export PDF.",
      autoPrint: true,
      printDelayMs: 450,
      fallbackDelayMs: 1000
    });
    return;
  }

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    Swal.fire("Popup diblokir", "Izinkan popup browser untuk export PDF.", "warning");
    return;
  }
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 450);
}

function exportDataMapPDF() {
  const roomMap = getCombinedAsesmenRoomMap();
  if (roomMap.size === 0) {
    Swal.fire("Belum ada ruang", "Set panel kelas dan ruang ujian terlebih dahulu di menu Pembagian Ruang.", "warning");
    return;
  }

  const html = getDataMapPrintHtml();
  if (window.AppPrint?.openHtml) {
    window.AppPrint.openHtml(html, {
      documentTitle: "Data Map",
      popupBlockedTitle: "Popup diblokir",
      popupBlockedMessage: "Izinkan popup browser untuk export PDF.",
      autoPrint: true,
      printDelayMs: 450,
      fallbackDelayMs: 1000
    });
    return;
  }

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    Swal.fire("Popup diblokir", "Izinkan popup browser untuk export PDF.", "warning");
    return;
  }
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 450);
}

function exportDenahPesertaPDF() {
  const roomMap = getCombinedAsesmenRoomMap();
  if (roomMap.size === 0) {
    Swal.fire("Belum ada ruang", "Set panel kelas dan ruang ujian terlebih dahulu di menu Pembagian Ruang.", "warning");
    return;
  }

  const html = getDenahPesertaPrintHtml();
  if (window.AppPrint?.openHtml) {
    window.AppPrint.openHtml(html, {
      documentTitle: "Denah Peserta",
      popupBlockedTitle: "Popup diblokir",
      popupBlockedMessage: "Izinkan popup browser untuk export PDF.",
      autoPrint: true,
      printDelayMs: 450,
      fallbackDelayMs: 1000
    });
    return;
  }

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    Swal.fire("Popup diblokir", "Izinkan popup browser untuk export PDF.", "warning");
    return;
  }
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 450);
}

function renderAsesmenRoomArrangement() {
  const container = document.getElementById("asesmenRoomArrangement");
  if (!container) return;

  const roomMap = getCombinedAsesmenRoomMap();
  if (roomMap.size === 0) {
    const nextHtml = `<div class="empty-panel">Isi ruang yang digunakan untuk melihat susunan ruang.</div>`;
    if (nextHtml !== lastAsesmenRoomArrangementHtml || !container.children.length) {
      container.innerHTML = nextHtml;
      lastAsesmenRoomArrangementHtml = nextHtml;
    }
    return;
  }

  const nextHtml = `
    <div class="asesmen-combined-room-list">
      ${Array.from(roomMap.entries()).map(([roomNumber, entries]) => {
        const sortedEntries = [...entries].sort((a, b) => Number(b.level) - Number(a.level));
        const warning = sortedEntries.length > 2
          ? `<div class="asesmen-warning">Ruang ini dipakai ${sortedEntries.length} jenjang. Maksimal dua jenjang.</div>`
          : "";
        return `
          <article class="asesmen-combined-room-card">
            <div class="asesmen-room-card-head">
              <strong>Ruang ${escapeAsesmenHtml(roomNumber)}</strong>
              <span>${sortedEntries.reduce((sum, entry) => sum + entry.students.length, 0)} siswa</span>
            </div>
            ${warning}
            <div class="asesmen-room-pair">
              ${sortedEntries.map(renderAsesmenStudentColumn).join("")}
            </div>
          </article>
        `;
      }).join("")}
    </div>
  `;
  if (nextHtml !== lastAsesmenRoomArrangementHtml || !container.children.length) {
    container.innerHTML = nextHtml;
    lastAsesmenRoomArrangementHtml = nextHtml;
  }
}

window.setAsesmenLevelEnabled = setAsesmenLevelEnabled;
window.setAsesmenPageTab = setAsesmenPageTab;
window.renderKepersetaanPage = renderKepersetaanPage;
window.exportTempelKacaPDF = exportTempelKacaPDF;
window.exportDataMapPDF = exportDataMapPDF;
window.exportDenahPesertaPDF = exportDenahPesertaPDF;
