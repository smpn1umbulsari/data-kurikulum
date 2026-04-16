(function initKepangawasan(global) {
  if (global.renderKepangawasanPage) return;

  const STORAGE_KEY = "kepangawasanAsesmenState";
  const DEFAULT_ROWS = 12;
  const DEFAULT_TAB = "jadwal-ujian";
  const DAY_OPTIONS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const JAM_OPTIONS = ["Jam ke - 1", "Jam ke - 2"];
  const TAB_OPTIONS = [
    { key: "jadwal-ujian", label: "Jadwal Ujian" },
    { key: "jadwal-mengawasi", label: "Jadwal Mengawasi" },
    { key: "pembagian-ruang", label: "Pembagian Ruang" }
  ];

  let kepangawasanMapelOptions = [];
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

  function normalizeTab(tab) {
    return TAB_OPTIONS.some(item => item.key === tab) ? tab : DEFAULT_TAB;
  }

  function createEmptyRow() {
    return { hari: "", tanggal: "", jam: "", mapel: "" };
  }

  function ensureRows(rows) {
    const normalized = Array.isArray(rows) ? rows.slice(0, DEFAULT_ROWS).map(item => ({
      hari: String(item?.hari || "").trim(),
      tanggal: String(item?.tanggal || "").trim(),
      jam: String(item?.jam || "").trim(),
      mapel: String(item?.mapel || "").trim()
    })) : [];
    while (normalized.length < DEFAULT_ROWS) normalized.push(createEmptyRow());
    return normalized;
  }

  function loadKepangawasanState() {
    try {
      const parsed = JSON.parse(global.localStorage.getItem(STORAGE_KEY) || "{}");
      return {
        activeTab: normalizeTab(parsed?.activeTab),
        startDate: String(parsed?.startDate || "").trim(),
        endDate: String(parsed?.endDate || "").trim(),
        printDate: String(parsed?.printDate || "").trim(),
        useKepalaTtd: parsed?.useKepalaTtd === true,
        rows: ensureRows(parsed?.rows)
      };
    } catch (error) {
      console.error("Gagal memuat state kepangawasan", error);
      return {
        activeTab: DEFAULT_TAB,
        startDate: "",
        endDate: "",
        printDate: "",
        useKepalaTtd: false,
        rows: ensureRows([])
      };
    }
  }

  function saveKepangawasanState() {
    global.localStorage.setItem(STORAGE_KEY, JSON.stringify({
      activeTab: kepangawasanState.activeTab,
      startDate: kepangawasanState.startDate,
      endDate: kepangawasanState.endDate,
      printDate: kepangawasanState.printDate,
      useKepalaTtd: kepangawasanState.useKepalaTtd === true,
      rows: ensureRows(kepangawasanState.rows)
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
      const snapshot = await global.SupabaseDocuments.collection("mapel")
        .orderBy("kode_mapel")
        .get();
      kepangawasanMapelOptions = snapshot.docs
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
    } catch (error) {
      console.error("Gagal memuat daftar mapel untuk kepangawasan", error);
      kepangawasanMapelOptions = [];
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
      tanggalTtd: String(kepangawasanState.printDate || "").trim() || String(raporSettings?.tanggal || "").trim() || formatLocalIsoDate(new Date()),
      kepalaNama: String(raporSettings?.kepala_nama || "").trim() || "Dra. MAMIK SASMIATI, M.Pd",
      kepalaNip: String(raporSettings?.kepala_nip || "").trim() || "19660601 199003 2 010",
      kepalaTtd: typeof global.getKepalaSekolahTtdImage === "function"
        ? String(global.getKepalaSekolahTtdImage() || "").trim()
        : String(raporSettings?.kepala_ttd || "").trim(),
      useKepalaTtd: kepangawasanState.useKepalaTtd === true
    };
  }

  function getPrintableAssetUrl(path = "") {
    try {
      return new URL(path, global.location.href).href;
    } catch {
      return path;
    }
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

  function getKepangawasanJamTimeLabel(value = "") {
    const order = getKepangawasanJamOrder(value);
    if (order === 1) return "07.30 - 09.30";
    if (order === 2) return "10.00 - 11.30";
    return "-";
  }

  function getKepangawasanFilledRows() {
    return ensureRows(kepangawasanState.rows)
      .filter(row => [row.hari, row.tanggal, row.jam, row.mapel].some(value => String(value || "").trim()))
      .filter(row => String(row.tanggal || "").trim() && String(row.jam || "").trim() && String(row.mapel || "").trim())
      .sort((left, right) => {
        const dateCompare = String(left.tanggal || "").localeCompare(String(right.tanggal || ""));
        if (dateCompare !== 0) return dateCompare;
        return getKepangawasanJamOrder(left.jam) - getKepangawasanJamOrder(right.jam);
      });
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
          <td class="kepangawasan-print-center">${escapeHtml(getKepangawasanJamTimeLabel(row.jam))}</td>
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
          <title>Jadwal Ujian ${escapeHtml(settings.tahun)}</title>
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
            }
            .kepangawasan-print-table th {
              text-align: center;
              font-weight: 800;
              background: #f3f4f6;
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
              <h4>ASESMEN SUMATIF AKHIR SEMESTER</h4>
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
        documentTitle: `Jadwal Ujian ${settings.tahun}`,
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
      <div class="kepangawasan-grid">
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

          <div class="table-container kepangawasan-table-wrap">
            <table class="kepangawasan-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Hari</th>
                  <th>Tanggal</th>
                  <th>Jam</th>
                  <th>Mapel</th>
                </tr>
              </thead>
              <tbody>
                ${renderKepangawasanRows()}
              </tbody>
            </table>
          </div>
        </section>

        <aside class="card kepangawasan-side-panel">
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
        </aside>
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

  function renderKepangawasanTabContent() {
    if (kepangawasanState.activeTab === "jadwal-mengawasi") {
      return renderPlaceholderTab("Jadwal Mengawasi", "Tab ini sudah disiapkan dan siap dilanjutkan untuk pengaturan jadwal pengawas ujian.");
    }
    if (kepangawasanState.activeTab === "pembagian-ruang") {
      return renderPlaceholderTab("Pembagian Ruang", "Tab ini sudah disiapkan dan bisa dilanjutkan untuk pembagian ruang pengawasan ujian.");
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
    if (!rows[index] || !["hari", "tanggal", "jam", "mapel"].includes(field)) return;
    rows[index][field] = String(value || "").trim();
    kepangawasanState.rows = rows;
    saveKepangawasanState();
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
  global.setKepangawasanDateRange = setKepangawasanDateRange;
  global.setKepangawasanRowField = setKepangawasanRowField;
  global.setKepangawasanRowDate = setKepangawasanRowDate;
  global.resetKepangawasanRows = resetKepangawasanRows;
  global.setKepangawasanUseKepalaTtd = setKepangawasanUseKepalaTtd;
  global.setKepangawasanPrintDate = setKepangawasanPrintDate;
  global.exportKepangawasanJadwalPdf = exportKepangawasanJadwalPdf;
})(window);
