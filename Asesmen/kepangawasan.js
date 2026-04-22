(function initKepangawasan(global) {
  if (global.renderKepangawasanPage) return;

  const STORAGE_KEY = "kepangawasanAsesmenState";
  const DEFAULT_ROWS = 12;
  const DEFAULT_TAB = "jadwal-ujian";
  const DAY_OPTIONS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const JAM_OPTIONS = ["Jam ke - 1", "Jam ke - 2"];
  const DEFAULT_DURATION_OPTIONS = [90, 120];
  const JENIS_UJIAN_OPTIONS = [
    "Asesmen Sumatif Tengah Semester",
    "Asesmen Sumatif Akhir Semester",
    "Asesmen Sumatif Akhir Tahun",
    "Asesmen Sumatif Akhir Jenjang"
  ];
  const PENGAWAS_COUNT_OPTIONS = [1, 2];
  const PEMBAGIAN_URUTAN_OPTIONS = [
    { value: "urut", label: "Urut" },
    { value: "acak", label: "Acak" }
  ];
  const KARTU_PENGAWAS_COLLECTION = "kepangawasan_kartu_guru";
  const TAB_OPTIONS = [
    { key: "jadwal-ujian", label: "Jadwal Ujian" },
    { key: "jadwal-mengawasi", label: "Jadwal Mengawasi" },
    { key: "pembagian-ruang", label: "Pembagian Ruang" },
    { key: "kartu-pengawas", label: "Kartu Pengawas" }
  ];

  let kepangawasanMapelOptions = [];
  let kepangawasanGuruOptions = [];
  let kepangawasanState = loadKepangawasanState();

  function escapeHtml(value) {
    if (global.AppUtils?.escapeHtml) return global.AppUtils.escapeHtml(value);
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeJs(value) {
    return String(value ?? "")
      .replace(/\\/g, "\\\\")
      .replace(/'/g, "\\'");
  }

  function normalizeTab(tab) {
    return TAB_OPTIONS.some(item => item.key === tab) ? tab : DEFAULT_TAB;
  }

  function createEmptyRow() {
    return { hari: "", tanggal: "", jam: "", jamMulai: "", durasiMenit: "", mapel: "" };
  }

  function ensureRows(rows) {
    const normalized = Array.isArray(rows) ? rows.slice(0, DEFAULT_ROWS).map(item => ({
      hari: String(item?.hari || "").trim(),
      tanggal: String(item?.tanggal || "").trim(),
      jam: String(item?.jam || "").trim(),
      jamMulai: normalizeKepangawasanTimeValue(item?.jamMulai),
      durasiMenit: normalizeKepangawasanDurationValue(item?.durasiMenit),
      mapel: String(item?.mapel || "").trim()
    })) : [];
    while (normalized.length < DEFAULT_ROWS) normalized.push(createEmptyRow());
    return normalized;
  }

  function normalizeKepangawasanTimeValue(value) {
    const text = String(value || "").trim();
    return /^\d{2}:\d{2}$/.test(text) ? text : "";
  }

  function normalizeKepangawasanDurationValue(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) return "";
    return String(Math.round(numeric));
  }

  function normalizeMengawasiMatrix(matrix) {
    const source = matrix && typeof matrix === "object" ? matrix : {};
    return Object.entries(source).reduce((accumulator, [kodeGuru, row]) => {
      const normalizedKode = String(kodeGuru || "").trim();
      if (!normalizedKode) return accumulator;
      accumulator[normalizedKode] = Object.entries(row && typeof row === "object" ? row : {}).reduce((slotRow, [slotKey, value]) => {
        const normalizedKey = String(slotKey || "").trim();
        if (!normalizedKey) return slotRow;
        slotRow[normalizedKey] = value === true;
        return slotRow;
      }, {});
      return accumulator;
    }, {});
  }

  function normalizePembagianRuangCount(value) {
    return Math.max(1, Math.min(30, Number(value) || 1));
  }

  function normalizePembagianPengawasCount(value) {
    return PENGAWAS_COUNT_OPTIONS.includes(Number(value)) ? Number(value) : 1;
  }

  function normalizePembagianUrutan(value) {
    return String(value || "").trim().toLowerCase() === "acak" ? "acak" : "urut";
  }

  function normalizePembagianAssignments(assignments) {
    const source = assignments && typeof assignments === "object" ? assignments : {};
    return Object.entries(source).reduce((accumulator, [slotKey, roomMap]) => {
      const normalizedSlotKey = String(slotKey || "").trim();
      if (!normalizedSlotKey) return accumulator;
      accumulator[normalizedSlotKey] = Object.entries(roomMap && typeof roomMap === "object" ? roomMap : {}).reduce((roomAccumulator, [roomKey, values]) => {
        const normalizedRoomKey = String(roomKey || "").trim();
        if (!normalizedRoomKey) return roomAccumulator;
        roomAccumulator[normalizedRoomKey] = Array.isArray(values)
          ? values.map(item => String(item || "").trim()).filter(Boolean)
          : [];
        return roomAccumulator;
      }, {});
      return accumulator;
    }, {});
  }

  function loadKepangawasanState() {
    try {
      const parsed = JSON.parse(global.localStorage.getItem(STORAGE_KEY) || "{}");
      return {
        activeTab: normalizeTab(parsed?.activeTab),
        examType: JENIS_UJIAN_OPTIONS.includes(String(parsed?.examType || "").trim())
          ? String(parsed?.examType || "").trim()
          : JENIS_UJIAN_OPTIONS[1],
        startDate: String(parsed?.startDate || "").trim(),
        endDate: String(parsed?.endDate || "").trim(),
        printDate: String(parsed?.printDate || "").trim(),
        useKepalaTtd: parsed?.useKepalaTtd === true,
        publishKartuDashboard: parsed?.publishKartuDashboard === true,
        rows: ensureRows(parsed?.rows),
        mengawasiMatrix: normalizeMengawasiMatrix(parsed?.mengawasiMatrix),
        pembagianRuangCount: normalizePembagianRuangCount(parsed?.pembagianRuangCount),
        pembagianPengawasCount: normalizePembagianPengawasCount(parsed?.pembagianPengawasCount),
        pembagianUrutan: normalizePembagianUrutan(parsed?.pembagianUrutan),
        pembagianAssignments: normalizePembagianAssignments(parsed?.pembagianAssignments)
      };
    } catch (error) {
      console.error("Gagal memuat state kepangawasan", error);
      return {
        activeTab: DEFAULT_TAB,
        examType: JENIS_UJIAN_OPTIONS[1],
        startDate: "",
        endDate: "",
        printDate: "",
        useKepalaTtd: false,
        publishKartuDashboard: false,
        rows: ensureRows([]),
        mengawasiMatrix: {},
        pembagianRuangCount: 1,
        pembagianPengawasCount: 1,
        pembagianUrutan: "urut",
        pembagianAssignments: {}
      };
    }
  }

  function saveKepangawasanState() {
    global.localStorage.setItem(STORAGE_KEY, JSON.stringify({
      activeTab: kepangawasanState.activeTab,
      examType: String(kepangawasanState.examType || "").trim() || JENIS_UJIAN_OPTIONS[1],
      startDate: kepangawasanState.startDate,
      endDate: kepangawasanState.endDate,
      printDate: kepangawasanState.printDate,
      useKepalaTtd: kepangawasanState.useKepalaTtd === true,
      publishKartuDashboard: kepangawasanState.publishKartuDashboard === true,
      rows: ensureRows(kepangawasanState.rows),
      mengawasiMatrix: normalizeMengawasiMatrix(kepangawasanState.mengawasiMatrix),
      pembagianRuangCount: normalizePembagianRuangCount(kepangawasanState.pembagianRuangCount),
      pembagianPengawasCount: normalizePembagianPengawasCount(kepangawasanState.pembagianPengawasCount),
      pembagianUrutan: normalizePembagianUrutan(kepangawasanState.pembagianUrutan),
      pembagianAssignments: normalizePembagianAssignments(kepangawasanState.pembagianAssignments)
    }));
  }

  function getKepangawasanDateOptions() {
    const start = kepangawasanState.startDate;
    const end = kepangawasanState.endDate;
    if (!start || !end) return [];
    const startDate = new Date(`${start}T00:00:00`);
    const endDate = new Date(`${end}T00:00:00`);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || startDate > endDate) return [];

    const dates = [];
    const cursor = new Date(startDate.getTime());
    while (cursor <= endDate) {
      dates.push(formatLocalIsoDate(cursor));
      cursor.setDate(cursor.getDate() + 1);
      if (dates.length > 60) break;
    }
    return dates;
  }

  function formatLocalIsoDate(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function formatTanggalLabel(value) {
    if (global.AppUtils?.formatDateId) {
      return global.AppUtils.formatDateId(value, { day: "2-digit", month: "long", year: "numeric" }, value || "-");
    }
    if (!value) return "-";
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric"
    });
  }

  function showKepangawasanToast(title, icon = "success") {
    if (global.Swal?.fire) {
      global.Swal.fire({
        toast: true,
        position: "top-end",
        icon,
        title,
        showConfirmButton: false,
        timer: 2200,
        timerProgressBar: true
      });
      return;
    }
    console.log(title);
  }

  function getHariFromDate(value) {
    if (!value) return "";
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return "";
    const map = {
      1: "Senin",
      2: "Selasa",
      3: "Rabu",
      4: "Kamis",
      5: "Jumat",
      6: "Sabtu"
    };
    return map[date.getDay()] || "";
  }

  function getMapelLabel(item = {}) {
    const nama = String(item?.nama_mapel || "").trim();
    const kode = String(item?.kode_mapel || "").trim();
    if (nama && kode) return `${nama} (${kode})`;
    return nama || kode;
  }

  async function loadRealtimeKepangawasan() {
    try {
      if (typeof global.loadKepalaSekolahTtdSettings === "function") {
        await global.loadKepalaSekolahTtdSettings();
      }
      const [mapelSnapshot, guruSnapshot] = await Promise.all([
        global.SupabaseDocuments.collection("mapel")
          .orderBy("kode_mapel")
          .get(),
        global.SupabaseDocuments.collection("guru")
          .orderBy("kode_guru")
          .get()
      ]);
      kepangawasanMapelOptions = mapelSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .map(item => ({
          value: getMapelLabel(item),
          sortKey: `${String(item?.nama_mapel || "").trim()} ${String(item?.kode_mapel || "").trim()}`.trim()
        }))
        .filter(item => item.value)
        .sort((left, right) => left.sortKey.localeCompare(right.sortKey, undefined, {
          sensitivity: "base",
          numeric: true
        }));
      kepangawasanGuruOptions = guruSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .map(item => ({
          kode_guru: String(item?.kode_guru || item?.id || "").trim(),
          nama: String(item?.nama || item?.nama_guru || "").trim()
        }))
        .filter(item => item.kode_guru || item.nama)
        .sort((left, right) => String(left.kode_guru || "").localeCompare(String(right.kode_guru || ""), undefined, {
          sensitivity: "base",
          numeric: true
        }));
    } catch (error) {
      console.error("Gagal memuat daftar mapel untuk kepangawasan", error);
      kepangawasanMapelOptions = [];
      kepangawasanGuruOptions = [];
    }
    renderKepangawasanState();
  }

  function renderSelectOptions(options, selected, placeholder) {
    const current = String(selected || "").trim();
    const values = Array.from(new Set((options || []).filter(Boolean)));
    const extra = current && !values.includes(current)
      ? [`<option value="${escapeHtml(current)}" selected>${escapeHtml(current)}</option>`]
      : [];
    return [
      `<option value="">${escapeHtml(placeholder)}</option>`,
      ...extra,
      ...values.map(value => `<option value="${escapeHtml(value)}" ${value === current ? "selected" : ""}>${escapeHtml(value)}</option>`)
    ].join("");
  }

  function renderKepangawasanRows() {
    const dateOptions = getKepangawasanDateOptions();
    const mapelOptions = kepangawasanMapelOptions.map(item => item.value);
    return ensureRows(kepangawasanState.rows).map((row, index) => `
      <tr>
        <td class="kepangawasan-row-number">${index + 1}</td>
        <td>
          <select class="kelas-inline-select" onchange="setKepangawasanRowField(${index}, 'hari', this.value)">
            ${renderSelectOptions(DAY_OPTIONS, row.hari, "Pilih hari")}
          </select>
        </td>
        <td>
          <select class="kelas-inline-select" onchange="setKepangawasanRowDate(${index}, this.value)" ${dateOptions.length ? "" : "disabled"}>
            ${renderSelectOptions(dateOptions, row.tanggal, dateOptions.length ? "Pilih tanggal" : "Pilih rentang dulu")}
          </select>
        </td>
        <td>
          <select class="kelas-inline-select" onchange="setKepangawasanRowField(${index}, 'jam', this.value)">
            ${renderSelectOptions(JAM_OPTIONS, row.jam, "Pilih jam")}
          </select>
        </td>
        <td>
          <div class="kepangawasan-time-grid">
            <input
              class="kelas-inline-select"
              type="time"
              value="${escapeHtml(row.jamMulai || getKepangawasanDefaultStartTime(row.jam))}"
              onchange="setKepangawasanRowField(${index}, 'jamMulai', this.value)"
            >
            <input
              class="kelas-inline-select"
              type="number"
              min="1"
              step="5"
              value="${escapeHtml(row.durasiMenit || getKepangawasanDefaultDuration(row.jam))}"
              placeholder="Durasi"
              onchange="setKepangawasanRowField(${index}, 'durasiMenit', this.value)"
            >
          </div>
        </td>
        <td>
          <select class="kelas-inline-select" onchange="setKepangawasanRowField(${index}, 'mapel', this.value)" ${mapelOptions.length ? "" : "disabled"}>
            ${renderSelectOptions(mapelOptions, row.mapel, mapelOptions.length ? "Pilih mapel" : "Mapel belum tersedia")}
          </select>
        </td>
      </tr>
    `).join("");
  }

  function getKepangawasanSemesterInfo() {
    const stored = global.AppUtils?.getStorageJson
      ? global.AppUtils.getStorageJson("appSemester", {})
      : {};
    return {
      semester: String(stored?.semester || "").trim(),
      tahun: String(stored?.tahun || "").trim()
    };
  }

  function getKepangawasanDocumentSettings() {
    const raporSettings = typeof global.getRaporSettings === "function" ? global.getRaporSettings() : {};
    const semesterInfo = getKepangawasanSemesterInfo();
    return {
      tahun: semesterInfo.tahun || String(raporSettings?.tahun || "").trim() || "2025/2026",
      examType: JENIS_UJIAN_OPTIONS.includes(String(kepangawasanState.examType || "").trim())
        ? String(kepangawasanState.examType || "").trim()
        : JENIS_UJIAN_OPTIONS[1],
      tanggalTtd: String(kepangawasanState.printDate || "").trim() || String(raporSettings?.tanggal || "").trim() || formatLocalIsoDate(new Date()),
      kepalaNama: String(raporSettings?.kepala_nama || "").trim() || "Dra. MAMIK SASMIATI, M.Pd",
      kepalaNip: String(raporSettings?.kepala_nip || "").trim() || "19660601 199003 2 010",
      kepalaTtd: typeof global.getKepalaSekolahTtdImage === "function"
        ? String(global.getKepalaSekolahTtdImage() || "").trim()
        : String(raporSettings?.kepala_ttd || "").trim(),
      useKepalaTtd: kepangawasanState.useKepalaTtd === true
    };
  }

  function getKepangawasanTodayIso() {
    return formatLocalIsoDate(new Date());
  }

  function getKepangawasanPrintSettings(useCurrentDate = false) {
    const base = getKepangawasanDocumentSettings();
    if (!useCurrentDate) return base;
    return {
      ...base,
      tanggalTtd: getKepangawasanTodayIso()
    };
  }

  function getPrintableAssetUrl(path = "") {
    try {
      return new URL(path, global.location.href).href;
    } catch {
      return path;
    }
  }

  function getKepangawasanDocumentsApi() {
    return global.SupabaseDocuments;
  }

  function getKepangawasanCurrentUser() {
    return global.DashboardShell?.getCurrentAppUser?.()
      || (global.AppUtils?.getStorageJson ? global.AppUtils.getStorageJson("appUser", {}) : {})
      || {};
  }

  function getKepangawasanCurrentRole() {
    return String(getKepangawasanCurrentUser()?.role || "").trim().toLowerCase();
  }

  function canPublishKartuPengawasToGuru() {
    return ["admin", "superadmin"].includes(getKepangawasanCurrentRole());
  }

  function getKepangawasanTermContext() {
    if (typeof global.getActiveSemesterContext === "function") {
      const context = global.getActiveSemesterContext() || {};
      return {
        id: String(context?.id || "legacy").trim() || "legacy",
        semester: String(context?.semester || "").trim(),
        tahun: String(context?.tahun || "").trim()
      };
    }
    const stored = global.AppUtils?.getStorageJson
      ? global.AppUtils.getStorageJson("appSemester", {})
      : {};
    return {
      id: String(stored?.id || "legacy").trim() || "legacy",
      semester: String(stored?.semester || "").trim(),
      tahun: String(stored?.tahun || "").trim()
    };
  }

  function normalizeKartuPengawasDocPart(value = "") {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "x";
  }

  function getKartuPengawasPublishDocId(kodeGuru = "", termId = "") {
    return `${normalizeKartuPengawasDocPart(termId || "legacy")}__${normalizeKartuPengawasDocPart(kodeGuru || "guru")}`;
  }

  function buildKartuPengawasPublishPayload(record = {}, settings = {}, publishedAt = "", sender = {}, termContext = {}) {
    const rows = Array.isArray(record.rows) ? record.rows : [];
    const activeRows = rows.filter(row => String(row?.ruangLabel || "-").trim() !== "-");
    return {
      type: "kartu_pengawas",
      term_id: String(termContext?.id || "legacy").trim() || "legacy",
      semester: String(termContext?.semester || "").trim(),
      tahun: String(termContext?.tahun || settings?.tahun || "").trim(),
      exam_type: String(settings?.examType || "").trim(),
      kode_guru: String(record?.kode_guru || "").trim(),
      nama_guru: String(record?.nama || "").trim(),
      sent_at: String(publishedAt || "").trim() || new Date().toISOString(),
      sent_by_username: String(sender?.username || sender?.id || "").trim(),
      sent_by_name: String(sender?.nama || sender?.username || "").trim(),
      sent_by_role: String(sender?.role || "").trim(),
      total_rows: rows.length,
      active_row_count: activeRows.length,
      rows: rows.map(row => ({
        hari: String(row?.hari || "").trim(),
        tanggal: String(row?.tanggal || "").trim(),
        jam: String(row?.jam || "").trim(),
        time_label: String(row?.timeLabel || getKepangawasanRowTimeLabel(row) || "").trim(),
        mapel: String(row?.mapel || "").trim(),
        mapel_short: String(row?.mapelShort || getKepangawasanMapelShortLabel(row?.mapel) || "").trim(),
        ruang_label: String(row?.ruangLabel || "-").trim() || "-"
      })),
      updated_at: new Date().toISOString()
    };
  }

  async function deletePublishedKartuPengawasForTerm() {
    const documentsApi = getKepangawasanDocumentsApi();
    if (!documentsApi?.collection || !documentsApi?.batch) return 0;
    const termContext = getKepangawasanTermContext();
    const collection = documentsApi.collection(KARTU_PENGAWAS_COLLECTION);
    const snapshot = typeof collection.where === "function"
      ? await collection.where("term_id", "==", termContext.id).get()
      : await collection.get();
    const docs = (snapshot?.docs || []).filter(doc => {
      const data = typeof doc.data === "function" ? doc.data() : {};
      return String(data?.type || "").trim() === "kartu_pengawas"
        && String(data?.term_id || "").trim() === String(termContext.id || "legacy").trim();
    });
    if (!docs.length) return 0;
    const batch = documentsApi.batch();
    docs.forEach(doc => batch.delete(doc.ref || collection.doc(doc.id)));
    await batch.commit();
    return docs.length;
  }

  function openKepangawasanPrintHtml(html, documentTitle, popupBlockedMessage) {
    if (global.AppPrint?.openHtml) {
      global.AppPrint.openHtml(html, {
        documentTitle,
        popupBlockedMessage,
        autoPrint: true,
        printDelayMs: 450
      });
      return true;
    }
    const printWindow = global.open("", "_blank");
    if (!printWindow) {
      global.Swal?.fire?.("Popup diblokir", popupBlockedMessage, "warning");
      return false;
    }
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    global.setTimeout(() => printWindow.print(), 450);
    return true;
  }

  function getKepangawasanJamOrder(value = "") {
    const text = String(value || "").trim().toLowerCase();
    if (["jam ke - 1", "jam ke-1", "1", "i"].includes(text)) return 1;
    if (["jam ke - 2", "jam ke-2", "2", "ii"].includes(text)) return 2;
    return 99;
  }

  function getKepangawasanJamRoman(value = "") {
    const order = getKepangawasanJamOrder(value);
    if (order === 1) return "I";
    if (order === 2) return "II";
    return String(value || "-").trim() || "-";
  }

  function getKepangawasanDefaultStartTime(value = "") {
    const order = getKepangawasanJamOrder(value);
    if (order === 1) return "07:30";
    if (order === 2) return "10:00";
    return "";
  }

  function getKepangawasanDefaultDuration(value = "") {
    const order = getKepangawasanJamOrder(value);
    if (order === 1) return "120";
    if (order === 2) return "90";
    return "";
  }

  function formatKepangawasanDisplayTime(value = "") {
    return String(value || "").trim().replace(":", ".");
  }

  function getKepangawasanRowTimeLabel(row = {}) {
    const jamMulai = normalizeKepangawasanTimeValue(row?.jamMulai) || getKepangawasanDefaultStartTime(row?.jam);
    const durationText = normalizeKepangawasanDurationValue(row?.durasiMenit) || getKepangawasanDefaultDuration(row?.jam);
    const duration = Number(durationText || 0);
    if (!jamMulai || !duration) {
      const order = getKepangawasanJamOrder(row?.jam);
      if (order === 1) return "07.30 - 09.30";
      if (order === 2) return "10.00 - 11.30";
      return "-";
    }
    const [hourText, minuteText] = jamMulai.split(":");
    const baseMinutes = (Number(hourText || 0) * 60) + Number(minuteText || 0);
    const endMinutes = baseMinutes + duration;
    const endHour = String(Math.floor(endMinutes / 60) % 24).padStart(2, "0");
    const endMinute = String(endMinutes % 60).padStart(2, "0");
    return `${formatKepangawasanDisplayTime(jamMulai)} - ${endHour}.${endMinute}`;
  }

  function getKepangawasanMapelCode(value = "") {
    const text = String(value || "").trim();
    if (!text) return "-";
    const match = text.match(/\(([^)]+)\)\s*$/);
    return match ? String(match[1] || "").trim() || text : text;
  }

  function getKepangawasanMapelShortLabel(value = "") {
    const text = String(value || "").trim();
    if (!text) return "-";
    const baseLabel = text.replace(/\s*\([^)]+\)\s*$/, "").trim();
    const normalized = baseLabel.toLowerCase();
    const shortMap = {
      "bahasa indonesia": "B. Indonesia",
      "pendidikan agama dan bp": "Agama & BP",
      "pendidikan agama islam dan bp": "PAI & BP",
      "matematika": "Matematika",
      "ppkn": "PPKn",
      "bahasa inggris": "B. Inggris",
      "ips": "IPS",
      "ipa": "IPA",
      "pjok": "PJOK",
      "informatika": "Informatika",
      "bahasa daerah": "B. Daerah",
      "seni budaya": "Seni Budaya",
      "bta / mulok sekolah": "BTA / Mulok",
      "bta/mulok sekolah": "BTA / Mulok"
    };
    if (shortMap[normalized]) return shortMap[normalized];
    if (baseLabel.length <= 16) return baseLabel;
    return getKepangawasanMapelCode(text);
  }

  function formatKepangawasanShortDate(value = "") {
    if (!value) return "-";
    const parts = String(value || "").split("-");
    if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
    return value;
  }

  function makeKepangawasanSlotKey(tanggal = "", jam = "") {
    return `${String(tanggal || "").trim()}__jam${getKepangawasanJamOrder(jam)}`;
  }

  function getKepangawasanFilledRows() {
    return ensureRows(kepangawasanState.rows)
      .filter(row => [row.hari, row.tanggal, row.jam, row.jamMulai, row.durasiMenit, row.mapel].some(value => String(value || "").trim()))
      .filter(row => String(row.tanggal || "").trim() && String(row.jam || "").trim() && String(row.mapel || "").trim())
      .sort((left, right) => {
        const dateCompare = String(left.tanggal || "").localeCompare(String(right.tanggal || ""));
        if (dateCompare !== 0) return dateCompare;
        return getKepangawasanJamOrder(left.jam) - getKepangawasanJamOrder(right.jam);
      });
  }

  function getPembagianRuangScheduleRows() {
    return getKepangawasanFilledRows().map(row => ({
      ...row,
      slotKey: makeKepangawasanSlotKey(row.tanggal, row.jam),
      mapelCode: getKepangawasanMapelCode(row.mapel),
      mapelShort: getKepangawasanMapelShortLabel(row.mapel),
      timeLabel: getKepangawasanRowTimeLabel(row),
      jadwalLabel: `${String(row.hari || getHariFromDate(row.tanggal) || "-").trim()} | ${formatMengawasiHeaderDate(row.tanggal)} | ${getKepangawasanRowTimeLabel(row)} | ${getKepangawasanMapelShortLabel(row.mapel)}`
    }));
  }

  function getPembagianRuangGroupedScheduleRows() {
    const grouped = [];
    getPembagianRuangScheduleRows().forEach(row => {
      const key = `${row.tanggal}__${row.hari || getHariFromDate(row.tanggal)}`;
      const lastGroup = grouped[grouped.length - 1];
      if (!lastGroup || lastGroup.key !== key) {
        grouped.push({
          key,
          hari: row.hari || getHariFromDate(row.tanggal),
          tanggal: row.tanggal,
          rows: [row]
        });
        return;
      }
      lastGroup.rows.push(row);
    });
    return grouped;
  }

  function getPembagianRoomKeys() {
    return Array.from({ length: normalizePembagianRuangCount(kepangawasanState.pembagianRuangCount) }, (_, index) => `ruang_${index + 1}`);
  }

  function getAvailableGuruCodesForScheduleRow(scheduleRow) {
    return kepangawasanGuruOptions
      .map(item => String(item.kode_guru || "").trim())
      .filter(Boolean)
      .filter(kodeGuru => getMengawasiSlotValue(kodeGuru, scheduleRow.slotKey));
  }

  function pickOrderedGuru(availableCodes, usedInRow, roomHistory, roomKey, startIndexRef, ignoreRoomHistory = false) {
    if (!availableCodes.length) return "";
    for (let offset = 0; offset < availableCodes.length; offset += 1) {
      const index = (startIndexRef.value + offset) % availableCodes.length;
      const kodeGuru = availableCodes[index];
      if (usedInRow.has(kodeGuru)) continue;
      if (!ignoreRoomHistory && roomHistory[roomKey]?.has(kodeGuru)) continue;
      startIndexRef.value = (index + 1) % availableCodes.length;
      return kodeGuru;
    }
    return "";
  }

  function pickRandomGuru(availableCodes, usedInRow, roomHistory, roomKey, ignoreRoomHistory = false) {
    const eligible = availableCodes.filter(kodeGuru => {
      if (usedInRow.has(kodeGuru)) return false;
      if (!ignoreRoomHistory && roomHistory[roomKey]?.has(kodeGuru)) return false;
      return true;
    });
    if (!eligible.length) return "";
    return eligible[Math.floor(Math.random() * eligible.length)] || "";
  }

  function pickBalancedRandomGuru(
    availableCodes,
    usedInRow,
    roomHistory,
    roomKey,
    assignmentCounts,
    ignoreRoomHistory = false
  ) {
    const eligible = availableCodes.filter(kodeGuru => {
      if (usedInRow.has(kodeGuru)) return false;
      if (!ignoreRoomHistory && roomHistory[roomKey]?.has(kodeGuru)) return false;
      return true;
    });
    if (!eligible.length) return "";
    const minCount = eligible.reduce((lowest, kodeGuru) => {
      const count = Number(assignmentCounts?.[kodeGuru] || 0);
      return Math.min(lowest, count);
    }, Number.MAX_SAFE_INTEGER);
    const fairestPool = eligible.filter(kodeGuru => Number(assignmentCounts?.[kodeGuru] || 0) === minCount);
    return fairestPool[Math.floor(Math.random() * fairestPool.length)] || "";
  }

  function generatePembagianRuangAssignments() {
    const scheduleRows = getPembagianRuangScheduleRows();
    const roomKeys = getPembagianRoomKeys();
    const invigilatorCount = normalizePembagianPengawasCount(kepangawasanState.pembagianPengawasCount);
    const isRandom = normalizePembagianUrutan(kepangawasanState.pembagianUrutan) === "acak";
    const assignments = {};
    const roomHistory = roomKeys.reduce((accumulator, roomKey) => {
      accumulator[roomKey] = new Set();
      return accumulator;
    }, {});
    const orderedIndexRef = { value: 0 };
    const assignmentCounts = kepangawasanGuruOptions.reduce((accumulator, guru) => {
      const kodeGuru = String(guru.kode_guru || "").trim();
      if (kodeGuru) accumulator[kodeGuru] = 0;
      return accumulator;
    }, {});

    scheduleRows.forEach(scheduleRow => {
      const availableCodes = getAvailableGuruCodesForScheduleRow(scheduleRow);
      const usedInRow = new Set();
      assignments[scheduleRow.slotKey] = {};
      roomKeys.forEach(roomKey => {
        const pickedCodes = [];
        for (let counter = 0; counter < invigilatorCount; counter += 1) {
          const ignoreRoomHistory = invigilatorCount === 2;
          const kodeGuru = isRandom
            ? pickBalancedRandomGuru(availableCodes, usedInRow, roomHistory, roomKey, assignmentCounts, ignoreRoomHistory)
            : pickOrderedGuru(availableCodes, usedInRow, roomHistory, roomKey, orderedIndexRef, ignoreRoomHistory);
          if (!kodeGuru) continue;
          pickedCodes.push(kodeGuru);
          usedInRow.add(kodeGuru);
          assignmentCounts[kodeGuru] = Number(assignmentCounts[kodeGuru] || 0) + 1;
          if (invigilatorCount !== 2) roomHistory[roomKey].add(kodeGuru);
        }
        assignments[scheduleRow.slotKey][roomKey] = pickedCodes;
      });
    });

    return assignments;
  }

  function getKepangawasanGroupedRows() {
    const grouped = [];
    getKepangawasanFilledRows().forEach(row => {
      const key = `${row.tanggal}__${row.hari || getHariFromDate(row.tanggal)}`;
      const lastGroup = grouped[grouped.length - 1];
      if (!lastGroup || lastGroup.key !== key) {
        grouped.push({
          key,
          hari: row.hari || getHariFromDate(row.tanggal),
          tanggal: row.tanggal,
          items: [row]
        });
        return;
      }
      lastGroup.items.push(row);
    });
    return grouped;
  }

  function formatKepangawasanPrintDateLabel(dateValue = "") {
    const formatted = global.AppUtils?.formatDateId
      ? global.AppUtils.formatDateId(dateValue, { day: "numeric", month: "long", year: "numeric" }, dateValue || "-")
      : formatTanggalLabel(dateValue);
    return String(formatted || "-").toUpperCase();
  }

  function renderKepangawasanPrintTableRows() {
    return getKepangawasanGroupedRows().map((group, index) => {
      const rowspan = group.items.length;
      const tanggalLabel = formatKepangawasanPrintDateLabel(group.tanggal);
      return group.items.map((row, rowIndex) => `
        <tr>
          ${rowIndex === 0 ? `<td rowspan="${rowspan}" class="kepangawasan-print-no">${index + 1}</td>` : ""}
          ${rowIndex === 0 ? `
            <td rowspan="${rowspan}" class="kepangawasan-print-day">
              <strong>${escapeHtml(String(group.hari || getHariFromDate(group.tanggal) || "-").toUpperCase())}</strong>
              <span>${escapeHtml(tanggalLabel)}</span>
            </td>
          ` : ""}
          <td class="kepangawasan-print-center">${escapeHtml(getKepangawasanJamRoman(row.jam))}</td>
          <td class="kepangawasan-print-center">${escapeHtml(getKepangawasanRowTimeLabel(row))}</td>
          <td>${escapeHtml(row.mapel || "-")}</td>
        </tr>
      `).join("");
    }).join("");
  }

  function getKepangawasanPrintHtml() {
    const settings = getKepangawasanDocumentSettings();
    const groupedRows = getKepangawasanGroupedRows();
    const tableRows = renderKepangawasanPrintTableRows();
    const printDate = global.AppUtils?.formatDateId
      ? global.AppUtils.formatDateId(settings.tanggalTtd, { day: "numeric", month: "long", year: "numeric" }, settings.tanggalTtd || "-")
      : formatTanggalLabel(settings.tanggalTtd);

    return `<!doctype html>
      <html lang="id">
        <head>
          <meta charset="utf-8">
          <title>${escapeHtml(settings.examType)} ${escapeHtml(settings.tahun)}</title>
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              font-family: "Times New Roman", Georgia, serif;
              color: #111827;
              background: #f3f4f6;
            }
            .kepangawasan-print-toolbar {
              position: sticky;
              top: 0;
              z-index: 10;
              display: flex;
              gap: 10px;
              justify-content: center;
              padding: 12px;
              background: rgba(255, 255, 255, 0.96);
              border-bottom: 1px solid #d1d5db;
            }
            .kepangawasan-print-toolbar button {
              border: 0;
              border-radius: 999px;
              padding: 10px 18px;
              font: inherit;
              font-weight: 700;
              cursor: pointer;
              color: #fff;
              background: #0f766e;
            }
            .kepangawasan-print-sheet {
              width: 210mm;
              min-height: 297mm;
              margin: 10mm auto;
              padding: 14mm 14mm 18mm;
              background: #fff;
              box-shadow: 0 12px 36px rgba(15, 23, 42, 0.12);
            }
            .kepangawasan-print-header {
              display: grid;
              grid-template-columns: 78px 1fr 78px;
              gap: 14px;
              align-items: center;
              padding-bottom: 10px;
              border-bottom: 3px solid #111827;
            }
            .kepangawasan-print-logo {
              width: 64px;
              height: 64px;
              object-fit: contain;
              justify-self: center;
            }
            .kepangawasan-print-head-text {
              text-align: center;
              line-height: 1.25;
            }
            .kepangawasan-print-head-text h1,
            .kepangawasan-print-head-text h2,
            .kepangawasan-print-head-text p {
              margin: 0;
            }
            .kepangawasan-print-head-text h1 {
              font-size: 17px;
              font-weight: 700;
              letter-spacing: 0.03em;
            }
            .kepangawasan-print-head-text h2 {
              font-size: 16px;
              margin-top: 2px;
              font-weight: 800;
            }
            .kepangawasan-print-head-text p {
              font-size: 12px;
              margin-top: 4px;
              font-style: italic;
            }
            .kepangawasan-print-title {
              margin: 20px 0 14px;
              text-align: center;
              line-height: 1.35;
            }
            .kepangawasan-print-title h3,
            .kepangawasan-print-title h4,
            .kepangawasan-print-title p {
              margin: 0;
            }
            .kepangawasan-print-title h3 {
              font-size: 18px;
              font-weight: 800;
            }
            .kepangawasan-print-title h4 {
              font-size: 16px;
              font-weight: 800;
            }
            .kepangawasan-print-title p {
              font-size: 15px;
              font-weight: 700;
            }
            .kepangawasan-print-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 8px;
              font-size: 13px;
            }
            .kepangawasan-print-table th,
            .kepangawasan-print-table td {
              border: 1px solid #6b7280;
              padding: 8px 7px;
              vertical-align: middle;
              line-height: 1.2;
            }
            .kepangawasan-print-table th {
              text-align: center;
              font-weight: 800;
              background: #f3f4f6;
              height: 38px;
            }
            .kepangawasan-print-table tbody td {
              height: 34px;
            }
            .kepangawasan-print-no {
              width: 42px;
              text-align: center;
              font-weight: 700;
            }
            .kepangawasan-print-day {
              width: 160px;
              text-align: center;
            }
            .kepangawasan-print-day strong,
            .kepangawasan-print-day span {
              display: block;
            }
            .kepangawasan-print-day strong {
              font-size: 14px;
              margin-bottom: 4px;
            }
            .kepangawasan-print-day span {
              font-size: 12px;
            }
            .kepangawasan-print-center {
              text-align: center;
              width: 88px;
            }
            .kepangawasan-print-signature {
              width: 255px;
              margin-left: auto;
              margin-top: 18px;
              text-align: left;
              line-height: 1.35;
            }
            .kepangawasan-print-signature span,
            .kepangawasan-print-signature strong,
            .kepangawasan-print-signature small {
              display: block;
            }
            .kepangawasan-print-signature-space {
              min-height: 76px;
              display: flex;
              align-items: center;
              justify-content: flex-start;
            }
            .kepangawasan-print-signature-space img {
              max-width: 160px;
              max-height: 72px;
              object-fit: contain;
            }
            .kepangawasan-print-signature-placeholder {
              height: 72px;
            }
            .kepangawasan-print-signature strong {
              margin-top: 4px;
              font-size: 14px;
              text-decoration: underline;
            }
            .kepangawasan-print-signature small {
              font-size: 13px;
            }
            .kepangawasan-print-empty {
              padding: 18px;
              border: 1px dashed #9ca3af;
              text-align: center;
              font-size: 14px;
              color: #4b5563;
            }
            @page {
              size: A4 portrait;
              margin: 0;
            }
            @media print {
              body {
                background: #fff;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .kepangawasan-print-toolbar { display: none; }
              .kepangawasan-print-sheet {
                margin: 0;
                box-shadow: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="kepangawasan-print-toolbar">
            <button type="button" onclick="window.print()">Print / Simpan PDF</button>
          </div>
          <section class="kepangawasan-print-sheet">
            <header class="kepangawasan-print-header">
              <img class="kepangawasan-print-logo" src="${escapeHtml(getPrintableAssetUrl("img/logo_pemda.png"))}" alt="Logo Pemda">
              <div class="kepangawasan-print-head-text">
                <h1>PEMERINTAH KABUPATEN JEMBER</h1>
                <h2>SMP NEGERI 1 UMBULSARI</h2>
                <p>Jl. PB. Sudirman 12, Gumuksari - Umbulsari - Jember, Telp. (0336) 321441</p>
                <p>Email: smpn1umbulsari@yahoo.com</p>
              </div>
              <img class="kepangawasan-print-logo" src="${escapeHtml(getPrintableAssetUrl("img/logo_sekolah.png"))}" alt="Logo Sekolah">
            </header>

            <div class="kepangawasan-print-title">
              <h3>JADWAL</h3>
              <h4>${escapeHtml(String(settings.examType || "").toUpperCase())}</h4>
              <p>TAHUN PELAJARAN ${escapeHtml(settings.tahun)}</p>
            </div>

            ${groupedRows.length ? `
              <table class="kepangawasan-print-table">
                <thead>
                  <tr>
                    <th>NO</th>
                    <th>HARI/TANGGAL</th>
                    <th>JAM KE</th>
                    <th>WAKTU</th>
                    <th>MATA PELAJARAN</th>
                  </tr>
                </thead>
                <tbody>${tableRows}</tbody>
              </table>
            ` : `<div class="kepangawasan-print-empty">Belum ada jadwal ujian yang siap dicetak. Lengkapi tanggal, jam, dan mapel terlebih dahulu.</div>`}

            <div class="kepangawasan-print-signature">
              <span>Umbulsari, ${escapeHtml(printDate)}</span>
              <span>Kepala SMPN 1 Umbulsari</span>
              <div class="kepangawasan-print-signature-space">
                ${settings.useKepalaTtd && settings.kepalaTtd
                  ? `<img src="${escapeHtml(settings.kepalaTtd)}" alt="TTD Kepala Sekolah">`
                  : `<div class="kepangawasan-print-signature-placeholder"></div>`}
              </div>
              <strong>${escapeHtml(settings.kepalaNama)}</strong>
              <small>NIP. ${escapeHtml(settings.kepalaNip)}</small>
            </div>
          </section>
        </body>
      </html>`;
  }

  function exportKepangawasanJadwalPdf() {
    const filledRows = getKepangawasanFilledRows();
    if (!filledRows.length) {
      global.Swal?.fire?.("Jadwal belum lengkap", "Isi tanggal, jam, dan mapel minimal satu baris sebelum cetak PDF.", "warning");
      return;
    }
    const settings = getKepangawasanDocumentSettings();
    const html = getKepangawasanPrintHtml();
    if (global.AppPrint?.openHtml) {
      global.AppPrint.openHtml(html, {
        documentTitle: `${settings.examType} ${settings.tahun}`,
        popupBlockedMessage: "Izinkan popup browser untuk cetak PDF jadwal ujian.",
        autoPrint: true,
        printDelayMs: 450
      });
      return;
    }
    const printWindow = global.open("", "_blank");
    if (!printWindow) {
      global.Swal?.fire?.("Popup diblokir", "Izinkan popup browser untuk cetak PDF jadwal ujian.", "warning");
      return;
    }
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    global.setTimeout(() => printWindow.print(), 450);
  }

  function renderJadwalUjianTab() {
    const dateOptions = getKepangawasanDateOptions();
    const docSettings = getKepangawasanDocumentSettings();
    return `
      <div class="kepangawasan-grid kepangawasan-grid-single">
        <section class="card kepangawasan-panel">
          <div class="asesmen-page-head kepangawasan-head">
            <div>
              <span class="dashboard-eyebrow">Asesmen</span>
              <h2>Jadwal Ujian</h2>
              <p>Admin menentukan rentang tanggal ujian lalu mengisi 12 baris jadwal ujian dengan hari, tanggal, jam, dan mapel.</p>
            </div>
          </div>

          <div class="kepangawasan-range-grid">
            <label class="kepangawasan-field">
              <span>Jenis ujian</span>
              <select onchange="setKepangawasanExamType(this.value)">
                ${JENIS_UJIAN_OPTIONS.map(option => `<option value="${escapeHtml(option)}" ${option === String(kepangawasanState.examType || "").trim() ? "selected" : ""}>${escapeHtml(option)}</option>`).join("")}
              </select>
            </label>
            <label class="kepangawasan-field">
              <span>Tanggal mulai ujian</span>
              <input type="date" value="${escapeHtml(kepangawasanState.startDate)}" onchange="setKepangawasanDateRange('startDate', this.value)">
            </label>
            <label class="kepangawasan-field">
              <span>Tanggal akhir ujian</span>
              <input type="date" value="${escapeHtml(kepangawasanState.endDate)}" onchange="setKepangawasanDateRange('endDate', this.value)">
            </label>
            <label class="kepangawasan-field">
              <span>Tanggal cetak</span>
              <input type="date" value="${escapeHtml(kepangawasanState.printDate)}" onchange="setKepangawasanPrintDate(this.value)">
            </label>
          </div>

          <div class="kepangawasan-summary">
            <span>${dateOptions.length ? `${dateOptions.length} tanggal ujian tersedia` : "Rentang tanggal ujian belum dipilih"}</span>
            <div class="kepangawasan-actions">
              <label class="kepangawasan-toggle">
                <input type="checkbox" ${kepangawasanState.useKepalaTtd ? "checked" : ""} onchange="setKepangawasanUseKepalaTtd(this.checked)">
                <span class="kepangawasan-toggle-track"></span>
                <span class="kepangawasan-toggle-label">Scan TTD KS ${kepangawasanState.useKepalaTtd ? "Aktif" : "Nonaktif"}</span>
              </label>
              <button type="button" class="btn-primary" onclick="exportKepangawasanJadwalPdf()">Cetak PDF</button>
              <button type="button" class="btn-secondary" onclick="resetKepangawasanRows()">Reset Tabel</button>
            </div>
          </div>

          <section class="card kepangawasan-side-panel">
            <h3>Catatan Input</h3>
            <ul class="kepangawasan-notes">
              <li>Pilih rentang tanggal ujian terlebih dahulu agar dropdown tanggal aktif.</li>
              <li>Kolom Hari tetap bisa disesuaikan manual, tetapi akan otomatis terisi saat tanggal dipilih.</li>
              <li>Dropdown Mapel mengambil data dari daftar mapel yang sudah ada di sistem.</li>
              <li>Data tersimpan otomatis di browser perangkat ini.</li>
              <li>PDF memakai desain resmi seperti contoh, tanpa stempel. Scan TTD KS hanya tampil jika toggle diaktifkan.</li>
            </ul>

            <div class="kepangawasan-side-summary">
              <strong>Ringkasan rentang</strong>
              <span>${kepangawasanState.startDate ? formatTanggalLabel(kepangawasanState.startDate) : "-"}</span>
              <span>${kepangawasanState.endDate ? formatTanggalLabel(kepangawasanState.endDate) : "-"}</span>
              <span>Tanggal cetak: ${docSettings.tanggalTtd ? formatTanggalLabel(docSettings.tanggalTtd) : "-"}</span>
              <span>TTD KS: ${kepangawasanState.useKepalaTtd && docSettings.kepalaTtd ? "Aktif" : "Nonaktif"}</span>
            </div>
          </section>

          <div class="table-container kepangawasan-table-wrap">
            <table class="kepangawasan-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Hari</th>
                  <th>Tanggal</th>
                  <th>Jam ke</th>
                  <th>Waktu</th>
                  <th>Mapel</th>
                </tr>
              </thead>
              <tbody>
                ${renderKepangawasanRows()}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    `;
  }

  function getMengawasiSlotValue(kodeGuru, slotKey) {
    return kepangawasanState.mengawasiMatrix?.[kodeGuru]?.[slotKey] === true;
  }

  function isMengawasiRowAllActive(kodeGuru, slots = []) {
    const targetKode = String(kodeGuru || "").trim();
    if (!targetKode || !slots.length) return false;
    return slots.every(slot => getMengawasiSlotValue(targetKode, slot.key));
  }

  function isMengawasiAllMatrixActive(slots = [], guruRows = []) {
    if (!slots.length || !guruRows.length) return false;
    return guruRows.every(guru => isMengawasiRowAllActive(guru.kode_guru, slots));
  }

  function formatMengawasiHeaderDate(value = "") {
    if (!value) return "-";
    const [year, month, day] = String(value || "").split("-");
    if (!year || !month || !day) return value;
    return `${day}/${month}`;
  }

  function getKepangawasanMengawasiSlots() {
    const groupedRows = getKepangawasanGroupedRows();
    if (groupedRows.length) {
      return groupedRows.map(group => ({
        date: group.tanggal,
        dateLabel: formatMengawasiHeaderDate(group.tanggal),
        items: group.items
          .slice()
          .sort((left, right) => getKepangawasanJamOrder(left.jam) - getKepangawasanJamOrder(right.jam))
          .map(item => ({
            key: `${String(group.tanggal || "").trim()}__jam${getKepangawasanJamOrder(item.jam)}`,
            jamLabel: String(item.jam || "").trim() || `Jam ke ${getKepangawasanJamOrder(item.jam)}`
          }))
      }));
    }

    return Array.from({ length: 6 }, (_, dayIndex) => ({
      date: "",
      dateLabel: `Hari ${dayIndex + 1}`,
      items: [
        { key: `hari${dayIndex + 1}_jam1`, jamLabel: "Jam ke 1" },
        { key: `hari${dayIndex + 1}_jam2`, jamLabel: "Jam ke 2" }
      ]
    }));
  }

  function renderJadwalMengawasiTab() {
    const guruRows = kepangawasanGuruOptions;
    const slotGroups = getKepangawasanMengawasiSlots();
    const flatSlots = slotGroups.flatMap(group => group.items);
    return `
      <div class="kepangawasan-grid kepangawasan-grid-single">
        <section class="card kepangawasan-panel">
          <div class="asesmen-page-head kepangawasan-head">
            <div>
              <span class="dashboard-eyebrow">Asesmen</span>
              <h2>Jadwal Mengawasi</h2>
              <p>Tabel matriks ini menentukan guru bisa atau tidak dijadwalkan mengawasi pada hari dan jam tertentu.</p>
            </div>
          </div>

          <div class="kepangawasan-summary">
            <span>${guruRows.length ? `${guruRows.length} guru tersedia untuk diatur` : "Data guru belum tersedia"}</span>
            <div class="kepangawasan-actions">
              <button type="button" class="btn-secondary" onclick="resetKepangawasanMengawasiMatrix()">Reset Matriks</button>
            </div>
          </div>

          <div class="kepangawasan-inline-notes">
            <strong>Petunjuk Matriks</strong>
            <span>Header tanggal diambil dari Jadwal Ujian, dari tanggal paling awal sampai paling akhir.</span>
            <span>Setiap tanggal memiliki subkolom Jam ke 1 dan Jam ke 2.</span>
            <span>Toggle On berarti guru bisa mengawasi pada slot itu, Off berarti tidak dijadwalkan mengawasi.</span>
          </div>

          <div class="table-container matrix-table-wrap kepangawasan-matrix-wrap">
            <table class="matrix-table kepangawasan-matrix-table">
              <thead>
                <tr>
                  <th rowspan="2">No</th>
                  <th rowspan="2">Nama Guru</th>
                  <th rowspan="2">
                    <div class="kepangawasan-matrix-header-toggle">
                      <span>Semua</span>
                      <label class="kepangawasan-toggle kepangawasan-toggle-inline kepangawasan-toggle-mini">
                        <input
                          type="checkbox"
                          ${isMengawasiAllMatrixActive(flatSlots, guruRows) ? "checked" : ""}
                          onchange="setKepangawasanMengawasiAll(this.checked)"
                        >
                        <span class="kepangawasan-toggle-track"></span>
                      </label>
                    </div>
                  </th>
                  ${slotGroups.map(group => `<th colspan="${group.items.length}">${escapeHtml(group.dateLabel)}</th>`).join("")}
                </tr>
                <tr>
                  ${flatSlots.map(slot => `<th>${escapeHtml(slot.jamLabel.replace("Jam ke - ", "Jam ke ").replace("Jam ke-", "Jam ke "))}</th>`).join("")}
                </tr>
              </thead>
              <tbody>
                ${guruRows.length ? guruRows.map((guru, index) => `
                  <tr>
                    <td class="kepangawasan-matrix-code">${index + 1}</td>
                    <td class="kepangawasan-matrix-name">
                      <strong>${escapeHtml(guru.nama || "-")}</strong>
                      <small>${escapeHtml(guru.kode_guru || "-")}</small>
                    </td>
                    <td class="kepangawasan-matrix-cell kepangawasan-matrix-master">
                      <label class="kepangawasan-toggle kepangawasan-toggle-inline kepangawasan-toggle-mini">
                        <input
                          type="checkbox"
                          ${isMengawasiRowAllActive(guru.kode_guru, flatSlots) ? "checked" : ""}
                          onchange="setKepangawasanMengawasiRow('${escapeJs(guru.kode_guru)}', this.checked)"
                        >
                        <span class="kepangawasan-toggle-track"></span>
                      </label>
                    </td>
                    ${flatSlots.map(slot => {
                      const isActive = getMengawasiSlotValue(guru.kode_guru, slot.key);
                      return `
                        <td class="kepangawasan-matrix-cell">
                          <label class="kepangawasan-toggle kepangawasan-toggle-inline kepangawasan-toggle-mini">
                            <input
                              type="checkbox"
                              ${isActive ? "checked" : ""}
                              onchange="setKepangawasanMengawasiCell('${escapeJs(guru.kode_guru)}', '${escapeJs(slot.key)}', this.checked)"
                            >
                            <span class="kepangawasan-toggle-track"></span>
                          </label>
                        </td>
                      `;
                    }).join("")}
                  </tr>
                `).join("") : `
                  <tr>
                    <td colspan="${3 + flatSlots.length}" class="kepangawasan-empty-cell">Data guru belum tersedia.</td>
                  </tr>
                `}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    `;
  }

  function renderPlaceholderTab(title, description) {
    return `
      <section class="card kepangawasan-placeholder">
        <span class="dashboard-eyebrow">Asesmen</span>
        <h2>${escapeHtml(title)}</h2>
        <p>${escapeHtml(description)}</p>
      </section>
    `;
  }

  function getPembagianRoomCellValue(slotKey, roomKey) {
    const values = kepangawasanState.pembagianAssignments?.[slotKey]?.[roomKey];
    return Array.isArray(values) && values.length ? values.join(" / ") : "-";
  }

  function getGuruNameByCode(kodeGuru = "") {
    const target = String(kodeGuru || "").trim();
    if (!target) return "-";
    return kepangawasanGuruOptions.find(item => String(item.kode_guru || "").trim() === target)?.nama || target;
  }

  function getPembagianRoomNumberLabel(roomKey = "") {
    const match = String(roomKey || "").match(/ruang_(\d+)/i);
    return match ? String(Number(match[1])) : String(roomKey || "").trim();
  }

  function getKartuPengawasRecords() {
    const scheduleRows = getPembagianRuangScheduleRows();
    const roomKeys = getPembagianRoomKeys();
    const involvedGuruCodes = new Set();
    Object.values(kepangawasanState.pembagianAssignments || {}).forEach(roomMap => {
      Object.values(roomMap || {}).forEach(values => {
        (Array.isArray(values) ? values : []).forEach(kode => {
          if (String(kode || "").trim()) involvedGuruCodes.add(String(kode || "").trim());
        });
      });
    });

    const sortedCodes = Array.from(involvedGuruCodes).sort((left, right) => left.localeCompare(right, undefined, {
      sensitivity: "base",
      numeric: true
    }));

    return sortedCodes.map(kodeGuru => ({
      kode_guru: kodeGuru,
      nama: getGuruNameByCode(kodeGuru),
      rows: scheduleRows.map(row => {
        const assignedRooms = roomKeys
          .filter(roomKey => {
            const roomValues = kepangawasanState.pembagianAssignments?.[row.slotKey]?.[roomKey];
            return Array.isArray(roomValues) && roomValues.includes(kodeGuru);
          })
          .map(roomKey => getPembagianRoomNumberLabel(roomKey));
        return {
          ...row,
          ruangLabel: assignedRooms.length ? assignedRooms.join(", ") : "-"
        };
      })
    }));
  }

  function renderPembagianRuangPrintRows() {
    const groupedRows = getPembagianRuangGroupedScheduleRows();
    const roomKeys = getPembagianRoomKeys();
    let rowNumber = 0;
    return groupedRows.map(group => {
      const rowspan = group.rows.length;
      return group.rows.map((row, index) => {
        rowNumber += 1;
        return `
          <tr>
            <td class="kepangawasan-print-no">${rowNumber}</td>
            ${index === 0 ? `<td rowspan="${rowspan}" class="kepangawasan-print-day-compact"><strong>${escapeHtml(String(group.hari || "-").toUpperCase())}</strong><span>${escapeHtml(formatKepangawasanShortDate(group.tanggal))}</span></td>` : ""}
            <td class="kepangawasan-print-center">${escapeHtml(row.timeLabel || getKepangawasanRowTimeLabel(row))}</td>
            <td class="kepangawasan-print-mapel">${escapeHtml(row.mapelShort || getKepangawasanMapelShortLabel(row.mapel))}</td>
            ${roomKeys.map(roomKey => `<td class="kepangawasan-print-center">${escapeHtml(getPembagianRoomCellValue(row.slotKey, roomKey))}</td>`).join("")}
          </tr>
        `;
      }).join("");
    }).join("");
  }

  function getPembagianRuangPrintHtml() {
    const settings = getKepangawasanPrintSettings(true);
    const scheduleRows = getPembagianRuangScheduleRows();
    const roomKeys = getPembagianRoomKeys();
    const tableRows = renderPembagianRuangPrintRows();
    const printDate = global.AppUtils?.formatDateId
      ? global.AppUtils.formatDateId(settings.tanggalTtd, { day: "numeric", month: "long", year: "numeric" }, settings.tanggalTtd || "-")
      : formatTanggalLabel(settings.tanggalTtd);
    return `<!doctype html>
      <html lang="id">
        <head>
          <meta charset="utf-8">
          <title>Pembagian Ruang ${escapeHtml(settings.examType)} ${escapeHtml(settings.tahun)}</title>
          <style>
            * { box-sizing: border-box; }
            body { margin: 0; font-family: "Times New Roman", Georgia, serif; color: #111827; background: #f3f4f6; }
            .kepangawasan-print-toolbar { position: sticky; top: 0; z-index: 10; display: flex; gap: 10px; justify-content: center; padding: 12px; background: rgba(255,255,255,0.96); border-bottom: 1px solid #d1d5db; }
            .kepangawasan-print-toolbar button { border: 0; border-radius: 999px; padding: 10px 18px; font: inherit; font-weight: 700; cursor: pointer; color: #fff; background: #0f766e; }
            .kepangawasan-print-sheet { width: 297mm; height: 210mm; margin: 0 auto; padding: 8mm 9mm 10mm; background: #fff; box-shadow: 0 12px 36px rgba(15,23,42,0.12); overflow: hidden; }
            .kepangawasan-print-header { display: grid; grid-template-columns: 64px 1fr 64px; gap: 10px; align-items: center; padding-bottom: 7px; border-bottom: 2px solid #111827; }
            .kepangawasan-print-logo { width: 54px; height: 54px; object-fit: contain; justify-self: center; }
            .kepangawasan-print-head-text { text-align: center; line-height: 1.25; }
            .kepangawasan-print-head-text h1, .kepangawasan-print-head-text h2, .kepangawasan-print-head-text p { margin: 0; }
            .kepangawasan-print-head-text h1 { font-size: 14px; font-weight: 700; letter-spacing: 0.03em; }
            .kepangawasan-print-head-text h2 { font-size: 18px; margin-top: 1px; font-weight: 800; }
            .kepangawasan-print-head-text p { font-size: 10px; margin-top: 2px; font-style: italic; }
            .kepangawasan-print-title { margin: 10px 0 8px; text-align: center; line-height: 1.2; }
            .kepangawasan-print-title h3, .kepangawasan-print-title p { margin: 0; }
            .kepangawasan-print-title h3 { font-size: 16px; font-weight: 800; }
            .kepangawasan-print-title p { font-size: 12px; font-weight: 700; }
            .kepangawasan-print-table { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 10px; table-layout: fixed; }
            .kepangawasan-print-table th, .kepangawasan-print-table td { border: 1px solid #6b7280; padding: 4px 3px; vertical-align: middle; line-height: 1.15; }
            .kepangawasan-print-table th { text-align: center; font-weight: 800; background: #f3f4f6; height: 28px; }
            .kepangawasan-print-table tbody td { height: 24px; }
            .kepangawasan-print-no { width: 24px; text-align: center; font-weight: 700; }
            .kepangawasan-print-center { text-align: center; }
            .kepangawasan-print-day-compact { width: 58px; text-align: center; line-height: 1.15; }
            .kepangawasan-print-day-compact strong, .kepangawasan-print-day-compact span { display: block; }
            .kepangawasan-print-day-compact strong { font-size: 10px; }
            .kepangawasan-print-day-compact span { margin-top: 3px; font-size: 10px; font-weight: 700; }
            .kepangawasan-print-mapel { width: 50px; text-align: center; font-weight: 700; }
            .kepangawasan-print-empty { padding: 18px; border: 1px dashed #9ca3af; text-align: center; font-size: 14px; color: #4b5563; }
            .kepangawasan-print-signature { width: 220px; margin-left: auto; margin-top: 8px; text-align: left; line-height: 1.2; }
            .kepangawasan-print-signature span, .kepangawasan-print-signature strong, .kepangawasan-print-signature small { display: block; }
            .kepangawasan-print-signature-space { min-height: 50px; display: flex; align-items: center; justify-content: flex-start; }
            .kepangawasan-print-signature-space img { max-width: 125px; max-height: 48px; object-fit: contain; }
            .kepangawasan-print-signature-placeholder { height: 48px; }
            .kepangawasan-print-signature strong { margin-top: 3px; font-size: 12px; text-decoration: underline; }
            .kepangawasan-print-signature small, .kepangawasan-print-signature span { font-size: 10px; }
            @page { size: A4 landscape; margin: 0; }
            @media print { body { background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; } .kepangawasan-print-toolbar { display: none; } .kepangawasan-print-sheet { margin: 0; box-shadow: none; } }
          </style>
        </head>
        <body>
          <div class="kepangawasan-print-toolbar"><button type="button" onclick="window.print()">Print / Simpan PDF</button></div>
          <section class="kepangawasan-print-sheet">
            <header class="kepangawasan-print-header">
              <img class="kepangawasan-print-logo" src="${escapeHtml(getPrintableAssetUrl("img/logo_pemda.png"))}" alt="Logo Pemda">
              <div class="kepangawasan-print-head-text">
                <h1>PEMERINTAH KABUPATEN JEMBER</h1>
                <h2>SMP NEGERI 1 UMBULSARI</h2>
                <p>Jl. PB. Sudirman 12, Gumuksari - Umbulsari - Jember, Telp. (0336) 321441</p>
                <p>Email: smpn1umbulsari@yahoo.com</p>
              </div>
              <img class="kepangawasan-print-logo" src="${escapeHtml(getPrintableAssetUrl("img/logo_sekolah.png"))}" alt="Logo Sekolah">
            </header>
            <div class="kepangawasan-print-title">
              <h3>PEMBAGIAN RUANG PENGAWAS</h3>
              <p>${escapeHtml(String(settings.examType || "").toUpperCase())}</p>
              <p>TAHUN PELAJARAN ${escapeHtml(settings.tahun)}</p>
            </div>
            ${scheduleRows.length ? `
              <table class="kepangawasan-print-table">
                <thead>
                  <tr>
                    <th>NO</th>
                    <th>TANGGAL</th>
                    <th>JAM</th>
                    <th>MAPEL</th>
                    ${roomKeys.map((roomKey, index) => `<th>${escapeHtml(String(index + 1))}</th>`).join("")}
                  </tr>
                </thead>
                <tbody>${tableRows}</tbody>
              </table>
            ` : `<div class="kepangawasan-print-empty">Belum ada sebaran pembagian ruang yang siap dicetak.</div>`}
            <div class="kepangawasan-print-signature">
              <span>Umbulsari, ${escapeHtml(printDate)}</span>
              <span>Kepala SMPN 1 Umbulsari</span>
              <div class="kepangawasan-print-signature-space">
                ${settings.useKepalaTtd && settings.kepalaTtd ? `<img src="${escapeHtml(settings.kepalaTtd)}" alt="TTD Kepala Sekolah">` : `<div class="kepangawasan-print-signature-placeholder"></div>`}
              </div>
              <strong>${escapeHtml(settings.kepalaNama)}</strong>
              <small>NIP. ${escapeHtml(settings.kepalaNip)}</small>
            </div>
          </section>
        </body>
      </html>`;
  }

  function renderPembagianRuangTab() {
    const groupedRows = getPembagianRuangGroupedScheduleRows();
    const roomCount = normalizePembagianRuangCount(kepangawasanState.pembagianRuangCount);
    const roomKeys = getPembagianRoomKeys();
    return `
      <div class="kepangawasan-grid kepangawasan-grid-single">
        <section class="card kepangawasan-panel">
          <div class="asesmen-page-head kepangawasan-head">
            <div>
              <span class="dashboard-eyebrow">Asesmen</span>
              <h2>Pembagian Ruang</h2>
              <p>Atur jumlah ruang, jumlah pengawas, dan urutan penempatan, lalu generate sebaran pengawas per jadwal ujian.</p>
            </div>
          </div>

          <div class="kepangawasan-settings-panel">
            <label class="kepangawasan-field">
              <span>Jumlah ruang</span>
              <input type="number" min="1" max="30" value="${escapeHtml(roomCount)}" onchange="setKepangawasanPembagianField('pembagianRuangCount', this.value)">
            </label>
            <label class="kepangawasan-field">
              <span>Jumlah pengawas</span>
              <select onchange="setKepangawasanPembagianField('pembagianPengawasCount', this.value)">
                ${PENGAWAS_COUNT_OPTIONS.map(value => `<option value="${value}" ${value === normalizePembagianPengawasCount(kepangawasanState.pembagianPengawasCount) ? "selected" : ""}>${value}</option>`).join("")}
              </select>
            </label>
            <label class="kepangawasan-field">
              <span>Urutan</span>
              <select onchange="setKepangawasanPembagianField('pembagianUrutan', this.value)">
                ${PEMBAGIAN_URUTAN_OPTIONS.map(item => `<option value="${escapeHtml(item.value)}" ${item.value === normalizePembagianUrutan(kepangawasanState.pembagianUrutan) ? "selected" : ""}>${escapeHtml(item.label)}</option>`).join("")}
              </select>
            </label>
            <div class="kepangawasan-field kepangawasan-field-toggle">
              <span>TTD kepala sekolah</span>
              <label class="kepangawasan-toggle">
                <input type="checkbox" ${kepangawasanState.useKepalaTtd ? "checked" : ""} onchange="setKepangawasanUseKepalaTtd(this.checked)">
                <span class="kepangawasan-toggle-track"></span>
                <span class="kepangawasan-toggle-label">${kepangawasanState.useKepalaTtd ? "Aktif" : "Nonaktif"}</span>
              </label>
            </div>
            <div class="kepangawasan-actions kepangawasan-settings-actions">
              <button type="button" class="btn-secondary" onclick="applyKepangawasanPembagianSettings()">Set</button>
              <button type="button" class="btn-primary" onclick="generateKepangawasanPembagianRuang()">Generate</button>
              <button type="button" class="btn-secondary" onclick="exportKepangawasanPembagianRuangPdf()">Cetak PDF</button>
            </div>
          </div>

          <div class="kepangawasan-inline-notes">
            <strong>Sebaran Jadwal</strong>
            <span>Kolom Jadwal Ujian diambil dari tab Jadwal Ujian.</span>
            <span>Kolom ruang mengikuti jumlah ruang pada pengaturan di atas.</span>
            <span>Generate hanya menempatkan guru yang tersedia pada matriks Jadwal Mengawasi.</span>
          </div>

          <div class="table-container kepangawasan-distribution-wrap">
            <table class="mapel-table kepangawasan-distribution-table">
              <thead>
                <tr>
                  <th rowspan="2" class="kepangawasan-distribution-main-head">Jadwal Ujian</th>
                  <th colspan="${roomKeys.length}" class="kepangawasan-distribution-main-head">Ruang</th>
                </tr>
                <tr>
                  ${roomKeys.map((roomKey, index) => `<th class="kepangawasan-distribution-room-head">${escapeHtml(String(index + 1))}</th>`).join("")}
                </tr>
              </thead>
              <tbody>
                ${groupedRows.length ? groupedRows.map(group => {
                  const rowspan = group.rows.length * 2;
                  return group.rows.map((row, index) => `
                    <tr>
                      ${index === 0 ? `<td rowspan="${rowspan}" class="kepangawasan-distribution-schedule"><strong>${escapeHtml(String(group.hari || "-").trim())}</strong><small>${escapeHtml(formatKepangawasanShortDate(group.tanggal))}</small></td>` : ""}
                      ${roomKeys.map(roomKey => `<td><span class="kepangawasan-distribution-cell-main">${escapeHtml(getPembagianRoomCellValue(row.slotKey, roomKey))}</span>${index === 0 ? "" : ""}</td>`).join("")}
                    </tr>
                    <tr class="kepangawasan-distribution-meta-row">
                      <td colspan="${roomKeys.length}" class="kepangawasan-distribution-meta">${escapeHtml(`${row.timeLabel || getKepangawasanRowTimeLabel(row)} | ${row.mapelShort || getKepangawasanMapelShortLabel(row.mapel)}`)}</td>
                    </tr>
                  `).join("");
                }).join("") : `
                  <tr>
                    <td colspan="${1 + roomKeys.length}" class="kepangawasan-empty-cell">Jadwal ujian belum tersedia. Isi tab Jadwal Ujian terlebih dahulu.</td>
                  </tr>
                `}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    `;
  }

  function renderKartuPengawasTableRows(record = {}) {
    const grouped = [];
    (record.rows || []).forEach(row => {
      const key = `${row.tanggal}__${row.hari || getHariFromDate(row.tanggal)}`;
      const last = grouped[grouped.length - 1];
      if (!last || last.key !== key) {
        grouped.push({
          key,
          hari: row.hari || getHariFromDate(row.tanggal),
          rows: [row]
        });
        return;
      }
      last.rows.push(row);
    });

    return grouped.map(group => {
      const rowspan = group.rows.length;
      return group.rows.map((row, index) => `
        <tr>
          ${index === 0 ? `<td rowspan="${rowspan}" class="kepangawasan-card-day">${escapeHtml(String(group.hari || "-").toUpperCase())}</td>` : ""}
          <td class="kepangawasan-card-time">${escapeHtml(row.timeLabel || getKepangawasanRowTimeLabel(row))}</td>
          <td>${escapeHtml(row.mapelShort || getKepangawasanMapelShortLabel(row.mapel))}</td>
          <td class="kepangawasan-card-room">${escapeHtml(row.ruangLabel || "-")}</td>
        </tr>
      `).join("");
    }).join("");
  }

  function renderKartuPengawasCards(records = []) {
    if (!records.length) {
      return `<div class="kepangawasan-empty-card">Belum ada kartu pengawas yang bisa ditampilkan. Generate pembagian ruang terlebih dahulu.</div>`;
    }
    return records.map(record => `
      <article class="kepangawasan-card-item">
        <div class="kepangawasan-card-item-head">
          <div>
            <span class="dashboard-eyebrow kepangawasan-card-badge">Pengawas</span>
            <h3>${escapeHtml(record.nama || "-")}</h3>
            <p>${escapeHtml(String(getKepangawasanDocumentSettings().examType || "").toUpperCase())}</p>
          </div>
          <div class="kepangawasan-card-accent">
            <span>${escapeHtml(String((record.rows || []).filter(row => String(row.ruangLabel || "-").trim() !== "-").length || 0))}</span>
            <small>Jadwal</small>
          </div>
        </div>
        <div class="table-container kepangawasan-card-table-wrap">
          <table class="kepangawasan-card-table">
            <thead>
              <tr>
                <th>Hari</th>
                <th>Waktu</th>
                <th>Mata Pelajaran</th>
                <th>Ruang</th>
              </tr>
            </thead>
            <tbody>${renderKartuPengawasTableRows(record)}</tbody>
          </table>
        </div>
      </article>
    `).join("");
  }

  function getSelectedKartuPengawasCode() {
    return String(global.document.getElementById("kepangawasanCardGuruSelect")?.value || "").trim();
  }

  function getFilteredKartuPengawasRecords() {
    const selectedCode = getSelectedKartuPengawasCode();
    const records = getKartuPengawasRecords();
    if (!selectedCode) return records;
    return records.filter(record => String(record.kode_guru || "").trim() === selectedCode);
  }

  function renderKartuPengawasTab() {
    const records = getKartuPengawasRecords();
    const filteredRecords = getFilteredKartuPengawasRecords();
    const canPublish = canPublishKartuPengawasToGuru();
    return `
      <div class="kepangawasan-grid kepangawasan-grid-single">
        <section class="card kepangawasan-panel">
          <div class="asesmen-page-head kepangawasan-head">
            <div>
              <span class="dashboard-eyebrow">Asesmen</span>
              <h2>Kartu Pengawas</h2>
              <p>Kartu pengawas menampilkan sebaran ruang pengawasan per guru berdasarkan jadwal ujian dan hasil pembagian ruang.</p>
            </div>
          </div>

          <div class="kepangawasan-settings-panel kepangawasan-card-toolbar">
            <label class="kepangawasan-field">
              <span>Pilih guru</span>
              <select id="kepangawasanCardGuruSelect" onchange="renderKepangawasanState()">
                <option value="">Semua guru</option>
                ${records.map(record => `<option value="${escapeHtml(record.kode_guru)}" ${record.kode_guru === getSelectedKartuPengawasCode() ? "selected" : ""}>${escapeHtml(`${record.nama} (${record.kode_guru})`)}</option>`).join("")}
              </select>
            </label>
            ${canPublish ? `
              <div class="kepangawasan-field kepangawasan-field-toggle">
                <span>Tampil di dashboard guru</span>
                <label class="kepangawasan-toggle">
                  <input type="checkbox" ${kepangawasanState.publishKartuDashboard ? "checked" : ""} onchange="setKartuPengawasDashboardVisibility(this.checked)">
                  <span class="kepangawasan-toggle-track"></span>
                  <span class="kepangawasan-toggle-label">${kepangawasanState.publishKartuDashboard ? "Aktif" : "Nonaktif"}</span>
                </label>
              </div>
            ` : ""}
            <div class="kepangawasan-actions kepangawasan-settings-actions">
              <button type="button" class="btn-secondary" onclick="printKartuPengawasSelected()">Cetak Guru</button>
              <button type="button" class="btn-primary" onclick="printKartuPengawasAll()">Cetak Semua</button>
            </div>
          </div>

          <div class="kepangawasan-inline-notes">
            <strong>Catatan Kartu</strong>
            <span>Jadwal ujian diambil dari tab Jadwal Ujian.</span>
            <span>Ruang pengawasan diambil dari tab Pembagian Ruang.</span>
            <span>Hasil cetak kartu dibuat ringkas tanpa kop dan tanpa TTD kepala sekolah.</span>
            ${canPublish ? `<span>Jika toggle aktif, kartu pengawas akan tampil di dashboard guru sesuai kode guru masing-masing. Jika nonaktif, kartu akan disembunyikan.</span>` : ""}
          </div>

          <div class="kepangawasan-card-grid">
            ${renderKartuPengawasCards(filteredRecords)}
          </div>
        </section>
      </div>
    `;
  }

  function getKartuPengawasPrintHtml(records = []) {
    const settings = getKepangawasanPrintSettings(true);
    const cardSheets = records.map(record => `
      <section class="kartu-print-sheet">
        <div class="kartu-print-meta">
          <span class="kartu-print-eyebrow">Jadwal Pengawas</span>
          <strong>${escapeHtml(record.nama || "-")}</strong>
          <span>${escapeHtml(String(settings.examType || "").toUpperCase())} | TP ${escapeHtml(settings.tahun)}</span>
        </div>

        <table class="kartu-print-table">
          <thead>
            <tr>
              <th>Hari</th>
              <th>Waktu</th>
              <th>Mata Pelajaran</th>
              <th>Ruang</th>
            </tr>
          </thead>
          <tbody>${renderKartuPengawasTableRows(record)}</tbody>
        </table>
      </section>
    `).join("");

    return `<!doctype html>
      <html lang="id">
        <head>
          <meta charset="utf-8">
          <title>Kartu Pengawas ${escapeHtml(settings.examType)} ${escapeHtml(settings.tahun)}</title>
          <style>
            * { box-sizing: border-box; }
            body { margin: 0; font-family: "Segoe UI", Arial, sans-serif; color: #0f172a; background: #e9eef5; }
            .kartu-print-toolbar { position: sticky; top: 0; z-index: 10; display: flex; justify-content: center; padding: 12px; background: rgba(255,255,255,0.95); border-bottom: 1px solid #d1d5db; }
            .kartu-print-toolbar button { border: 0; border-radius: 999px; padding: 10px 18px; font: inherit; font-weight: 700; cursor: pointer; color: #fff; background: linear-gradient(135deg,#0f766e,#1d4ed8); }
            .kartu-print-sheet { width: 210mm; min-height: 297mm; margin: 10mm auto; padding: 12mm; background:
              radial-gradient(circle at top right, rgba(59,130,246,0.08), transparent 28%),
              linear-gradient(180deg,#ffffff,#f8fbff); box-shadow: 0 18px 40px rgba(15,23,42,0.12); page-break-after: always; }
            .kartu-print-sheet:last-child { page-break-after: auto; }
            .kartu-print-meta { margin: 0 0 18px; padding: 18px 20px; border-radius: 24px; background: linear-gradient(135deg,#0f766e,#1d4ed8); border: 1px solid rgba(30,64,175,0.28); box-shadow: 0 14px 28px rgba(15,23,42,0.14); color: #fff; }
            .kartu-print-eyebrow { display: inline-block; margin-bottom: 10px; padding: 4px 10px; border-radius: 999px; background: rgba(255,255,255,0.18); color: #eff6ff; font-size: 12px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; }
            .kartu-print-meta strong, .kartu-print-meta span { display: block; }
            .kartu-print-meta strong { font-size: 28px; line-height: 1.05; }
            .kartu-print-meta span { margin-top: 7px; color: rgba(255,255,255,0.9); font-size: 13px; font-weight: 700; letter-spacing: 0.04em; }
            .kartu-print-table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 16px; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 24px rgba(15,23,42,0.08); }
            .kartu-print-table th, .kartu-print-table td { border: 1px solid #64748b; padding: 9px 8px; vertical-align: middle; line-height: 1.2; }
            .kartu-print-table th { background: linear-gradient(180deg,#1e293b,#334155); color: #fff; text-transform: uppercase; letter-spacing: 0.03em; height: 40px; }
            .kartu-print-table tbody td { height: 36px; }
            .kartu-print-table tbody tr:nth-child(odd) td { background: #dbeafe; }
            .kartu-print-table tbody tr:nth-child(even) td { background: #f8fafc; }
            .kepangawasan-card-day { width: 90px; text-align: center; font-weight: 800; background: #93c5fd; color: #0f172a; letter-spacing: 0.03em; }
            .kepangawasan-card-time { text-align: center; font-weight: 700; background: rgba(226,232,240,0.7); }
            .kepangawasan-card-room { text-align: center; font-weight: 800; background: rgba(15,118,110,0.12); }
            @page { size: A4 portrait; margin: 0; }
            @media print { body { background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; } .kartu-print-toolbar { display: none; } .kartu-print-sheet { margin: 0; box-shadow: none; } }
          </style>
        </head>
        <body>
          <div class="kartu-print-toolbar"><button type="button" onclick="window.print()">Print / Simpan PDF</button></div>
          ${cardSheets || '<section class="kartu-print-sheet"><p>Tidak ada kartu pengawas yang tersedia.</p></section>'}
        </body>
      </html>`;
  }

  function renderKepangawasanTabContent() {
    if (kepangawasanState.activeTab === "jadwal-mengawasi") {
      return renderJadwalMengawasiTab();
    }
    if (kepangawasanState.activeTab === "pembagian-ruang") {
      return renderPembagianRuangTab();
    }
    if (kepangawasanState.activeTab === "kartu-pengawas") {
      return renderKartuPengawasTab();
    }
    return renderJadwalUjianTab();
  }

  function renderKepangawasanPage() {
    return `
      <div class="kepangawasan-page">
        <div class="kepangawasan-tabbar" role="tablist" aria-label="Menu Kepangawasan">
          ${TAB_OPTIONS.map(item => `
            <button
              type="button"
              class="kepangawasan-tab ${item.key === kepangawasanState.activeTab ? "active" : ""}"
              aria-selected="${item.key === kepangawasanState.activeTab ? "true" : "false"}"
              onclick="setKepangawasanTab('${escapeHtml(item.key)}')"
            >
              ${escapeHtml(item.label)}
            </button>
          `).join("")}
        </div>
        ${renderKepangawasanTabContent()}
      </div>
    `;
  }

  function renderKepangawasanState() {
    const content = global.document.getElementById("content");
    if (!content) return;
    content.innerHTML = renderKepangawasanPage();
  }

  function setKepangawasanTab(tab) {
    kepangawasanState.activeTab = normalizeTab(tab);
    saveKepangawasanState();
    renderKepangawasanState();
  }

  function setKepangawasanExamType(value) {
    kepangawasanState.examType = JENIS_UJIAN_OPTIONS.includes(String(value || "").trim())
      ? String(value || "").trim()
      : JENIS_UJIAN_OPTIONS[1];
    saveKepangawasanState();
    renderKepangawasanState();
  }

  function setKepangawasanDateRange(field, value) {
    if (!["startDate", "endDate"].includes(field)) return;
    kepangawasanState[field] = String(value || "").trim();

    const validDates = new Set(getKepangawasanDateOptions());
    kepangawasanState.rows = ensureRows(kepangawasanState.rows).map(row => {
      const nextTanggal = validDates.size === 0 || validDates.has(row.tanggal) ? row.tanggal : "";
      return {
        ...row,
        tanggal: nextTanggal,
        hari: nextTanggal ? (row.hari || getHariFromDate(nextTanggal)) : row.hari
      };
    });

    saveKepangawasanState();
    renderKepangawasanState();
  }

  function setKepangawasanRowField(index, field, value) {
    const rows = ensureRows(kepangawasanState.rows);
    if (!rows[index] || !["hari", "tanggal", "jam", "jamMulai", "durasiMenit", "mapel"].includes(field)) return;
    if (field === "jamMulai") {
      rows[index][field] = normalizeKepangawasanTimeValue(value);
    } else if (field === "durasiMenit") {
      rows[index][field] = normalizeKepangawasanDurationValue(value);
    } else {
      rows[index][field] = String(value || "").trim();
    }
    if (field === "jam" && rows[index][field]) {
      rows[index].jamMulai = rows[index].jamMulai || getKepangawasanDefaultStartTime(rows[index].jam);
      rows[index].durasiMenit = rows[index].durasiMenit || getKepangawasanDefaultDuration(rows[index].jam);
    }
    kepangawasanState.rows = rows;
    saveKepangawasanState();
    renderKepangawasanState();
  }

  function setKepangawasanRowDate(index, value) {
    const rows = ensureRows(kepangawasanState.rows);
    if (!rows[index]) return;
    const nextValue = String(value || "").trim();
    rows[index].tanggal = nextValue;
    rows[index].hari = nextValue ? getHariFromDate(nextValue) || rows[index].hari : "";
    kepangawasanState.rows = rows;
    saveKepangawasanState();
    renderKepangawasanState();
  }

  function resetKepangawasanRows() {
    kepangawasanState.rows = ensureRows([]);
    saveKepangawasanState();
    renderKepangawasanState();
  }

  function setKepangawasanMengawasiCell(kodeGuru, slotKey, isActive) {
    const guruKey = String(kodeGuru || "").trim();
    const validSlots = getKepangawasanMengawasiSlots().flatMap(group => group.items);
    if (!guruKey || !validSlots.some(slot => slot.key === slotKey)) return;
    kepangawasanState.mengawasiMatrix = normalizeMengawasiMatrix(kepangawasanState.mengawasiMatrix);
    if (!kepangawasanState.mengawasiMatrix[guruKey]) {
      kepangawasanState.mengawasiMatrix[guruKey] = {};
    }
    kepangawasanState.mengawasiMatrix[guruKey][slotKey] = Boolean(isActive);
    saveKepangawasanState();
    renderKepangawasanState();
  }

  function setKepangawasanMengawasiRow(kodeGuru, isActive) {
    const guruKey = String(kodeGuru || "").trim();
    const validSlots = getKepangawasanMengawasiSlots().flatMap(group => group.items);
    if (!guruKey || !validSlots.length) return;
    kepangawasanState.mengawasiMatrix = normalizeMengawasiMatrix(kepangawasanState.mengawasiMatrix);
    kepangawasanState.mengawasiMatrix[guruKey] = kepangawasanState.mengawasiMatrix[guruKey] || {};
    validSlots.forEach(slot => {
      kepangawasanState.mengawasiMatrix[guruKey][slot.key] = Boolean(isActive);
    });
    saveKepangawasanState();
    renderKepangawasanState();
  }

  function setKepangawasanMengawasiAll(isActive) {
    const validSlots = getKepangawasanMengawasiSlots().flatMap(group => group.items);
    if (!validSlots.length || !kepangawasanGuruOptions.length) return;
    kepangawasanState.mengawasiMatrix = normalizeMengawasiMatrix(kepangawasanState.mengawasiMatrix);
    kepangawasanGuruOptions.forEach(guru => {
      const guruKey = String(guru.kode_guru || "").trim();
      if (!guruKey) return;
      kepangawasanState.mengawasiMatrix[guruKey] = kepangawasanState.mengawasiMatrix[guruKey] || {};
      validSlots.forEach(slot => {
        kepangawasanState.mengawasiMatrix[guruKey][slot.key] = Boolean(isActive);
      });
    });
    saveKepangawasanState();
    renderKepangawasanState();
  }

  function resetKepangawasanMengawasiMatrix() {
    kepangawasanState.mengawasiMatrix = {};
    saveKepangawasanState();
    renderKepangawasanState();
  }

  function setKepangawasanPembagianField(field, value) {
    if (field === "pembagianRuangCount") {
      kepangawasanState.pembagianRuangCount = normalizePembagianRuangCount(value);
      return;
    }
    if (field === "pembagianPengawasCount") {
      kepangawasanState.pembagianPengawasCount = normalizePembagianPengawasCount(value);
      return;
    }
    if (field === "pembagianUrutan") {
      kepangawasanState.pembagianUrutan = normalizePembagianUrutan(value);
    }
  }

  function applyKepangawasanPembagianSettings() {
    kepangawasanState.pembagianRuangCount = normalizePembagianRuangCount(kepangawasanState.pembagianRuangCount);
    kepangawasanState.pembagianPengawasCount = normalizePembagianPengawasCount(kepangawasanState.pembagianPengawasCount);
    kepangawasanState.pembagianUrutan = normalizePembagianUrutan(kepangawasanState.pembagianUrutan);
    kepangawasanState.pembagianAssignments = {};
    saveKepangawasanState();
    renderKepangawasanState();
    showKepangawasanToast("Pengaturan pembagian ruang disimpan.");
  }

  function generateKepangawasanPembagianRuang() {
    const scheduleRows = getPembagianRuangScheduleRows();
    if (!scheduleRows.length) {
      showKepangawasanToast("Jadwal ujian belum tersedia.", "warning");
      return;
    }
    kepangawasanState.pembagianAssignments = generatePembagianRuangAssignments();
    saveKepangawasanState();
    renderKepangawasanState();
    global.AuditLog?.record?.("kepangawasan_generate_ruang", {
      ringkasan: `Pembagian ruang digenerate: ${kepangawasanState.pembagianRooms} ruang, ${kepangawasanState.pembagianInvigilatorsPerRoom} pengawas/ruang, mode ${kepangawasanState.pembagianOrderMode}.`,
      rooms: kepangawasanState.pembagianRooms,
      invigilators_per_room: kepangawasanState.pembagianInvigilatorsPerRoom,
      order_mode: kepangawasanState.pembagianOrderMode
    }, { module: "Kepangawasan", title: "Generate Pembagian Ruang" });
    showKepangawasanToast("Pembagian ruang berhasil digenerate.");
  }

  function exportKepangawasanPembagianRuangPdf() {
    const scheduleRows = getPembagianRuangScheduleRows();
    if (!scheduleRows.length) {
      showKepangawasanToast("Jadwal ujian belum tersedia.", "warning");
      return;
    }
    const html = getPembagianRuangPrintHtml();
    openKepangawasanPrintHtml(
      html,
      `Pembagian Ruang ${getKepangawasanPrintSettings(true).tahun}`,
      "Izinkan popup browser untuk cetak PDF pembagian ruang."
    );
  }

  function printKartuPengawasSelected() {
    const selectedCode = getSelectedKartuPengawasCode();
    if (!selectedCode) {
      showKepangawasanToast("Pilih guru terlebih dahulu.", "warning");
      return;
    }
    const records = getFilteredKartuPengawasRecords();
    if (!records.length) {
      showKepangawasanToast("Kartu pengawas belum tersedia.", "warning");
      return;
    }
    const html = getKartuPengawasPrintHtml(records);
    openKepangawasanPrintHtml(
      html,
      `Kartu Pengawas ${records[0]?.nama || selectedCode}`,
      "Izinkan popup browser untuk cetak kartu pengawas."
    );
  }

  function printKartuPengawasAll() {
    const records = getKartuPengawasRecords();
    if (!records.length) {
      showKepangawasanToast("Belum ada kartu pengawas yang bisa dicetak.", "warning");
      return;
    }
    const html = getKartuPengawasPrintHtml(records);
    openKepangawasanPrintHtml(
      html,
      `Kartu Pengawas ${getKepangawasanPrintSettings(true).tahun}`,
      "Izinkan popup browser untuk cetak semua kartu pengawas."
    );
  }

  async function setKartuPengawasDashboardVisibility(isActive) {
    if (!canPublishKartuPengawasToGuru()) {
      showKepangawasanToast("Hanya admin atau superadmin yang bisa mengatur kartu pengawas dashboard.", "warning");
      kepangawasanState.publishKartuDashboard = false;
      saveKepangawasanState();
      renderKepangawasanState();
      return;
    }

    const documentsApi = getKepangawasanDocumentsApi();
    if (!documentsApi?.collection || !documentsApi?.batch) {
      showKepangawasanToast("Layanan dokumen belum siap.", "error");
      renderKepangawasanState();
      return;
    }

    try {
      if (global.Swal?.showLoading) {
        global.Swal.fire({
          title: isActive ? "Mengaktifkan kartu pengawas" : "Menonaktifkan kartu pengawas",
          text: isActive
            ? "Sedang menyimpan kartu pengawas ke dashboard guru..."
            : "Sedang menyembunyikan kartu pengawas dari dashboard guru...",
          allowOutsideClick: false,
          didOpen: () => global.Swal.showLoading()
        });
      }

      if (isActive) {
        const records = getKartuPengawasRecords();
        if (!records.length) {
          global.Swal?.close?.();
          kepangawasanState.publishKartuDashboard = false;
          saveKepangawasanState();
          renderKepangawasanState();
          showKepangawasanToast("Belum ada kartu pengawas yang bisa dikirim.", "warning");
          return;
        }

        const collection = documentsApi.collection(KARTU_PENGAWAS_COLLECTION);
        const settings = getKepangawasanDocumentSettings();
        const sender = getKepangawasanCurrentUser();
        const termContext = getKepangawasanTermContext();
        const publishedAt = new Date().toISOString();
        const nextDocIds = new Set(records.map(record => getKartuPengawasPublishDocId(record.kode_guru, termContext.id)));
        const batch = documentsApi.batch();
        const existingSnapshot = typeof collection.where === "function"
          ? await collection.where("term_id", "==", termContext.id).get()
          : await collection.get();
        const existingDocs = (existingSnapshot?.docs || []).filter(doc => {
          if (!doc?.id) return false;
          const data = typeof doc.data === "function" ? doc.data() : {};
          return String(data?.type || "").trim() === "kartu_pengawas"
            && String(data?.term_id || "").trim() === String(termContext.id || "legacy").trim();
        });

        existingDocs.forEach(doc => {
          if (!nextDocIds.has(String(doc.id || "").trim())) {
            batch.delete(doc.ref || collection.doc(doc.id));
          }
        });

        records.forEach(record => {
          const docId = getKartuPengawasPublishDocId(record.kode_guru, termContext.id);
          batch.set(collection.doc(docId), buildKartuPengawasPublishPayload(record, settings, publishedAt, sender, termContext), { merge: true });
        });

        await batch.commit();
        kepangawasanState.publishKartuDashboard = true;
        saveKepangawasanState();
        renderKepangawasanState();
        global.Swal?.close?.();
        global.AuditLog?.record?.("kepangawasan_publish_kartu", {
          ringkasan: `Kartu pengawas ditampilkan di dashboard guru untuk ${records.length} guru.`,
          guru_count: records.length,
          sent_at: publishedAt
        }, { module: "Kepangawasan", title: "Kirim Kartu Pengawas" });
        showKepangawasanToast(`Kartu pengawas tampil di dashboard guru. Dikirim ${global.AppUtils?.formatDateTimeId ? global.AppUtils.formatDateTimeId(publishedAt) : new Date(publishedAt).toLocaleString("id-ID")}`);
        return;
      }

      await deletePublishedKartuPengawasForTerm();
      kepangawasanState.publishKartuDashboard = false;
      saveKepangawasanState();
      renderKepangawasanState();
      global.Swal?.close?.();
      global.AuditLog?.record?.("kepangawasan_unpublish_kartu", {
        ringkasan: "Kartu pengawas disembunyikan dari dashboard guru."
      }, { module: "Kepangawasan", title: "Sembunyikan Kartu Pengawas" });
      showKepangawasanToast("Kartu pengawas disembunyikan dari dashboard guru.");
    } catch (error) {
      console.error("Gagal mengatur kartu pengawas dashboard guru", error);
      global.Swal?.close?.();
      renderKepangawasanState();
      showKepangawasanToast("Kartu pengawas belum berhasil diperbarui.", "error");
    }
  }

  function setKepangawasanUseKepalaTtd(isActive) {
    kepangawasanState.useKepalaTtd = Boolean(isActive);
    saveKepangawasanState();
    renderKepangawasanState();
  }

  function setKepangawasanPrintDate(value) {
    kepangawasanState.printDate = String(value || "").trim();
    saveKepangawasanState();
    renderKepangawasanState();
  }

  global.renderKepangawasanPage = renderKepangawasanPage;
  global.loadRealtimeKepangawasan = loadRealtimeKepangawasan;
  global.setKepangawasanTab = setKepangawasanTab;
  global.setKepangawasanExamType = setKepangawasanExamType;
  global.setKepangawasanDateRange = setKepangawasanDateRange;
  global.setKepangawasanRowField = setKepangawasanRowField;
  global.setKepangawasanRowDate = setKepangawasanRowDate;
  global.resetKepangawasanRows = resetKepangawasanRows;
  global.setKepangawasanMengawasiCell = setKepangawasanMengawasiCell;
  global.setKepangawasanMengawasiRow = setKepangawasanMengawasiRow;
  global.setKepangawasanMengawasiAll = setKepangawasanMengawasiAll;
  global.resetKepangawasanMengawasiMatrix = resetKepangawasanMengawasiMatrix;
  global.setKepangawasanPembagianField = setKepangawasanPembagianField;
  global.applyKepangawasanPembagianSettings = applyKepangawasanPembagianSettings;
  global.generateKepangawasanPembagianRuang = generateKepangawasanPembagianRuang;
  global.exportKepangawasanPembagianRuangPdf = exportKepangawasanPembagianRuangPdf;
  global.printKartuPengawasSelected = printKartuPengawasSelected;
  global.printKartuPengawasAll = printKartuPengawasAll;
  global.setKartuPengawasDashboardVisibility = setKartuPengawasDashboardVisibility;
  global.setKepangawasanUseKepalaTtd = setKepangawasanUseKepalaTtd;
  global.setKepangawasanPrintDate = setKepangawasanPrintDate;
  global.exportKepangawasanJadwalPdf = exportKepangawasanJadwalPdf;
})(window);

