(function initKalenderPendidikanModule(global) {
  if (global.renderKalenderPendidikanPage) return;

  const STORAGE_KEY = "kalenderPendidikanState";
  const DOC_PATH = { collection: "settings", doc: "kalender_pendidikan" };
  const SCHOOL_IDENTITY = {
    pemerintah: "PEMERINTAH KABUPATEN JEMBER",
    sekolah: "SMP NEGERI 1 UMBULSARI",
    alamat: "Jl. PB. Sudirman 13, Umbulsari, Jember",
    kontak: "Telp. (0336) 231441",
    email: "smpn1umbulsari@yahoo.com"
  };
  const WEEKDAY_LABELS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
  const MONTH_SEQUENCE = [
    { month: 7, label: "Juli" },
    { month: 8, label: "Agustus" },
    { month: 9, label: "September" },
    { month: 10, label: "Oktober" },
    { month: 11, label: "November" },
    { month: 12, label: "Desember" },
    { month: 1, label: "Januari" },
    { month: 2, label: "Februari" },
    { month: 3, label: "Maret" },
    { month: 4, label: "April" },
    { month: 5, label: "Mei" },
    { month: 6, label: "Juni" }
  ];
  const FIXED_EVENTS = [
    { id: "new-year", name: "Tahun Baru Masehi", month: 1, day: 1, category: "Libur Nasional Tetap", holiday: true, active: true, note: "Tanggal tetap setiap tahun." },
    { id: "labour-day", name: "Hari Buruh Internasional", month: 5, day: 1, category: "Libur Nasional Tetap", holiday: true, active: true, note: "Tanggal tetap setiap tahun." },
    { id: "hardiknas", name: "Hari Pendidikan Nasional", month: 5, day: 2, category: "Hari Penting Pendidikan", holiday: false, active: true, note: "Peringatan pendidikan nasional, bukan hari libur." },
    { id: "national-awakening", name: "Hari Kebangkitan Nasional", month: 5, day: 20, category: "Hari Penting Pendidikan", holiday: false, active: false, note: "Sering dipakai untuk kegiatan sekolah atau upacara." },
    { id: "pancasila", name: "Hari Lahir Pancasila", month: 6, day: 1, category: "Libur Nasional Tetap", holiday: true, active: true, note: "Tanggal tetap setiap tahun." },
    { id: "child-day", name: "Hari Anak Nasional", month: 7, day: 23, category: "Hari Penting Pendidikan", holiday: false, active: false, note: "Cocok untuk agenda sekolah/OSIS." },
    { id: "scout-day", name: "Hari Pramuka", month: 8, day: 14, category: "Hari Penting Pendidikan", holiday: false, active: false, note: "Cocok untuk agenda kepramukaan." },
    { id: "independence-day", name: "Hari Kemerdekaan Republik Indonesia", month: 8, day: 17, category: "Libur Nasional Tetap", holiday: true, active: true, note: "Tanggal tetap setiap tahun." },
    { id: "literacy-day", name: "Hari Aksara Internasional", month: 9, day: 8, category: "Hari Penting Pendidikan", holiday: false, active: false, note: "Relevan untuk literasi dan perpustakaan." },
    { id: "youth-pledge", name: "Hari Sumpah Pemuda", month: 10, day: 28, category: "Hari Penting Pendidikan", holiday: false, active: false, note: "Sering dipakai untuk kegiatan sekolah." },
    { id: "teacher-day", name: "Hari Guru Nasional", month: 11, day: 25, category: "Hari Penting Pendidikan", holiday: false, active: true, note: "Peringatan guru nasional, bukan hari libur." },
    { id: "christmas", name: "Hari Raya Natal", month: 12, day: 25, category: "Libur Nasional Tetap", holiday: true, active: true, note: "Tanggal tetap setiap tahun." }
  ];
  const DEFAULT_SCHOOL_EVENTS = [
    { id: "mpls", name: "MPLS / Masa Pengenalan Lingkungan Sekolah", panel: "kegiatan-sekolah", category: "Kegiatan Sekolah", startDate: "", endDate: "", active: false, note: "Isi rentang tanggal sesuai jadwal sekolah." },
    { id: "libur-jeda-ganjil", name: "Libur Jeda Tengah Semester Ganjil", panel: "libur-sekolah", category: "Libur Sekolah", startDate: "", endDate: "", active: false, note: "Isi jika sekolah menetapkan libur jeda." },
    { id: "pts-ganjil", name: "Penilaian Tengah Semester Ganjil", panel: "kegiatan-sekolah", category: "Ujian", startDate: "", endDate: "", active: false, note: "Pilih tanggal awal dan akhir pelaksanaan." },
    { id: "pas-ganjil", name: "Penilaian Akhir Semester Ganjil", panel: "kegiatan-sekolah", category: "Ujian", startDate: "", endDate: "", active: false, note: "Pilih tanggal awal dan akhir pelaksanaan." },
    { id: "rapor-ganjil", name: "Pembagian Rapor Semester Ganjil", panel: "kegiatan-sekolah", category: "Kegiatan Sekolah", startDate: "", endDate: "", active: false, note: "Gunakan rentang jika ada beberapa hari layanan." },
    { id: "libur-semester-ganjil", name: "Libur Semester Ganjil", panel: "libur-sekolah", category: "Libur Sekolah", startDate: "", endDate: "", active: false, note: "Pilih awal dan akhir libur semester." },
    { id: "pts-genap", name: "Penilaian Tengah Semester Genap", panel: "kegiatan-sekolah", category: "Ujian", startDate: "", endDate: "", active: false, note: "Pilih tanggal awal dan akhir pelaksanaan." },
    { id: "pat", name: "Penilaian Akhir Tahun / Sumatif Akhir", panel: "kegiatan-sekolah", category: "Ujian", startDate: "", endDate: "", active: false, note: "Pilih tanggal awal dan akhir pelaksanaan." },
    { id: "asesmen-sekolah", name: "Asesmen Sekolah / Ujian Akhir", panel: "kegiatan-sekolah", category: "Ujian", startDate: "", endDate: "", active: false, note: "Pilih tanggal awal dan akhir pelaksanaan." },
    { id: "class-meeting", name: "Class Meeting", panel: "kegiatan-sekolah", category: "Kegiatan Sekolah", startDate: "", endDate: "", active: false, note: "Pilih rentang tanggal kegiatan." },
    { id: "rapor-genap", name: "Pembagian Rapor Semester Genap", panel: "kegiatan-sekolah", category: "Kegiatan Sekolah", startDate: "", endDate: "", active: false, note: "Gunakan rentang jika ada beberapa hari layanan." },
    { id: "libur-semester-genap", name: "Libur Semester Genap", panel: "libur-sekolah", category: "Libur Sekolah", startDate: "", endDate: "", active: false, note: "Pilih awal dan akhir libur semester." },
    { id: "fakultatif-kolaborasi", name: "Pekan Efektif Fakultatif", panel: "minggu-efektif-fakultatif", category: "Minggu Efektif Fakultatif", startDate: "", endDate: "", active: false, note: "Isi rentang tanggal khusus untuk pekan efektif fakultatif." },
    { id: "fakultatif-ujian", name: "Ujian", panel: "minggu-efektif-fakultatif", category: "Minggu Efektif Fakultatif", startDate: "", endDate: "", active: false, note: "Isi rentang tanggal pelaksanaan ujian." },
    { id: "fakultatif-class-meeting", name: "Class Meeting", panel: "minggu-efektif-fakultatif", category: "Minggu Efektif Fakultatif", startDate: "", endDate: "", active: false, note: "Isi rentang tanggal kegiatan class meeting." },
    { id: "fakultatif-pondok-romadhon", name: "Pondok Romadhon", panel: "minggu-efektif-fakultatif", category: "Minggu Efektif Fakultatif", startDate: "", endDate: "", active: false, note: "Isi rentang tanggal kegiatan pondok romadhon." },
    { id: "fakultatif-p5", name: "P5", panel: "minggu-efektif-fakultatif", category: "Minggu Efektif Fakultatif", startDate: "", endDate: "", active: false, note: "Isi rentang tanggal kegiatan P5." },
    { id: "hari-bumi", name: "Hari Bumi", panel: "hari-penting", category: "Hari Penting Nasional", startDate: "", endDate: "", active: false, note: "Gunakan jika sekolah mengadakan kegiatan tematik lingkungan." }
  ];

  let kalenderState = createDefaultState();
  let kalenderRangeDraft = null;
  let isKalenderSaving = false;
  let kalenderPageTab = "input";

  function createDefaultState() {
    const { startYear, endYear } = parseAcademicYears(getKalenderAcademicYear());
    return {
      tahunPelajaran: getKalenderAcademicYear(),
      semesterStarts: {
        ganjil: `${startYear}-07-14`,
        genap: `${endYear}-01-05`
      },
      workDays: "5",
      signatureModes: {
        kaldik: true,
        rpe: true
      },
      fixedEvents: FIXED_EVENTS.map(item => ({ ...item })),
      schoolEvents: DEFAULT_SCHOOL_EVENTS.map(item => ({ ...item }))
    };
  }

  function getKalenderDocumentsApi() {
    return global.SupabaseDocuments;
  }

  function getKalenderAcademicYear() {
    try {
      const semester = JSON.parse(global.localStorage.getItem("appSemester") || "{}");
      return String(semester?.tahun || "").trim() || "2025/2026";
    } catch {
      return "2025/2026";
    }
  }

  function parseAcademicYears(tahunPelajaran = "") {
    const match = String(tahunPelajaran || "").match(/(\d{4})\s*\/\s*(\d{4})/);
    if (!match) return { startYear: 2025, endYear: 2026 };
    return {
      startYear: Number(match[1]),
      endYear: Number(match[2])
    };
  }

  function makeSchoolEventId() {
    return `school-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  }

  function inferSchoolEventPanel(category = "") {
    const normalized = String(category || "").toLowerCase();
    if (normalized.includes("libur")) return "libur-sekolah";
    if (normalized.includes("fakultatif")) return "minggu-efektif-fakultatif";
    if (normalized.includes("penting")) return "hari-penting";
    return "kegiatan-sekolah";
  }

  function escapeKalenderHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function cloneState(state = {}) {
    const academicYear = String(state.tahunPelajaran || getKalenderAcademicYear()).trim() || getKalenderAcademicYear();
    const { startYear, endYear } = parseAcademicYears(academicYear);
    return {
      tahunPelajaran: academicYear,
      semesterStarts: {
        ganjil: String(state?.semesterStarts?.ganjil || `${startYear}-07-14`).trim(),
        genap: String(state?.semesterStarts?.genap || `${endYear}-01-05`).trim()
      },
      workDays: String(state?.workDays || "5").trim() === "6" ? "6" : "5",
      signatureModes: {
        kaldik: state?.signatureModes?.kaldik !== false,
        rpe: state?.signatureModes?.rpe !== false
      },
      fixedEvents: Array.isArray(state.fixedEvents) ? state.fixedEvents.map(item => ({ ...item })) : [],
      schoolEvents: Array.isArray(state.schoolEvents) ? state.schoolEvents.map(item => ({ ...item })) : []
    };
  }

  function mergeFixedEvents(savedEvents = []) {
    const savedMap = new Map((Array.isArray(savedEvents) ? savedEvents : []).map(item => [String(item.id || "").trim(), item]));
    return FIXED_EVENTS.map(item => {
      const saved = savedMap.get(item.id) || {};
      return {
        ...item,
        active: saved.active === undefined ? item.active : saved.active === true,
        note: String(saved.note || item.note || "").trim() || item.note || ""
      };
    });
  }

  function mergeSchoolEvents(savedEvents = []) {
    const incoming = Array.isArray(savedEvents) && savedEvents.length ? savedEvents : DEFAULT_SCHOOL_EVENTS;
    return incoming.map(item => ({
      id: String(item.id || makeSchoolEventId()).trim(),
      name: String(item.name || "").trim(),
      panel: String(item.panel || inferSchoolEventPanel(item.category)).trim() || "kegiatan-sekolah",
      category: String(item.category || "Kegiatan Sekolah").trim() || "Kegiatan Sekolah",
      startDate: String(item.startDate || item.date || "").trim(),
      endDate: String(item.endDate || item.date || item.startDate || "").trim(),
      active: item.active === true,
      note: String(item.note || "").trim()
    }));
  }

  function normalizeState(raw = {}) {
    const base = cloneState(raw);
    return {
      tahunPelajaran: base.tahunPelajaran,
      semesterStarts: {
        ganjil: String(base?.semesterStarts?.ganjil || "").trim(),
        genap: String(base?.semesterStarts?.genap || "").trim()
      },
      workDays: base.workDays === "6" ? "6" : "5",
      signatureModes: {
        kaldik: base?.signatureModes?.kaldik !== false,
        rpe: base?.signatureModes?.rpe !== false
      },
      fixedEvents: mergeFixedEvents(base.fixedEvents),
      schoolEvents: mergeSchoolEvents(base.schoolEvents)
    };
  }

  function readLocalState() {
    try {
      return normalizeState(JSON.parse(global.localStorage.getItem(STORAGE_KEY) || "{}"));
    } catch {
      return createDefaultState();
    }
  }

  function writeLocalState(state) {
    const normalized = normalizeState(state);
    global.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
  }

  async function loadKalenderPendidikan() {
    if (typeof global.loadKepalaSekolahTtdSettings === "function") {
      try {
        await global.loadKepalaSekolahTtdSettings();
      } catch (error) {
        console.error("Gagal memuat TTD kepala sekolah untuk KALDIK:", error);
      }
    }
    const documentsApi = getKalenderDocumentsApi();
    if (!documentsApi?.collection) {
      kalenderState = readLocalState();
      renderKalenderPendidikanState();
      return kalenderState;
    }
    try {
      const snapshot = await documentsApi.collection(DOC_PATH.collection).doc(DOC_PATH.doc).get();
      kalenderState = normalizeState(snapshot?.exists ? snapshot.data() : readLocalState());
      writeLocalState(kalenderState);
    } catch (error) {
      console.error("Gagal memuat kalender pendidikan:", error);
      kalenderState = readLocalState();
    }
    renderKalenderPendidikanState();
    return kalenderState;
  }

  async function persistKalenderPendidikan() {
    kalenderState = writeLocalState(kalenderState);
    const documentsApi = getKalenderDocumentsApi();
    if (!documentsApi?.collection) return kalenderState;
    await documentsApi.collection(DOC_PATH.collection).doc(DOC_PATH.doc).set({
      ...kalenderState,
      updated_at: new Date().toISOString()
    }, { merge: true });
    return kalenderState;
  }

  function showKalenderToast(message = "Tersimpan", type = "success") {
    if (typeof global.showFloatingToast === "function") {
      global.showFloatingToast(message, type);
      return;
    }
  }

  function resolveFixedEventDate(item, tahunPelajaran) {
    const { startYear, endYear } = parseAcademicYears(tahunPelajaran);
    const month = Number(item.month || 1);
    const day = Number(item.day || 1);
    const year = month >= 7 ? startYear : endYear;
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  function formatDateLabel(dateText = "") {
    if (global.AppUtils?.formatDateId) {
      return global.AppUtils.formatDateId(dateText, {
        weekday: "short",
        day: "2-digit",
        month: "long",
        year: "numeric"
      }, dateText || "-");
    }
    if (!dateText) return "-";
    const date = new Date(`${dateText}T00:00:00`);
    if (Number.isNaN(date.getTime())) return dateText;
    return date.toLocaleDateString("id-ID", {
      weekday: "short",
      day: "2-digit",
      month: "long",
      year: "numeric"
    });
  }

  function toLocalIsoDate(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function formatShortDateLabel(dateText = "") {
    if (global.AppUtils?.formatDateId) {
      return global.AppUtils.formatDateId(dateText, {
        day: "2-digit",
        month: "short",
        year: "numeric"
      }, dateText || "-");
    }
    if (!dateText) return "-";
    const date = new Date(`${dateText}T00:00:00`);
    if (Number.isNaN(date.getTime())) return dateText;
    return date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  }

  function formatDateNoWeekdayLabel(dateText = "") {
    if (global.AppUtils?.formatDateId) {
      return global.AppUtils.formatDateId(dateText, {
        day: "2-digit",
        month: "long",
        year: "numeric"
      }, dateText || "-");
    }
    if (!dateText) return "-";
    const date = new Date(`${dateText}T00:00:00`);
    if (Number.isNaN(date.getTime())) return dateText;
    return date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric"
    });
  }

  function eachDateBetween(startDate = "", endDate = "") {
    if (!startDate) return [];
    const safeEndDate = endDate || startDate;
    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${safeEndDate}T00:00:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];
    const from = start <= end ? start : end;
    const to = start <= end ? end : start;
    const dates = [];
    for (let current = new Date(from); current <= to; current.setDate(current.getDate() + 1)) {
      dates.push(toLocalIsoDate(current));
    }
    return dates;
  }

  function formatDateRangeLabel(startDate = "", endDate = "") {
    if (!startDate && !endDate) return "-";
    if (!startDate || startDate === endDate || !endDate) return formatDateNoWeekdayLabel(startDate || endDate);
    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return `${formatShortDateLabel(startDate)} s.d. ${formatShortDateLabel(endDate)}`;
    }
    const sameYear = start.getFullYear() === end.getFullYear();
    const sameMonth = sameYear && start.getMonth() === end.getMonth();
    if (sameMonth) {
      const monthYear = global.AppUtils?.formatDateId
        ? global.AppUtils.formatDateId(end, { month: "long", year: "numeric" }, formatDateNoWeekdayLabel(endDate))
        : end.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
      return `${String(start.getDate()).padStart(2, "0")} - ${String(end.getDate()).padStart(2, "0")} ${monthYear}`;
    }
    return `${formatDateNoWeekdayLabel(startDate)} s.d. ${formatDateNoWeekdayLabel(endDate)}`;
  }

  function getKaldikRaporSettings() {
    try {
      return JSON.parse(global.localStorage.getItem("raporAdminSettings") || "{}");
    } catch {
      return {};
    }
  }

  function getKaldikPrincipalSignature() {
    if (typeof global.getKepalaSekolahTtdImage === "function") {
      return String(global.getKepalaSekolahTtdImage() || "").trim();
    }
    return "";
  }

  function getKaldikPrincipalInfo() {
    const raporSettings = getKaldikRaporSettings();
    const today = toLocalIsoDate(new Date());
    return {
      nama: String(raporSettings.kepala_nama || "Dra. MAMIK SASMIATI, M.Pd").trim(),
      nip: String(raporSettings.kepala_nip || "19660601 199003 2 010").trim(),
      tanggal: String(raporSettings.tanggal || today).trim(),
      ttd: getKaldikPrincipalSignature()
    };
  }

  function isKalenderSignatureEnabled(mode = "kaldik") {
    const normalizedMode = mode === "rpe" ? "rpe" : "kaldik";
    return kalenderState?.signatureModes?.[normalizedMode] !== false;
  }

  function buildActiveCalendarEntries() {
    const fixed = kalenderState.fixedEvents
      .filter(item => item.active)
      .map(item => ({
        id: item.id,
        name: item.name,
        category: item.category,
        kind: item.holiday ? "Libur" : "Peringatan",
        date: resolveFixedEventDate(item, kalenderState.tahunPelajaran),
        note: item.note || ""
      }));

    const school = kalenderState.schoolEvents
      .filter(item => item.active && (item.startDate || item.endDate))
      .flatMap(item => eachDateBetween(item.startDate, item.endDate).map(date => ({
        id: `${item.id}-${date}`,
        sourceId: item.id,
        name: item.name,
        panel: item.panel || "kegiatan-sekolah",
        category: item.category || "Kegiatan Sekolah",
        kind: item.category || "Kegiatan Sekolah",
        date,
        note: item.note || "",
        rangeStart: item.startDate || date,
        rangeEnd: item.endDate || item.startDate || date
      })));

    return fixed.concat(school).sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));
  }

  function getMonthMetaSequence() {
    const { startYear, endYear } = parseAcademicYears(kalenderState.tahunPelajaran);
    return MONTH_SEQUENCE.map(item => ({
      ...item,
      year: item.month >= 7 ? startYear : endYear
    }));
  }

  function getSemesterMonthSequence(semesterKey = "ganjil") {
    const monthSequence = getMonthMetaSequence();
    return semesterKey === "genap" ? monthSequence.slice(6) : monthSequence.slice(0, 6);
  }

  function getEntriesByDateMap() {
    return buildActiveCalendarEntries().reduce((map, item) => {
      const key = String(item.date || "").trim();
      if (!key) return map;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
      return map;
    }, new Map());
  }

  function getKalenderSchoolEventById(id = "") {
    const targetId = String(id || "").trim();
    if (!targetId) return null;
    return kalenderState.schoolEvents.find(item => String(item.id || "").trim() === targetId) || null;
  }

  function shiftDateLabel(dateText = "", offsetDays = 0) {
    if (!dateText) return "";
    const date = new Date(`${dateText}T00:00:00`);
    if (Number.isNaN(date.getTime())) return "";
    date.setDate(date.getDate() + Number(offsetDays || 0));
    return toLocalIsoDate(date);
  }

  function groupCalendarEntries(items = []) {
    const baseEntriesByDate = getEntriesByDateMap();
    const grouped = [];
    items
      .slice()
      .sort((left, right) => {
        const leftStart = String(left.rangeStart || left.date || "");
        const rightStart = String(right.rangeStart || right.date || "");
        if (leftStart !== rightStart) return leftStart.localeCompare(rightStart);
        const leftEnd = String(left.rangeEnd || left.date || leftStart);
        const rightEnd = String(right.rangeEnd || right.date || rightStart);
        if (leftEnd !== rightEnd) return leftEnd.localeCompare(rightEnd);
        return String(left.name || "").localeCompare(String(right.name || ""));
      })
      .forEach(item => {
        const rangeStart = String(item.rangeStart || item.date || "").trim();
        const rangeEnd = String(item.rangeEnd || item.date || rangeStart).trim();
        const name = String(item.name || "").trim();
        const category = String(item.category || "").trim();
        const kind = String(item.kind || "").trim();
        const existing = grouped.find(entry =>
          entry.name === name &&
          entry.rangeStart === rangeStart &&
          entry.rangeEnd === rangeEnd &&
          entry.category === category &&
          entry.kind === kind
        );
        if (existing) return;
        grouped.push({
          name,
          rangeStart,
          rangeEnd,
          category,
          kind,
          note: String(item.note || "").trim()
        });
      });

    return grouped.reduce((merged, item) => {
      const previous = merged[merged.length - 1];
      const nextDayAfterPrevious = shiftDateLabel(previous?.rangeEnd, 1);
      const gapDates = previous && item
        ? eachDateBetween(nextDayAfterPrevious, shiftDateLabel(item.rangeStart, -1))
        : [];
      const gapCoveredByHolidayOnly = gapDates.length > 0 && gapDates.every(date => {
        const entries = baseEntriesByDate.get(date) || [];
        return entries.length > 0 && entries.every(entry => getEntryKindClass(entry) === "holiday");
      });
      const canMergeWithPrevious = previous
        && previous.name === item.name
        && previous.category === item.category
        && previous.kind === item.kind
        && previous.note === item.note
        && (nextDayAfterPrevious === item.rangeStart || gapCoveredByHolidayOnly);

      if (canMergeWithPrevious) {
        previous.rangeEnd = item.rangeEnd;
        return merged;
      }

      merged.push({ ...item });
      return merged;
    }, []);
  }

  function getSemesterPreviewRanges() {
    const { startYear, endYear } = parseAcademicYears(kalenderState.tahunPelajaran);
    const ganjilStart = String(kalenderState?.semesterStarts?.ganjil || `${startYear}-07-14`).trim();
    const genapStart = String(kalenderState?.semesterStarts?.genap || `${endYear}-01-05`).trim();
    const raporGanjil = getKalenderSchoolEventById("rapor-ganjil");
    const raporGenap = getKalenderSchoolEventById("rapor-genap");
    const liburSemesterGanjil = getKalenderSchoolEventById("libur-semester-ganjil");
    const liburSemesterGenap = getKalenderSchoolEventById("libur-semester-genap");
    const ganjilEnd = String(
      liburSemesterGanjil?.active && liburSemesterGanjil?.startDate
        ? shiftDateLabel(liburSemesterGanjil.startDate, -1)
        : (raporGanjil?.active ? (raporGanjil.endDate || raporGanjil.startDate || "") : "")
    ).trim() || `${startYear}-12-31`;
    const genapEnd = String(
      liburSemesterGenap?.active && liburSemesterGenap?.startDate
        ? shiftDateLabel(liburSemesterGenap.startDate, -1)
        : (raporGenap?.active ? (raporGenap.endDate || raporGenap.startDate || "") : "")
    ).trim() || `${endYear}-06-30`;
    return {
      ganjil: {
        start: ganjilStart,
        end: ganjilEnd
      },
      genap: {
        start: genapStart,
        end: genapEnd
      }
    };
  }

  function buildVirtualSemesterBreakEntries() {
    const baseEntriesByDate = getEntriesByDateMap();
    const monthSequence = getMonthMetaSequence();
    const semesterRanges = getSemesterPreviewRanges();
    const virtualEntries = [];
    const getBreakLabelSemesterKey = (semesterKey, segmentType) => {
      if (segmentType === "before-start") {
        return semesterKey === "ganjil" ? "genap" : "ganjil";
      }
      return semesterKey;
    };

    const buildSegmentEntries = (semesterKey, rangeStart, rangeEnd, segmentType = "after-end") => {
      if (!rangeStart || !rangeEnd || rangeStart > rangeEnd) return;
      const labelSemesterKey = getBreakLabelSemesterKey(semesterKey, segmentType);
      eachDateBetween(rangeStart, rangeEnd).forEach(date => {
        if (baseEntriesByDate.has(date)) return;
        virtualEntries.push({
          id: `virtual-libur-semester-${labelSemesterKey}-${date}`,
          sourceId: `virtual-libur-semester-${labelSemesterKey}`,
          name: `Libur Semester ${labelSemesterKey === "ganjil" ? "Ganjil" : "Genap"}`,
          panel: "libur-sekolah",
          category: "Libur Sekolah",
          kind: "Libur",
          date,
          note: "Dibentuk otomatis dari batas awal dan akhir semester.",
          rangeStart,
          rangeEnd,
          isVirtualSemesterBreak: true
        });
      });
    };

    monthSequence.forEach(meta => {
      const semesterKey = meta.month >= 7 ? "ganjil" : "genap";
      const semesterRange = semesterRanges[semesterKey];
      const startDate = String(semesterRange?.start || "").trim();
      const endDate = String(semesterRange?.end || "").trim();
      if (!startDate || !endDate) return;
      const monthStart = `${meta.year}-${String(meta.month).padStart(2, "0")}-01`;
      const monthEnd = `${meta.year}-${String(meta.month).padStart(2, "0")}-${String(new Date(meta.year, meta.month, 0).getDate()).padStart(2, "0")}`;

      if (monthStart < startDate) {
        buildSegmentEntries(semesterKey, monthStart, shiftDateLabel(startDate, -1), "before-start");
      }

      if (monthEnd > endDate) {
        buildSegmentEntries(semesterKey, shiftDateLabel(endDate, 1), monthEnd, "after-end");
      }
    });

    return virtualEntries;
  }

  function buildPreviewCalendarEntries() {
    return buildActiveCalendarEntries()
      .concat(buildVirtualSemesterBreakEntries())
      .sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));
  }

  function getPreviewEntriesByDateMap() {
    return buildPreviewCalendarEntries().reduce((map, item) => {
      const key = String(item.date || "").trim();
      if (!key) return map;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
      return map;
    }, new Map());
  }

  function getEntryKindClass(item = {}) {
    const category = String(item.category || "").toLowerCase();
    if (String(item.kind || "").toLowerCase() === "libur") return "holiday";
    if (category.includes("ujian")) return "exam";
    if (category.includes("sekolah")) return "school";
    return "important";
  }

  function getMatrixVisualClass(item, dateObject, effectiveDayNumber) {
    const weekday = dateObject.getDay();
    if (item) {
      const name = String(item.name || "").toLowerCase();
      const category = String(item.category || "").toLowerCase();
      const kind = String(item.kind || "").toLowerCase();
      if (kind === "libur") return "holiday";
      if (name.includes("mpls")) return "mpls";
      if (category.includes("ujian") || /pts|pas|pat|asesmen|ujian/.test(name)) return "exam";
      if (name.includes("hari") || category.includes("penting")) return "national-day";
      if (category.includes("sekolah")) return "school-event";
      return "important";
    }
    if (effectiveDayNumber) return "effective";
    if (weekday === 0) return "sunday";
    if (weekday === 6) return "non-effective";
    return "inactive";
  }

  function renderKalenderLegend() {
    const items = [
      { label: "Libur", className: "holiday" },
      { label: "Ujian", className: "exam" },
      { label: "Agenda Sekolah", className: "school" },
      { label: "Peringatan Pendidikan", className: "important" }
    ];
    return items.map(item => `
      <span class="kalender-legend-item">
        <i class="${escapeKalenderHtml(item.className)}"></i>
        ${escapeKalenderHtml(item.label)}
      </span>
    `).join("");
  }

  function buildEventCode(item = {}) {
    const name = String(item.name || "").trim();
    const category = String(item.category || "").toLowerCase();
    if (String(item.kind || "").toLowerCase() === "libur") return "LIB";
    if (/mpls/i.test(name)) return "MPLS";
    if (/tengah semester/i.test(name)) return "PTS";
    if (/akhir semester/i.test(name)) return "PAS";
    if (/akhir tahun|sumatif akhir/i.test(name)) return "PAT";
    if (/asesmen sekolah|ujian akhir/i.test(name)) return "AS";
    if (/class meeting/i.test(name)) return "CM";
    if (/rapor/i.test(name)) return "RPR";
    if (category.includes("ujian")) return "UJN";
    const acronym = name
      .split(/[\s/()-]+/)
      .filter(Boolean)
      .map(word => word.charAt(0).toUpperCase())
      .join("")
      .slice(0, 4);
    return acronym || "AKT";
  }

  function buildEffectiveDayNumberMaps() {
    const entriesByDate = getEntriesByDateMap();
    const monthSequence = getMonthMetaSequence();
    const allowedWeekendDay = kalenderState.workDays === "6" ? 6 : null;
    const previewRanges = getSemesterPreviewRanges();
    const semesterRanges = [
      {
        key: "ganjil",
        months: monthSequence.slice(0, 6),
        startDate: String(previewRanges?.ganjil?.start || "").trim(),
        endDate: String(previewRanges?.ganjil?.end || "").trim()
      },
      {
        key: "genap",
        months: monthSequence.slice(6),
        startDate: String(previewRanges?.genap?.start || "").trim(),
        endDate: String(previewRanges?.genap?.end || "").trim()
      }
    ];

    return semesterRanges.reduce((maps, semester) => {
      const dayMap = new Map();
      let counter = 0;
      semester.months.forEach(meta => {
        const maxDay = new Date(meta.year, meta.month, 0).getDate();
        for (let day = 1; day <= maxDay; day += 1) {
          const date = `${meta.year}-${String(meta.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          if (semester.startDate && date < semester.startDate) continue;
          if (semester.endDate && date > semester.endDate) continue;
          const weekday = new Date(`${date}T00:00:00`).getDay();
          if (weekday === 0 || (weekday === 6 && allowedWeekendDay !== 6)) continue;
          const entries = entriesByDate.get(date) || [];
          if (entries.some(item => {
            const kind = getEntryKindClass(item);
            return kind === "holiday" || kind === "exam";
          })) continue;
          counter += 1;
          dayMap.set(date, counter);
        }
      });
      maps[semester.key] = dayMap;
      return maps;
    }, { ganjil: new Map(), genap: new Map() });
  }

  function buildMonthMatrixCell(meta, day, entriesByDate, effectiveDayMaps) {
    const maxDay = new Date(meta.year, meta.month, 0).getDate();
    if (day > maxDay) {
      return { empty: true, day, code: "", weekday: "", className: "empty" };
    }
    const date = `${meta.year}-${String(meta.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dateObject = new Date(`${date}T00:00:00`);
    const entries = entriesByDate.get(date) || [];
    const primary = entries[0] || null;
    const weekday = WEEKDAY_LABELS[dateObject.getDay()] || "";
    const semesterKey = meta.month >= 7 ? "ganjil" : "genap";
    const effectiveDayNumber = effectiveDayMaps?.[semesterKey]?.get(date) || "";
    const className = getMatrixVisualClass(primary, dateObject, effectiveDayNumber);
    return {
      empty: false,
      day,
      date,
      weekday,
      entries,
      code: primary ? buildEventCode(primary) : "",
      effectiveDayNumber,
      className
    };
  }

  function chunkMonthGroups(items = [], chunkSize = 4) {
    const groups = [];
    for (let index = 0; index < items.length; index += chunkSize) {
      groups.push(items.slice(index, index + chunkSize));
    }
    return groups;
  }

  function renderKaldikMatrixTable(monthGroup, effectiveDayMaps) {
    const yearGroups = monthGroup.reduce((groups, meta) => {
      const yearKey = String(meta.year);
      if (!groups.has(yearKey)) groups.set(yearKey, []);
      groups.get(yearKey).push(meta);
      return groups;
    }, new Map());

    return `
      <table class="kalender-matrix-table">
        <thead>
          <tr>
            <th class="kalender-matrix-year">Tahun</th>
            <th class="kalender-matrix-bulan">Bulan</th>
            ${Array.from({ length: 31 }, (_, index) => `<th>${index + 1}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${Array.from(yearGroups.entries()).map(([year, metas]) => metas.map((meta, rowIndex) => {
            const entriesByDate = getPreviewEntriesByDateMap();
            const cells = Array.from({ length: 31 }, (_, index) => buildMonthMatrixCell(meta, index + 1, entriesByDate, effectiveDayMaps));
            return `
              <tr>
                ${rowIndex === 0 ? `<td class="kalender-matrix-year-cell" rowspan="${metas.length}"><span>${escapeKalenderHtml(year)}</span></td>` : ""}
                <td class="kalender-matrix-bulan-cell">
                  <strong>${escapeKalenderHtml(meta.label)}</strong>
                </td>
                ${cells.map(cell => {
                  if (cell.empty) {
                    return `<td class="kalender-matrix-cell empty"></td>`;
                  }
                  const title = cell.entries.length
                    ? cell.entries.map(item => `${formatShortDateLabel(item.date)} - ${item.name}`).join(" | ")
                    : `${cell.weekday}, ${cell.day} ${meta.label} ${meta.year}`;
                  return `
                    <td class="kalender-matrix-cell ${escapeKalenderHtml(cell.className)}" title="${escapeKalenderHtml(title)}">
                      <small>${escapeKalenderHtml(cell.weekday)}</small>
                      <strong>${escapeKalenderHtml(cell.code || String(cell.effectiveDayNumber || ""))}</strong>
                    </td>
                  `;
                }).join("")}
              </tr>
            `;
          }).join("")).join("")}
        </tbody>
      </table>
    `;
  }

  function renderKalenderAcademicPreview() {
    const effectiveDayMaps = buildEffectiveDayNumberMaps();
    const monthSequence = getMonthMetaSequence();
    return `
      <section class="kalender-matrix-block">
        <div class="table-container kalender-matrix-scroll">
          ${renderKaldikMatrixTable(monthSequence, effectiveDayMaps)}
        </div>
      </section>
    `;
  }

  function getMonthWeekBuckets(meta) {
    const maxDay = new Date(meta.year, meta.month, 0).getDate();
    const buckets = [];
    let startDay = 1;
    while (startDay <= maxDay) {
      const endDay = Math.min(startDay + 6, maxDay);
      buckets.push({
        index: buckets.length + 1,
        startDate: `${meta.year}-${String(meta.month).padStart(2, "0")}-${String(startDay).padStart(2, "0")}`,
        endDate: `${meta.year}-${String(meta.month).padStart(2, "0")}-${String(endDay).padStart(2, "0")}`
      });
      startDay += 7;
    }
    return buckets;
  }

  function getRpeEventDurationDays(item = {}) {
    const startDate = String(item.rangeStart || item.date || "").trim();
    const endDate = String(item.rangeEnd || item.date || startDate).trim();
    if (!startDate || !endDate) return 1;
    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 1;
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.floor(diffTime / 86400000);
    return Math.max(1, diffDays + 1);
  }

  function getRpeEventType(item = {}) {
    const kind = String(item.kind || "").toLowerCase();
    const panel = String(item.panel || "").toLowerCase();
    const durationDays = getRpeEventDurationDays(item);

    if (panel === "libur-sekolah") return "non-effective";
    if (panel === "kegiatan-sekolah" && durationDays >= 7) return "non-effective";
    if (panel === "minggu-efektif-fakultatif") return "facultative";
    if (kind === "libur") return "ignore";
    return "ignore";
  }

  function getWeekLabel(meta, weekIndex) {
    return `${meta.label} minggu ke-${weekIndex}`;
  }

  function getRpeSemesterSummary(semesterKey = "ganjil") {
    const semesterMonths = getSemesterMonthSequence(semesterKey);
    const previewRanges = getSemesterPreviewRanges();
    const semesterRange = previewRanges[semesterKey] || {};
    const previewEntries = buildPreviewCalendarEntries()
      .filter(item => {
        const date = String(item.date || "");
        if (!date) return false;
        if (semesterRange.start && date < semesterRange.start) return false;
        if (semesterRange.end && date > semesterRange.end) return false;
        return semesterMonths.some(meta => meta.year === Number(date.slice(0, 4)) && meta.month === Number(date.slice(5, 7)));
      });

    const nonEffectiveMap = new Map();
    const facultativeMap = new Map();
    const rows = semesterMonths.map((meta, index) => {
      const weekBuckets = getMonthWeekBuckets(meta);
      const nonEffectiveWeeks = new Set();
      const facultativeWeeks = new Set();

      previewEntries.forEach(item => {
        const itemDate = String(item.date || "");
        if (Number(itemDate.slice(0, 4)) !== meta.year || Number(itemDate.slice(5, 7)) !== meta.month) return;
        const weekBucket = weekBuckets.find(bucket => itemDate >= bucket.startDate && itemDate <= bucket.endDate);
        if (!weekBucket) return;
        const label = getWeekLabel(meta, weekBucket.index);
        const eventType = getRpeEventType(item);
        if (eventType === "non-effective") {
          nonEffectiveWeeks.add(weekBucket.index);
          const key = `${item.name}|${semesterKey}`;
          const current = nonEffectiveMap.get(key) || { name: item.name, weeks: new Set(), labels: [] };
          current.weeks.add(`${meta.month}-${weekBucket.index}`);
          if (!current.labels.includes(label)) current.labels.push(label);
          nonEffectiveMap.set(key, current);
        } else if (eventType === "facultative") {
          facultativeWeeks.add(weekBucket.index);
          const key = `${item.name}|${semesterKey}`;
          const current = facultativeMap.get(key) || { name: item.name, weeks: new Set(), labels: [] };
          current.weeks.add(`${meta.month}-${weekBucket.index}`);
          if (!current.labels.includes(label)) current.labels.push(label);
          facultativeMap.set(key, current);
        }
      });

      const totalWeeks = weekBuckets.length;
      const nonEffectiveCount = nonEffectiveWeeks.size;
      const facultativeCount = [...facultativeWeeks].filter(week => !nonEffectiveWeeks.has(week)).length;
      const effectiveCount = Math.max(0, totalWeeks - nonEffectiveCount - facultativeCount);

      return {
        no: index + 1,
        bulan: meta.label,
        totalWeeks,
        nonEffectiveCount,
        facultativeCount,
        effectiveCount
      };
    });

    const nonEffectiveItems = Array.from(nonEffectiveMap.values()).map(item => ({
      name: item.name,
      count: item.weeks.size,
      labels: item.labels.join(", ")
    }));
    const facultativeItems = Array.from(facultativeMap.values()).map(item => ({
      name: item.name,
      count: item.weeks.size,
      labels: item.labels.join(", ")
    }));

    return {
      rows,
      totals: rows.reduce((acc, row) => ({
        totalWeeks: acc.totalWeeks + row.totalWeeks,
        nonEffectiveCount: acc.nonEffectiveCount + row.nonEffectiveCount,
        facultativeCount: acc.facultativeCount + row.facultativeCount,
        effectiveCount: acc.effectiveCount + row.effectiveCount
      }), { totalWeeks: 0, nonEffectiveCount: 0, facultativeCount: 0, effectiveCount: 0 }),
      nonEffectiveItems,
      facultativeItems
    };
  }

  function renderRpeListRows(items = [], emptyLabel = "Belum ada data.") {
    if (!items.length) {
      return `<tr><td colspan="4" class="empty-cell">${emptyLabel}</td></tr>`;
    }
    return items.map((item, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeKalenderHtml(item.name || "-")}</td>
        <td>${escapeKalenderHtml(item.count || 0)}</td>
        <td>${escapeKalenderHtml(item.labels || "-")}</td>
      </tr>
    `).join("");
  }

  function renderRpeSemesterTable(semesterKey = "ganjil", title = "Semester Ganjil") {
    const summary = getRpeSemesterSummary(semesterKey);
    const principal = getKaldikPrincipalInfo();
    const printDate = formatDateNoWeekdayLabel(principal.tanggal);
    return `
      <section class="kalender-rpe-card">
        <div class="kalender-rpe-official-head">
          <img src="img/logo_pemda.png" alt="Logo Pemda" class="kalender-official-logo">
          <div class="kalender-official-title kalender-rpe-title">
            <div class="kalender-official-identity">
              <span>${escapeKalenderHtml(SCHOOL_IDENTITY.pemerintah)}</span>
              <strong>${escapeKalenderHtml(SCHOOL_IDENTITY.sekolah)}</strong>
              <small>${escapeKalenderHtml(`${SCHOOL_IDENTITY.alamat} | ${SCHOOL_IDENTITY.kontak} | ${SCHOOL_IDENTITY.email}`)}</small>
            </div>
            <div class="kalender-official-doc-title">
              <h3>RINCIAN PEKAN EFEKTIF</h3>
              <p>${escapeKalenderHtml(title)} - TAHUN PELAJARAN ${escapeKalenderHtml(kalenderState.tahunPelajaran)}</p>
            </div>
          </div>
          <img src="img/logo_sekolah.png" alt="Logo Sekolah" class="kalender-official-logo">
        </div>

        <div class="kalender-rpe-head">
          <strong>${escapeKalenderHtml(title)}</strong>
          <span>Rincian Pekan Efektif</span>
        </div>

        <div class="table-container mapel-table-container">
          <table class="mapel-table kalender-rpe-table kalender-rpe-summary-table">
            <thead>
              <tr>
                <th colspan="6">I. Pekan Efektif Sekolah</th>
              </tr>
              <tr>
                <th>No</th>
                <th>Bulan</th>
                <th>Jumlah Minggu</th>
                <th>Minggu Tidak Efektif</th>
                <th>Minggu Efektif Fakultatif</th>
                <th>Minggu Efektif</th>
              </tr>
            </thead>
            <tbody>
              ${summary.rows.map(row => `
                <tr>
                  <td class="kalender-rpe-cell-center">${row.no}</td>
                  <td>${escapeKalenderHtml(row.bulan)}</td>
                  <td class="kalender-rpe-cell-center">${row.totalWeeks}</td>
                  <td class="kalender-rpe-cell-center">${row.nonEffectiveCount}</td>
                  <td class="kalender-rpe-cell-center">${row.facultativeCount}</td>
                  <td class="kalender-rpe-cell-center">${row.effectiveCount}</td>
                </tr>
              `).join("")}
              <tr class="kalender-rpe-total-row">
                <td colspan="2" class="kalender-rpe-total-label"><strong>Jumlah</strong></td>
                <td class="kalender-rpe-cell-center"><strong>${summary.totals.totalWeeks}</strong></td>
                <td class="kalender-rpe-cell-center"><strong>${summary.totals.nonEffectiveCount}</strong></td>
                <td class="kalender-rpe-cell-center"><strong>${summary.totals.facultativeCount}</strong></td>
                <td class="kalender-rpe-cell-center"><strong>${summary.totals.effectiveCount}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="table-container mapel-table-container">
          <table class="mapel-table kalender-rpe-table">
            <thead>
              <tr>
                <th colspan="4">II. Minggu Tidak Efektif</th>
              </tr>
              <tr>
                <th>No</th>
                <th>Uraian</th>
                <th>Jumlah Minggu</th>
                <th>Keterangan</th>
              </tr>
            </thead>
            <tbody>${renderRpeListRows(summary.nonEffectiveItems, "Belum ada minggu tidak efektif.")}</tbody>
          </table>
        </div>

        <div class="table-container mapel-table-container">
          <table class="mapel-table kalender-rpe-table">
            <thead>
              <tr>
                <th colspan="4">III. Minggu Efektif Fakultatif</th>
              </tr>
              <tr>
                <th>No</th>
                <th>Uraian</th>
                <th>Jumlah Minggu</th>
                <th>Keterangan</th>
              </tr>
            </thead>
            <tbody>${renderRpeListRows(summary.facultativeItems, "Belum ada minggu efektif fakultatif.")}</tbody>
          </table>
        </div>

        <div class="kalender-official-signature kalender-rpe-signature">
          <div></div>
          <div class="kalender-official-sign-box">
            <span>${escapeKalenderHtml(`Umbulsari, ${printDate}`)}</span>
            <strong>Kepala Sekolah</strong>
            <div class="kalender-official-ttd">
              ${isKalenderSignatureEnabled("rpe") && principal.ttd ? `<img src="${escapeKalenderHtml(principal.ttd)}" alt="TTD Kepala Sekolah">` : `<div class="kalender-official-ttd-placeholder"></div>`}
            </div>
            <b>${escapeKalenderHtml(principal.nama)}</b>
            <small>NIP. ${escapeKalenderHtml(principal.nip)}</small>
          </div>
        </div>
      </section>
    `;
  }

  function renderKalenderRpeView() {
    return `
      <div id="kalenderRpeExport" class="kalender-rpe-layout">
        <div class="kalender-rpe-page">${renderRpeSemesterTable("ganjil", "Semester Ganjil")}</div>
        <div class="kalender-rpe-page">${renderRpeSemesterTable("genap", "Semester Genap")}</div>
      </div>
    `;
  }

  function getPrintableLogoUrl(path = "") {
    try {
      return new URL(path, global.location.href).href;
    } catch {
      return path;
    }
  }

  function getKalenderPrintStyles(mode = "kaldik", paper = "a4") {
    const normalizedPaper = String(paper || "a4").toLowerCase() === "f4" ? "f4" : "a4";
    const pageSize = normalizedPaper === "f4"
      ? "13in 8.5in landscape"
      : (mode === "rpe" ? "A4 portrait" : "A4 landscape");
    return `
      * { box-sizing: border-box; }
      body { margin: 0; font-family: Arial, Calibri, sans-serif; color: #0f172a; background: #fff; }
      .print-root { padding: ${mode === "rpe" ? "8px" : "8px"}; }
      .print-root.kaldik-print { max-width: 1120px; margin: 0 auto; }
      .print-root.rpe-print { max-width: 780px; margin: 0 auto; }
      .print-page { width: 100%; page-break-after: always; break-after: page; }
      .print-page:last-child { page-break-after: auto; break-after: auto; }
      .kalender-official-sheet, .kalender-rpe-card { width: 100%; background: #fff; border: 1px solid #cbd5e1; border-radius: 0; padding: ${mode === "rpe" ? "10px" : "8px"}; }
      .print-root.kaldik-print .kalender-official-sheet { position: relative; min-height: calc(100vh - 14mm); padding-bottom: 92px; }
      .kalender-official-head, .kalender-rpe-official-head { display: grid; grid-template-columns: ${mode === "rpe" ? "58px 1fr 58px" : "64px 1fr 64px"}; gap: ${mode === "rpe" ? "10px" : "12px"}; align-items: start; padding-bottom: 6px; }
      .kalender-official-logo { width: ${mode === "rpe" ? "46px" : "52px"}; height: ${mode === "rpe" ? "46px" : "52px"}; object-fit: contain; }
      .kalender-official-title { text-align: center; }
      .kalender-official-title span, .kalender-official-title small, .kalender-official-title p { display: block; }
      .kalender-official-title strong { display: block; font-size: ${mode === "rpe" ? "17px" : "19px"}; }
      .kalender-official-title span { font-size: ${mode === "rpe" ? "11px" : "12px"}; }
      .kalender-official-title small, .kalender-official-title p { font-size: ${mode === "rpe" ? "10px" : "11px"}; }
      .kalender-official-title h3 { margin: 2px 0 1px; font-size: ${mode === "rpe" ? "16px" : "18px"}; }
      .kalender-official-identity { padding-bottom: 6px; border-bottom: 2px solid #0f172a; }
      .kalender-official-doc-title { padding-top: 1px; }
      .kalender-official-legend { display: flex; flex-wrap: nowrap; gap: 8px; justify-content: flex-start; align-items: center; }
      .kalender-legend-item { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; }
      .kalender-legend-item i { width: 12px; height: 12px; border-radius: 4px; display: inline-block; border: 1px solid rgba(15,23,42,0.12); }
      .kalender-legend-item i.holiday { background: #ef4444; }
      .kalender-legend-item i.exam { background: #3b82f6; }
      .kalender-legend-item i.school { background: #f59e0b; }
      .kalender-legend-item i.important { background: #8b5cf6; }
      .kalender-official-grid, .kalender-rpe-layout { display: grid; gap: ${mode === "rpe" ? "8px" : "2px"}; }
      .kalender-rpe-head { display: grid; gap: 2px; margin-bottom: 6px; }
      .kalender-rpe-head strong { font-size: 13px; }
      .kalender-rpe-head span { font-size: 10px; color: #475569; }
      .kalender-official-summary-row { margin-top: 6px; display: grid; grid-template-columns: ${mode === "rpe" ? "1fr" : "1fr auto"}; gap: 8px; align-items: center; }
      .kalender-official-summary-row .kalender-official-legend { justify-content: flex-start; }
      .kalender-matrix-table, .kalender-rpe-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
      .kalender-matrix-table th, .kalender-matrix-table td, .kalender-rpe-table th, .kalender-rpe-table td { border: 1px solid #334155; padding: ${mode === "rpe" ? "3px" : "1px"}; font-size: ${mode === "rpe" ? "10px" : "8px"}; text-align: center; vertical-align: middle; }
      .kalender-matrix-table thead th, .kalender-rpe-table th { background: #8fd14f; color: #172554; font-weight: 700; }
      .kalender-rpe-table td:nth-child(2), .kalender-rpe-table td:nth-child(4), .kalender-rpe-table th:nth-child(2), .kalender-rpe-table th:nth-child(4) { text-align: left; }
      .kalender-rpe-summary-table td:nth-child(2), .kalender-rpe-summary-table th:nth-child(2) { text-align: left; }
      .kalender-rpe-summary-table td:nth-child(4), .kalender-rpe-summary-table th:nth-child(4) { text-align: center; }
      .kalender-rpe-total-row td { background: #e5e7eb; font-weight: 700; }
      .kalender-rpe-page { page-break-after: always; break-after: page; }
      .kalender-rpe-page:last-child { page-break-after: auto; break-after: auto; }
      .kalender-matrix-year { width: 30px; }
      .kalender-matrix-bulan { width: 64px; }
      .kalender-matrix-year-cell { background: #bfdbfe; font-weight: 700; padding: 0; }
      .kalender-matrix-year-cell span { display: inline-block; transform: rotate(-90deg); white-space: nowrap; font-size: 8px; }
      .kalender-matrix-bulan-cell strong { display: block; }
      .kalender-matrix-cell small, .kalender-matrix-cell strong { display: block; }
      .kalender-matrix-cell { height: 18px; }
      .kalender-matrix-cell small { font-size: 5px; line-height: 1; margin-bottom: 0; }
      .kalender-matrix-cell strong { font-size: 6px; line-height: 1; }
      .kalender-matrix-cell.holiday { background: #fecaca; color: #991b1b; }
      .kalender-matrix-cell.exam { background: #bfdbfe; color: #1d4ed8; }
      .kalender-matrix-cell.school-event { background: #fde68a; color: #92400e; }
      .kalender-matrix-cell.national-day { background: #ddd6fe; color: #6d28d9; }
      .kalender-matrix-cell.mpls { background: #f9a8d4; color: #9d174d; }
      .kalender-matrix-cell.important { background: #fed7aa; color: #9a3412; }
      .kalender-matrix-cell.effective { background: #dcfce7; color: #166534; }
      .kalender-matrix-cell.non-effective { background: #e2e8f0; color: #475569; }
      .kalender-matrix-cell.sunday { background: #fecaca; color: #991b1b; }
      .kalender-matrix-cell.inactive, .kalender-matrix-cell.empty { background: #f8fafc; color: #64748b; }
      .kalender-official-stats { margin-top: 0; display: flex; flex-wrap: nowrap; gap: 8px 14px; align-items: center; justify-content: flex-end; color: #475569; font-weight: 700; text-align: right; }
      .kalender-official-stats span { font-size: 11px; }
      .kalender-official-stats strong { font-size: 11px; color: #0f172a; }
      .kalender-official-info { margin-top: 6px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
      .kalender-official-column { border: 1px solid #cbd5e1; }
      .kalender-official-column h4 { margin: 0; padding: 4px 6px; background: #e2e8f0; font-size: ${mode === "rpe" ? "11px" : "11px"}; }
      .kalender-official-column ul { margin: 0; padding: 6px 10px 7px 18px; }
      .kalender-official-column li { font-size: ${mode === "rpe" ? "9px" : "8px"}; line-height: 1.12; margin-bottom: 1px; }
      .kalender-official-signature { margin-top: 8px; display: grid; grid-template-columns: 1fr ${mode === "rpe" ? "220px" : "260px"}; gap: 16px; align-items: end; }
      .print-root.kaldik-print .kalender-official-signature { position: absolute; left: 8px; right: 8px; bottom: 8px; margin-top: 0; }
      .kalender-official-sign-box { text-align: center; }
      .kalender-official-sign-box span, .kalender-official-sign-box small, .kalender-official-sign-box b, .kalender-official-sign-box strong { display: block; font-size: ${mode === "rpe" ? "10px" : "10px"}; white-space: normal; }
      .kalender-official-ttd { min-height: ${mode === "rpe" ? "56px" : "52px"}; display: grid; place-items: center; }
      .kalender-official-ttd img { max-width: ${mode === "rpe" ? "140px" : "148px"}; max-height: ${mode === "rpe" ? "56px" : "52px"}; object-fit: contain; }
      .kalender-official-ttd-placeholder { width: ${mode === "rpe" ? "140px" : "148px"}; height: ${mode === "rpe" ? "56px" : "52px"}; }
      @page { size: ${pageSize}; margin: ${mode === "rpe" ? "8mm" : "5mm"}; }
      @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    `;
  }

  function openKalenderPrintWindow(title, bodyHtml, mode = "kaldik", paper = "a4") {
    const iframe = global.document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.setAttribute("aria-hidden", "true");
    global.document.body.appendChild(iframe);

    const frameWindow = iframe.contentWindow;
    const frameDocument = frameWindow?.document;
    if (!frameWindow || !frameDocument) {
      iframe.remove();
      showKalenderToast("Export PDF belum bisa dijalankan di browser ini.", "error");
      return;
    }

    const html = `<!doctype html><html lang="id"><head><meta charset="utf-8"><title>${escapeKalenderHtml(title)}</title><style>${getKalenderPrintStyles(mode, paper)}</style></head><body><div class="print-root ${mode === "rpe" ? "rpe-print" : "kaldik-print"}">${bodyHtml}</div></body></html>`;
    frameDocument.open();
    frameDocument.write(html);
    frameDocument.close();

    const waitForAssets = () => {
      const images = Array.from(frameDocument.images || []);
      if (!images.length) return Promise.resolve();
      return Promise.all(images.map(img => new Promise(resolve => {
        if (img.complete) {
          resolve();
          return;
        }
        img.addEventListener("load", resolve, { once: true });
        img.addEventListener("error", resolve, { once: true });
      })));
    };

    waitForAssets()
      .then(() => new Promise(resolve => global.setTimeout(resolve, 150)))
      .then(() => {
        frameWindow.focus();
        frameWindow.print();
      })
      .finally(() => {
        global.setTimeout(() => iframe.remove(), 1500);
      });
  }

  function buildPrintableKalenderHtml() {
    return renderKalenderOfficialSheet()
      .replaceAll('src="img/logo_pemda.png"', `src="${escapeKalenderHtml(getPrintableLogoUrl("img/logo_pemda.png"))}"`)
      .replaceAll('src="img/logo_sekolah.png"', `src="${escapeKalenderHtml(getPrintableLogoUrl("img/logo_sekolah.png"))}"`);
  }

  function buildPrintableRpeHtml() {
    return renderKalenderRpeView()
      .replaceAll('src="img/logo_pemda.png"', `src="${escapeKalenderHtml(getPrintableLogoUrl("img/logo_pemda.png"))}"`)
      .replaceAll('src="img/logo_sekolah.png"', `src="${escapeKalenderHtml(getPrintableLogoUrl("img/logo_sekolah.png"))}"`);
  }

  function exportKalenderKaldikPdf(paper = "a4") {
    const paperLabel = String(paper || "a4").toUpperCase();
    openKalenderPrintWindow(`KALDIK ${kalenderState.tahunPelajaran} ${paperLabel}`, `<div class="print-page">${buildPrintableKalenderHtml()}</div>`, "kaldik", paper);
  }

  function exportKalenderRpePdf(paper = "a4") {
    const paperLabel = String(paper || "a4").toUpperCase();
    openKalenderPrintWindow(`RPE ${kalenderState.tahunPelajaran} ${paperLabel}`, buildPrintableRpeHtml(), "rpe", paper);
  }

  function getEntriesByLegendType() {
    return buildPreviewCalendarEntries().reduce((groups, item) => {
      const key = getEntryKindClass(item);
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
      return groups;
    }, {
      holiday: [],
      exam: [],
      important: [],
      school: []
    });
  }

  function renderLegendEntryList(items = []) {
    if (!items.length) {
      return `<li>Belum ada item aktif.</li>`;
    }
    return groupCalendarEntries(items).map(item => `
      <li>${escapeKalenderHtml(formatDateRangeLabel(item.rangeStart, item.rangeEnd))} - ${escapeKalenderHtml(item.name)}</li>
    `).join("");
  }

  function countEffectiveStudyDaysBySemester() {
    const entriesByDate = getPreviewEntriesByDateMap();
    const monthSequence = getMonthMetaSequence();
    const allowedWeekendDay = kalenderState.workDays === "6" ? 6 : null;
    const previewRanges = getSemesterPreviewRanges();
    const semesterRanges = [
      {
        key: "ganjil",
        months: monthSequence.slice(0, 6),
        startDate: String(previewRanges?.ganjil?.start || "").trim(),
        endDate: String(previewRanges?.ganjil?.end || "").trim()
      },
      {
        key: "genap",
        months: monthSequence.slice(6),
        startDate: String(previewRanges?.genap?.start || "").trim(),
        endDate: String(previewRanges?.genap?.end || "").trim()
      }
    ];

    return semesterRanges.reduce((result, semester) => {
      let count = 0;
      semester.months.forEach(meta => {
        const maxDay = new Date(meta.year, meta.month, 0).getDate();
        for (let day = 1; day <= maxDay; day += 1) {
          const date = `${meta.year}-${String(meta.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          if (semester.startDate && date < semester.startDate) continue;
          if (semester.endDate && date > semester.endDate) continue;
          const weekday = new Date(`${date}T00:00:00`).getDay();
          if (weekday === 0 || (weekday === 6 && allowedWeekendDay !== 6)) continue;
          const entries = entriesByDate.get(date) || [];
          if (entries.some(item => {
            const kind = getEntryKindClass(item);
            return kind === "holiday" || kind === "exam";
          })) continue;
          count += 1;
        }
      });
      result[semester.key] = count;
      return result;
    }, { ganjil: 0, genap: 0 });
  }

  function formatEffectiveWeekValue(days = 0) {
    const workDayCount = kalenderState.workDays === "6" ? 6 : 5;
    const rawWeeks = Number(days || 0) / workDayCount;
    if (!Number.isFinite(rawWeeks) || rawWeeks <= 0) return "0";
    const roundedWeeks = Math.round(rawWeeks * 10) / 10;
    return Number.isInteger(roundedWeeks) ? String(roundedWeeks) : String(roundedWeeks).replace(".", ",");
  }

  function renderKalenderOfficialSheet() {
    const principal = getKaldikPrincipalInfo();
    const groups = getEntriesByLegendType();
    const printDate = formatDateNoWeekdayLabel(principal.tanggal);
    const effectiveDays = countEffectiveStudyDaysBySemester();
    const holidayDays = groups.holiday.length;
    const importantDays = groups.exam.length + groups.school.length + groups.important.length;
    return `
      <section class="kalender-official-sheet">
        <div class="kalender-official-head">
          <img src="img/logo_pemda.png" alt="Logo Pemda" class="kalender-official-logo">
          <div class="kalender-official-title">
            <div class="kalender-official-identity">
              <span>${escapeKalenderHtml(SCHOOL_IDENTITY.pemerintah)}</span>
              <strong>${escapeKalenderHtml(SCHOOL_IDENTITY.sekolah)}</strong>
              <small>${escapeKalenderHtml(`${SCHOOL_IDENTITY.alamat} | ${SCHOOL_IDENTITY.kontak} | ${SCHOOL_IDENTITY.email}`)}</small>
            </div>
            <div class="kalender-official-doc-title">
              <h3>KALENDER PENDIDIKAN DAN KEGIATAN SEKOLAH</h3>
              <p>TAHUN PELAJARAN ${escapeKalenderHtml(kalenderState.tahunPelajaran)}</p>
            </div>
          </div>
          <img src="img/logo_sekolah.png" alt="Logo Sekolah" class="kalender-official-logo">
        </div>

        <div class="kalender-official-grid">
          ${renderKalenderAcademicPreview()}
        </div>

        <div class="kalender-official-summary-row">
          <div class="kalender-official-legend">
            ${renderKalenderLegend()}
          </div>
          <div class="kalender-official-stats">
            <span><strong>Hari Efektif Ganjil:</strong> ${escapeKalenderHtml(effectiveDays.ganjil)}</span>
            <span><strong>Hari Efektif Genap:</strong> ${escapeKalenderHtml(effectiveDays.genap)}</span>
          </div>
        </div>

        <div class="kalender-official-info">
          <div class="kalender-official-column holiday">
            <h4>Hari Libur Besar</h4>
            <ul>${renderLegendEntryList(groups.holiday)}</ul>
          </div>
          <div class="kalender-official-column important">
            <h4>Hari-Hari Penting</h4>
            <ul>${renderLegendEntryList(groups.important)}</ul>
          </div>
          <div class="kalender-official-column school">
            <h4>Kegiatan Sekolah dan Ujian</h4>
            <ul>${renderLegendEntryList(groups.exam.concat(groups.school).sort((a, b) => String(a.date || "").localeCompare(String(b.date || ""))))}</ul>
          </div>
        </div>

        <div class="kalender-official-signature">
          <div></div>
          <div class="kalender-official-sign-box">
            <span>${escapeKalenderHtml(`Umbulsari, ${printDate}`)}</span>
            <strong>Kepala Sekolah</strong>
            <div class="kalender-official-ttd">
              ${isKalenderSignatureEnabled("kaldik") && principal.ttd ? `<img src="${escapeKalenderHtml(principal.ttd)}" alt="TTD Kepala Sekolah">` : `<div class="kalender-official-ttd-placeholder"></div>`}
            </div>
            <b>${escapeKalenderHtml(principal.nama)}</b>
            <small>NIP. ${escapeKalenderHtml(principal.nip)}</small>
          </div>
        </div>
      </section>
    `;
  }

  function renderFixedEventRows() {
    return kalenderState.fixedEvents.filter(item => item.holiday).map(item => {
      const date = resolveFixedEventDate(item, kalenderState.tahunPelajaran);
      return `
        <tr>
          <td class="kalender-toggle-cell">
            <button class="kalender-toggle-btn ${item.active ? "is-active" : ""}" onclick="toggleKalenderFixedEvent('${escapeKalenderHtml(item.id)}')" aria-label="${item.active ? "Nonaktifkan" : "Aktifkan"}">
              <span aria-hidden="true">${item.active ? "●" : "○"}</span>
            </button>
          </td>
          <td>${escapeKalenderHtml(formatDateLabel(date))}</td>
          <td>
            <strong>${escapeKalenderHtml(item.name)}</strong>
            <small>${escapeKalenderHtml(item.note || "")}</small>
          </td>
          <td>${escapeKalenderHtml(item.category)}</td>
          <td>${escapeKalenderHtml(item.holiday ? "Libur" : "Peringatan")}</td>
        </tr>
      `;
    }).join("");
  }

  function renderImportantFixedEventRows() {
    return kalenderState.fixedEvents.filter(item => !item.holiday).map(item => {
      const date = resolveFixedEventDate(item, kalenderState.tahunPelajaran);
      return `
        <tr>
          <td class="kalender-toggle-cell">
            <button class="kalender-toggle-btn ${item.active ? "is-active" : ""}" onclick="toggleKalenderFixedEvent('${escapeKalenderHtml(item.id)}')" aria-label="${item.active ? "Nonaktifkan" : "Aktifkan"}">
              <span aria-hidden="true">${item.active ? "●" : "○"}</span>
            </button>
          </td>
          <td>${escapeKalenderHtml(formatDateLabel(date))}</td>
          <td>
            <strong>${escapeKalenderHtml(item.name)}</strong>
            <small>${escapeKalenderHtml(item.note || "")}</small>
          </td>
          <td>${escapeKalenderHtml(item.category)}</td>
        </tr>
      `;
    }).join("");
  }

  function renderImportantSchoolEventRows() {
    return kalenderState.schoolEvents.filter(item => item.panel === "hari-penting").map(item => `
      <tr>
        <td class="kalender-toggle-cell">
          <button class="kalender-toggle-btn ${item.active ? "is-active" : ""}" onclick="toggleKalenderSchoolEvent('${escapeKalenderHtml(item.id)}')" aria-label="${item.active ? "Nonaktifkan" : "Aktifkan"}">
            <span aria-hidden="true">${item.active ? "●" : "○"}</span>
          </button>
        </td>
        <td>
          <button class="btn-secondary btn-table-compact kalender-range-trigger" onclick="openKalenderRangePicker('${escapeKalenderHtml(item.id)}')">
            ${escapeKalenderHtml((item.startDate || item.endDate) ? formatDateRangeLabel(item.startDate, item.endDate) : "Pilih Rentang")}
          </button>
        </td>
        <td><input type="text" value="${escapeKalenderHtml(item.name || "")}" placeholder="Nama hari penting" onchange="updateKalenderSchoolEvent('${escapeKalenderHtml(item.id)}', 'name', this.value)"></td>
        <td><input type="text" value="${escapeKalenderHtml(item.category || "Hari Penting Nasional")}" placeholder="Kategori" onchange="updateKalenderSchoolEvent('${escapeKalenderHtml(item.id)}', 'category', this.value)"></td>
      </tr>
    `).join("");
  }

  function renderSchoolEventRows(panelKey) {
    return kalenderState.schoolEvents.filter(item => item.panel === panelKey).map(item => `
      <tr>
        <td class="kalender-toggle-cell">
          <button class="kalender-toggle-btn ${item.active ? "is-active" : ""}" onclick="toggleKalenderSchoolEvent('${escapeKalenderHtml(item.id)}')" aria-label="${item.active ? "Nonaktifkan" : "Aktifkan"}">
            <span aria-hidden="true">${item.active ? "●" : "○"}</span>
          </button>
        </td>
        <td>
          <button class="btn-secondary btn-table-compact kalender-range-trigger" onclick="openKalenderRangePicker('${escapeKalenderHtml(item.id)}')">
            ${escapeKalenderHtml((item.startDate || item.endDate) ? formatDateRangeLabel(item.startDate, item.endDate) : "Pilih Rentang")}
          </button>
        </td>
        <td><input type="text" value="${escapeKalenderHtml(item.name || "")}" placeholder="Nama kegiatan sekolah" onchange="updateKalenderSchoolEvent('${escapeKalenderHtml(item.id)}', 'name', this.value)"></td>
        <td><input type="text" value="${escapeKalenderHtml(item.category || "Sekolah")}" placeholder="Kategori" onchange="updateKalenderSchoolEvent('${escapeKalenderHtml(item.id)}', 'category', this.value)"></td>
        <td>
          <div class="table-actions">
            <button class="btn-secondary btn-table-compact" onclick="removeKalenderSchoolEvent('${escapeKalenderHtml(item.id)}')">Hapus</button>
          </div>
        </td>
      </tr>
    `).join("");
  }

  function renderSchoolEventPanel(config) {
    return `
      <section class="kalender-pendidikan-section">
        <div class="kalender-pendidikan-section-head">
          <div>
            <span class="dashboard-card-label">${escapeKalenderHtml(config.label)}</span>
            <h3>${escapeKalenderHtml(config.title)}</h3>
          </div>
          <button class="btn-secondary" onclick="addKalenderSchoolEvent('${escapeKalenderHtml(config.panel)}')">Tambah Item</button>
        </div>
        <div class="table-container mapel-table-container">
          <table class="mapel-table kalender-pendidikan-table kalender-pendidikan-school-table">
            <thead>
              <tr>
                <th>Aktif</th>
                <th>Rentang Tanggal</th>
                <th>Nama Kegiatan</th>
                <th>Kategori</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>${renderSchoolEventRows(config.panel)}</tbody>
          </table>
        </div>
      </section>
    `;
  }

  function renderKalenderRangeModal() {
    const draft = kalenderRangeDraft;
    return `
      <div id="kalenderRangeModal" class="kalender-range-modal ${draft ? "is-open" : ""}" onclick="closeKalenderRangePicker(event)">
        <div class="kalender-range-dialog" onclick="event.stopPropagation()">
          <div class="kalender-range-head">
            <div>
              <span class="dashboard-card-label">Pilih Rentang</span>
              <h3>${escapeKalenderHtml(draft?.title || "Rentang Tanggal")}</h3>
            </div>
            <button class="btn-secondary btn-table-compact" onclick="closeKalenderRangePicker()">Tutup</button>
          </div>
          <div class="kalender-range-grid">
            <label class="form-group">
              <span>Tanggal Awal</span>
              <input id="kalenderRangeStart" type="date" value="${escapeKalenderHtml(draft?.startDate || "")}">
            </label>
            <label class="form-group">
              <span>Tanggal Akhir</span>
              <input id="kalenderRangeEnd" type="date" value="${escapeKalenderHtml(draft?.endDate || "")}">
            </label>
          </div>
          <div class="kalender-range-actions">
            <button class="btn-secondary" onclick="clearKalenderRange()">Kosongkan</button>
            <button class="btn-primary" onclick="applyKalenderRange()">Terapkan</button>
          </div>
        </div>
      </div>
    `;
  }

  function renderKalenderSavingOverlay() {
    return `
      <div id="kalenderSavingOverlay" class="nilai-saving-overlay" style="display:${isKalenderSaving ? "flex" : "none"};" aria-hidden="${isKalenderSaving ? "false" : "true"}">
        <div class="nilai-saving-card">
          <div class="nilai-saving-spinner" aria-hidden="true"></div>
          <strong>Menyimpan kalender...</strong>
          <span>Mohon tunggu sebentar, perhitungan kalender sedang diperbarui.</span>
        </div>
      </div>
    `;
  }

  function renderActiveEntries() {
    const entries = groupCalendarEntries(buildActiveCalendarEntries());
    if (!entries.length) {
      return `<tr><td colspan="4" class="empty-cell">Belum ada item aktif di kalender pendidikan.</td></tr>`;
    }
    return entries.map(item => `
      <tr>
        <td>${escapeKalenderHtml(formatDateRangeLabel(item.rangeStart, item.rangeEnd))}</td>
        <td>
          <strong>${escapeKalenderHtml(item.name)}</strong>
          <small>${escapeKalenderHtml(item.note || "")}</small>
        </td>
        <td>${escapeKalenderHtml(item.category)}</td>
        <td>${escapeKalenderHtml(item.kind)}</td>
      </tr>
    `).join("");
  }

  function renderKalenderPendidikanPage() {
    const activeCount = buildActiveCalendarEntries().length;
    const isInputTab = kalenderPageTab === "input";
    const isKaldikTab = kalenderPageTab === "kaldik";
    const isRpeTab = kalenderPageTab === "rpe";
    return `
      <div class="card kalender-pendidikan-page">
        <div class="asesmen-page-head kalender-pendidikan-head">
          <div>
            <span class="dashboard-eyebrow">Kurikulum</span>
            <h2>Kalender Pendidikan</h2>
            <p>Kelola tanggal tetap, hari penting pendidikan, dan agenda sekolah. Hanya item yang aktif yang akan masuk ke kalender pendidikan.</p>
          </div>
          <div class="kalender-pendidikan-summary">
            <span>Tahun Pelajaran Aktif</span>
            <strong>${escapeKalenderHtml(kalenderState.tahunPelajaran)}</strong>
            <small>${activeCount} item aktif</small>
          </div>
        </div>

        <div class="matrix-toolbar-note kalender-pendidikan-note">
          Daftar bawaan di bawah memuat tanggal yang tidak berubah setiap tahun, seperti 1 Januari, 1 Mei, 1 Juni, 17 Agustus, 25 Desember, serta hari penting pendidikan seperti 2 Mei dan 25 November. Agenda sekolah tetap bisa Anda atur sendiri.
        </div>

        <div class="ai-soal-tabbar kalender-preview-tabbar">
          <button type="button" class="ai-soal-tab ${isInputTab ? "active" : ""}" onclick="setKalenderPageTab('input')">Input Tanggal</button>
          <button type="button" class="ai-soal-tab ${isKaldikTab ? "active" : ""}" onclick="setKalenderPageTab('kaldik')">KALDIK</button>
          <button type="button" class="ai-soal-tab ${isRpeTab ? "active" : ""}" onclick="setKalenderPageTab('rpe')">RPE</button>
        </div>

        ${isInputTab ? `
        <section class="kalender-pendidikan-section">
          <div class="kalender-pendidikan-section-head">
            <div>
              <span class="dashboard-card-label">Panel 1</span>
              <h3>Pengaturan Awal</h3>
              <p class="kalender-panel-copy">Atur awal semester dan pola hari kerja sekolah sebelum mengisi detail kalender.</p>
            </div>
            <div class="kalender-pendidikan-actions">
              <button class="btn-primary" onclick="saveKalenderPendidikan()">Simpan Kalender</button>
            </div>
          </div>
          <div class="kalender-settings-grid">
            <label class="form-group">
              <span>Tahun Pelajaran</span>
              <input type="text" value="${escapeKalenderHtml(kalenderState.tahunPelajaran)}" placeholder="2025/2026" onchange="setKalenderPendidikanYear(this.value)">
            </label>
            <label class="form-group">
              <span>Awal Semester Ganjil</span>
              <input type="date" value="${escapeKalenderHtml(kalenderState?.semesterStarts?.ganjil || "")}" onchange="setKalenderSemesterStart('ganjil', this.value)">
            </label>
            <label class="form-group">
              <span>Awal Semester Genap</span>
              <input type="date" value="${escapeKalenderHtml(kalenderState?.semesterStarts?.genap || "")}" onchange="setKalenderSemesterStart('genap', this.value)">
            </label>
            <label class="form-group">
              <span>Jumlah Hari Kerja</span>
              <select onchange="setKalenderWorkDays(this.value)">
                <option value="5" ${kalenderState.workDays === "5" ? "selected" : ""}>5 Hari</option>
                <option value="6" ${kalenderState.workDays === "6" ? "selected" : ""}>6 Hari</option>
              </select>
            </label>
          </div>
        </section>

        <section class="kalender-pendidikan-section">
          <div class="kalender-pendidikan-section-head">
            <div>
              <span class="dashboard-card-label">Panel 2</span>
              <h3>Libur Nasional</h3>
            </div>
          </div>
          <div class="table-container mapel-table-container">
            <table class="mapel-table kalender-pendidikan-table kalender-fixed-table">
              <thead>
                <tr>
                  <th>Aktif</th>
                  <th>Tanggal</th>
                  <th>Nama</th>
                  <th>Kategori</th>
                  <th>Jenis</th>
                </tr>
              </thead>
              <tbody>${renderFixedEventRows()}</tbody>
            </table>
          </div>
        </section>

        ${renderSchoolEventPanel({
          panel: "libur-sekolah",
          label: "Panel 3",
          title: "Libur Sekolah"
        })}

        ${renderSchoolEventPanel({
          panel: "kegiatan-sekolah",
          label: "Panel 4",
          title: "Kegiatan Sekolah"
        })}

        ${renderSchoolEventPanel({
          panel: "minggu-efektif-fakultatif",
          label: "Panel 5",
          title: "Minggu Efektif Fakultatif"
        })}

        <section class="kalender-pendidikan-section">
          <div class="kalender-pendidikan-section-head">
            <div>
              <span class="dashboard-card-label">Panel 6</span>
              <h3>Hari-Hari Penting Nasional</h3>
              <p class="kalender-panel-copy">Khusus peringatan yang berhubungan dengan pendidikan, karakter, dan lingkungan.</p>
            </div>
          </div>
          <div class="table-container mapel-table-container">
            <table class="mapel-table kalender-pendidikan-table kalender-fixed-table">
              <thead>
                <tr>
                  <th>Aktif</th>
                  <th>Tanggal</th>
                  <th>Nama</th>
                  <th>Kategori</th>
                </tr>
              </thead>
              <tbody>${renderImportantFixedEventRows()}${renderImportantSchoolEventRows()}</tbody>
            </table>
          </div>
          <div class="kalender-pendidikan-actions">
            <button class="btn-secondary" onclick="addKalenderSchoolEvent('hari-penting')">Tambah Hari Penting</button>
          </div>
        </section>
        <section class="kalender-pendidikan-section">
          <div class="kalender-pendidikan-section-head">
            <div>
              <span class="dashboard-card-label">Ringkasan</span>
              <h3>Daftar Agenda Aktif</h3>
            </div>
          </div>
          <div class="table-container mapel-table-container">
            <table class="mapel-table kalender-pendidikan-table">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Nama</th>
                  <th>Kategori</th>
                  <th>Jenis</th>
                </tr>
              </thead>
              <tbody>${renderActiveEntries()}</tbody>
            </table>
          </div>
        </section>
        ` : ""}

        ${!isInputTab ? `
        <section id="kalenderPreviewSection" class="kalender-pendidikan-section">
          <div class="kalender-pendidikan-section-head">
            <div>
              <span class="dashboard-card-label">${isKaldikTab ? "Lembar Resmi" : "Rekap Pekan Efektif"}</span>
              <h3>${isKaldikTab ? "Preview KALDIK Sekolah" : "Preview RPE per Semester"}</h3>
            </div>
            <div class="kalender-pendidikan-actions">
              <button
                class="kalender-toggle-btn ${isKalenderSignatureEnabled(isKaldikTab ? "kaldik" : "rpe") ? "is-active" : ""}"
                onclick="toggleKalenderSignatureMode('${isKaldikTab ? "kaldik" : "rpe"}')"
                aria-label="${isKalenderSignatureEnabled(isKaldikTab ? "kaldik" : "rpe") ? "Nonaktifkan TTD" : "Aktifkan TTD"}"
                title="${isKalenderSignatureEnabled(isKaldikTab ? "kaldik" : "rpe") ? "TTD aktif" : "TTD nonaktif"}"
              >
                <span aria-hidden="true">${isKalenderSignatureEnabled(isKaldikTab ? "kaldik" : "rpe") ? "●" : "○"}</span>
              </button>
              <button class="btn-secondary" onclick="${isKaldikTab ? "exportKalenderKaldikPdf('a4')" : "exportKalenderRpePdf('a4')"}">PDF A4</button>
              <button class="btn-primary" onclick="${isKaldikTab ? "exportKalenderKaldikPdf('f4')" : "exportKalenderRpePdf('f4')"}">PDF F4</button>
            </div>
          </div>
          ${isKaldikTab ? renderKalenderOfficialSheet() : renderKalenderRpeView()}
        </section>
        ` : ""}
      </div>
      ${renderKalenderRangeModal()}
      ${renderKalenderSavingOverlay()}
    `;
  }

  function renderKalenderPendidikanState() {
    const container = global.document.getElementById("content");
    if (!container) return;
    container.innerHTML = renderKalenderPendidikanPage();
  }

  function setKalenderSavingState(isSaving) {
    isKalenderSaving = Boolean(isSaving);
    const overlay = global.document.getElementById("kalenderSavingOverlay");
    if (overlay) {
      overlay.style.display = isKalenderSaving ? "flex" : "none";
      overlay.setAttribute("aria-hidden", isKalenderSaving ? "false" : "true");
    }
  }

  function setKalenderPendidikanYear(value) {
    kalenderState.tahunPelajaran = String(value || "").trim() || getKalenderAcademicYear();
    const { startYear, endYear } = parseAcademicYears(kalenderState.tahunPelajaran);
    if (!kalenderState?.semesterStarts?.ganjil) {
      kalenderState.semesterStarts = { ...(kalenderState.semesterStarts || {}), ganjil: `${startYear}-07-14` };
    }
    if (!kalenderState?.semesterStarts?.genap) {
      kalenderState.semesterStarts = { ...(kalenderState.semesterStarts || {}), genap: `${endYear}-01-05` };
    }
    renderKalenderPendidikanState();
  }

  function setKalenderSemesterStart(semesterKey, value) {
    kalenderState.semesterStarts = {
      ...(kalenderState.semesterStarts || {}),
      [semesterKey]: String(value || "").trim()
    };
    renderKalenderPendidikanState();
  }

  function setKalenderWorkDays(value) {
    kalenderState.workDays = String(value || "5").trim() === "6" ? "6" : "5";
    renderKalenderPendidikanState();
  }

  function setKalenderPageTab(tab = "input") {
    kalenderPageTab = ["input", "kaldik", "rpe"].includes(tab) ? tab : "input";
    renderKalenderPendidikanState();
    if (kalenderPageTab !== "input") {
      global.requestAnimationFrame?.(() => {
        const previewSection = global.document.getElementById("kalenderPreviewSection");
        previewSection?.scrollIntoView?.({ behavior: "smooth", block: "start" });
      });
    }
  }

  function toggleKalenderSignatureMode(mode = "kaldik") {
    const normalizedMode = mode === "rpe" ? "rpe" : "kaldik";
    kalenderState.signatureModes = {
      kaldik: kalenderState?.signatureModes?.kaldik !== false,
      rpe: kalenderState?.signatureModes?.rpe !== false,
      [normalizedMode]: !isKalenderSignatureEnabled(normalizedMode)
    };
    renderKalenderPendidikanState();
  }

  function toggleKalenderFixedEvent(id) {
    kalenderState.fixedEvents = kalenderState.fixedEvents.map(item =>
      item.id === id ? { ...item, active: !item.active } : item
    );
    renderKalenderPendidikanState();
  }

  function toggleKalenderSchoolEvent(id) {
    kalenderState.schoolEvents = kalenderState.schoolEvents.map(item =>
      item.id === id ? { ...item, active: !item.active } : item
    );
    renderKalenderPendidikanState();
  }

  function updateKalenderSchoolEvent(id, field, value) {
    kalenderState.schoolEvents = kalenderState.schoolEvents.map(item => {
      if (item.id !== id) return item;
      if (field === "active") return { ...item, active: value === true };
      return { ...item, [field]: String(value || "").trim() };
    });
    renderKalenderPendidikanState();
  }

  function addKalenderSchoolEvent(panelKey = "kegiatan-sekolah") {
    const categoryByPanel = {
      "libur-sekolah": "Libur Sekolah",
      "kegiatan-sekolah": "Kegiatan Sekolah",
      "minggu-efektif-fakultatif": "Minggu Efektif Fakultatif",
      "hari-penting": "Hari Penting Nasional"
    };
    kalenderState.schoolEvents = kalenderState.schoolEvents.concat({
      id: makeSchoolEventId(),
      name: "",
      panel: panelKey,
      category: categoryByPanel[panelKey] || "Kegiatan Sekolah",
      startDate: "",
      endDate: "",
      active: false,
      note: ""
    });
    renderKalenderPendidikanState();
  }

  function openKalenderRangePicker(id) {
    const item = kalenderState.schoolEvents.find(entry => entry.id === id);
    if (!item) return;
    kalenderRangeDraft = {
      id,
      title: item.name || "Rentang Tanggal",
      startDate: item.startDate || "",
      endDate: item.endDate || item.startDate || ""
    };
    renderKalenderPendidikanState();
  }

  function closeKalenderRangePicker(event) {
    if (event?.target && event.target !== event.currentTarget) return;
    kalenderRangeDraft = null;
    renderKalenderPendidikanState();
  }

  function clearKalenderRange() {
    const startInput = global.document.getElementById("kalenderRangeStart");
    const endInput = global.document.getElementById("kalenderRangeEnd");
    if (startInput) startInput.value = "";
    if (endInput) endInput.value = "";
  }

  function applyKalenderRange() {
    if (!kalenderRangeDraft?.id) return;
    const startInput = global.document.getElementById("kalenderRangeStart");
    const endInput = global.document.getElementById("kalenderRangeEnd");
    const startDate = String(startInput?.value || "").trim();
    const endDate = String(endInput?.value || startDate || "").trim();
    kalenderState.schoolEvents = kalenderState.schoolEvents.map(item =>
      item.id === kalenderRangeDraft.id
        ? { ...item, startDate, endDate }
        : item
    );
    kalenderRangeDraft = null;
    renderKalenderPendidikanState();
  }

  function removeKalenderSchoolEvent(id) {
    kalenderState.schoolEvents = kalenderState.schoolEvents.filter(item => item.id !== id);
    renderKalenderPendidikanState();
  }

  async function saveKalenderPendidikan() {
    try {
      kalenderState = writeLocalState(kalenderState);
      setKalenderSavingState(true);
      await persistKalenderPendidikan();
      renderKalenderPendidikanState();
      setKalenderSavingState(false);
      showKalenderToast("Kalender pendidikan tersimpan.");
    } catch (error) {
      console.error(error);
      setKalenderSavingState(false);
      showKalenderToast("Kalender pendidikan gagal disimpan.", "error");
    }
  }

  global.renderKalenderPendidikanPage = renderKalenderPendidikanPage;
  global.loadRealtimeKalenderPendidikan = loadKalenderPendidikan;
  global.renderKalenderPendidikanState = renderKalenderPendidikanState;
  global.setKalenderPendidikanYear = setKalenderPendidikanYear;
  global.setKalenderWorkDays = setKalenderWorkDays;
  global.setKalenderPageTab = setKalenderPageTab;
  global.toggleKalenderSignatureMode = toggleKalenderSignatureMode;
  global.setKalenderSemesterStart = setKalenderSemesterStart;
  global.toggleKalenderFixedEvent = toggleKalenderFixedEvent;
  global.toggleKalenderSchoolEvent = toggleKalenderSchoolEvent;
  global.updateKalenderSchoolEvent = updateKalenderSchoolEvent;
  global.addKalenderSchoolEvent = addKalenderSchoolEvent;
  global.removeKalenderSchoolEvent = removeKalenderSchoolEvent;
  global.openKalenderRangePicker = openKalenderRangePicker;
  global.closeKalenderRangePicker = closeKalenderRangePicker;
  global.clearKalenderRange = clearKalenderRange;
  global.applyKalenderRange = applyKalenderRange;
  global.exportKalenderKaldikPdf = exportKalenderKaldikPdf;
  global.exportKalenderRpePdf = exportKalenderRpePdf;
  global.saveKalenderPendidikan = saveKalenderPendidikan;
  global.getKalenderRpeSummary = getRpeSemesterSummary;
})(window);
