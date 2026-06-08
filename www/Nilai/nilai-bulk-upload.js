(function initBulkNilaiUpload(global) {
  if (global.BulkNilaiUpload) return;

  let unsubscribeBulkNilaiGuru = null;
  let semuaDataBulkNilaiGuru = [];

  function loadRealtimeBulkUploadNilai() {
    // Call original subscriber in nilai.js to fetch students, maps, classes, etc.
    if (typeof global.loadRealtimeInputNilai === "function") {
      global.loadRealtimeInputNilai();
    }

    // Subscribe to guru collection to fetch names for display
    if (unsubscribeBulkNilaiGuru) unsubscribeBulkNilaiGuru();
    const documentsApi = getNilaiDocumentsApi();
    if (documentsApi && typeof documentsApi.collection === "function") {
      unsubscribeBulkNilaiGuru = documentsApi
        .collection("guru")
        .onSnapshot((snapshot) => {
          semuaDataBulkNilaiGuru = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          if (document.getElementById("bulkNilaiContainer")) {
            renderBulkUploadNilaiPageState();
          }
        });
    }
  }

  function renderBulkUploadNilaiPage() {
    const user = global.getCurrentNilaiUser ? global.getCurrentNilaiUser() : {};
    const role = user.role || "admin";
    const modeRules = global.getNilaiModeRules ? global.getNilaiModeRules() : { isSemester: false };
    const showModeSelector = ["admin", "superadmin", "urusan"].includes(String(role).toLowerCase());

    // Retrieve selected values from local storage
    let selectedTingkat = localStorage.getItem("bulkNilaiSelectedTingkat") || "";
    let selectedMapel = localStorage.getItem("bulkNilaiSelectedMapel") || "";

    // Verify role and retrieve allowed levels
    const canCoordinatorAccess = typeof global.canUseCoordinatorAccess === "function" && global.canUseCoordinatorAccess();
    const coordinatorLevels = typeof global.getCurrentCoordinatorLevelsSync === "function"
      ? global.getCurrentCoordinatorLevelsSync()
      : [];

    let tingkatOptionsHtml = "";
    if (role === "koordinator" || (role === "guru" && canCoordinatorAccess)) {
      if (!selectedTingkat || !coordinatorLevels.includes(selectedTingkat)) {
        selectedTingkat = coordinatorLevels[0] || "";
      }
      tingkatOptionsHtml = coordinatorLevels.map(lvl => 
        `<option value="${lvl}" ${String(selectedTingkat) === String(lvl) ? "selected" : ""}>Tingkat ${lvl}</option>`
      ).join("");
    } else {
      if (!selectedTingkat) selectedTingkat = "7";
      tingkatOptionsHtml = ["7", "8", "9"].map(lvl => 
        `<option value="${lvl}" ${String(selectedTingkat) === String(lvl) ? "selected" : ""}>Tingkat ${lvl}</option>`
      ).join("");
    }
    localStorage.setItem("bulkNilaiSelectedTingkat", selectedTingkat);

    // Mapel options
    let mapelOptionsHtml = `<option value="">Pilih Mapel...</option>`;
    if (global.semuaDataNilaiMapel && global.semuaDataNilaiMapel.length > 0) {
      const sortedMapel = [...global.semuaDataNilaiMapel].sort((a, b) => 
        String(a.nama_mapel || "").localeCompare(String(b.nama_mapel || ""), undefined, { sensitivity: "base" })
      );
      if (sortedMapel.some(m => String(m.kode_mapel || m.id) === selectedMapel)) {
        // keep it
      } else {
        selectedMapel = sortedMapel[0] ? String(sortedMapel[0].kode_mapel || sortedMapel[0].id) : "";
      }
      mapelOptionsHtml = sortedMapel.map(m => {
        const code = String(m.kode_mapel || m.id);
        return `<option value="${code}" ${selectedMapel === code ? "selected" : ""}>${global.escapeNilaiHtml(m.nama_mapel || code)} (${code})</option>`;
      }).join("");
    }
    localStorage.setItem("bulkNilaiSelectedMapel", selectedMapel);

    const toolbarHtml = `
      <!-- toolbar-row--actions -->
      <div class="toolbar-row toolbar-row--actions">
        <button type="button" class="btn-primary" onclick="downloadBulkTemplateTrigger()">
          <span class="kelas-action-icon kelas-icon-download" aria-hidden="true"></span>
          Download Template
        </button>
        <button type="button" class="btn-secondary" onclick="triggerBulkNilaiImport()">
          <span class="kelas-action-icon kelas-icon-upload" aria-hidden="true"></span>
          Import Nilai
        </button>
        <input id="bulkNilaiImportInput" type="file" accept=".xlsx,.xls" onchange="importBulkNilaiExcel(event)" hidden>
        
        <span class="matrix-toolbar-note" style="margin-left: auto; font-weight: bold; background: var(--gs-color-primary-light); padding: 4px 8px; border-radius: 4px;">
          Mode Aktif: ${modeRules.isSemester ? "Semester" : "PTS"}
        </span>
      </div>

      <!-- toolbar-row--filters -->
      <div class="toolbar-row toolbar-row--filters">
        <label class="siswa-field" for="bulkNilaiTingkatSelect">
          <span>Pilih Tingkat</span>
          <select id="bulkNilaiTingkatSelect" onchange="handleBulkNilaiTingkatChange(this.value)">
            ${tingkatOptionsHtml}
          </select>
        </label>

        <label class="siswa-field" for="bulkNilaiMapelSelect">
          <span>Pilih Mata Pelajaran</span>
          <select id="bulkNilaiMapelSelect" onchange="handleBulkNilaiMapelChange(this.value)">
            ${mapelOptionsHtml}
          </select>
        </label>
      </div>`;

    const contentHtml = `
      <div style="padding: var(--gs-space-4);" id="bulkNilaiContainer">
        <div class="loading-panel">Memuat data ringkasan kelas...</div>
      </div>`;

    const modalHtml = `
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
      </div>`;

    return global.AppUtils.renderModuleLayout({
      moduleName: "nilai-upload-bulk",
      eyebrow: "Nilai",
      title: "Upload Nilai per Mapel per Jenjang",
      subtitle: "Upload nilai satu mata pelajaran untuk seluruh kelas di satu jenjang sekaligus.",
      toolbar: toolbarHtml,
      content: contentHtml,
      modal: modalHtml
    });
  }

  function renderBulkUploadNilaiPageState() {
    const container = document.getElementById("bulkNilaiContainer");
    if (!container) return;

    const selectedTingkat = document.getElementById("bulkNilaiTingkatSelect")?.value;
    const selectedMapel = document.getElementById("bulkNilaiMapelSelect")?.value;

    if (!selectedTingkat || !selectedMapel) {
      container.innerHTML = `<div class="empty-panel">Pilih Tingkat dan Mapel untuk menampilkan ringkasan data.</div>`;
      return;
    }

    if (!global.semuaDataNilaiKelas || !global.semuaDataNilaiSiswa || !global.semuaDataNilaiMengajar) {
      container.innerHTML = `<div class="loading-panel">Memuat data dari server...</div>`;
      return;
    }

    const classes = global.semuaDataNilaiKelas
      .filter(c => String(c.tingkat) === String(selectedTingkat))
      .sort((a, b) => String(a.rombel || "").localeCompare(String(b.rombel || ""), undefined, { numeric: true }));

    if (classes.length === 0) {
      container.innerHTML = `<div class="empty-panel">Tidak ada kelas yang terdaftar untuk Tingkat ${selectedTingkat}.</div>`;
      return;
    }

    const mapel = global.semuaDataNilaiMapel.find(m => String(m.kode_mapel || m.id).toUpperCase() === String(selectedMapel).toUpperCase());
    const mapelName = mapel ? mapel.nama_mapel : selectedMapel;

    let classesTableRowsHtml = "";
    let totalSiswaJenjang = 0;
    let totalSiswaGradedJenjang = 0;

    classes.forEach(cls => {
      const assignment = global.semuaDataNilaiMengajar.find(m => 
        String(m.tingkat) === String(selectedTingkat) &&
        String(m.rombel).toUpperCase() === String(cls.rombel).toUpperCase() &&
        String(m.mapel_kode).toUpperCase() === String(selectedMapel).toUpperCase()
      );

      const studentsInClass = global.semuaDataNilaiSiswa.filter(s => {
        const parts = global.getNilaiKelasBayanganParts(s);
        return String(parts.tingkat) === String(selectedTingkat) &&
               String(parts.rombel).toUpperCase() === String(cls.rombel).toUpperCase() &&
               global.isNilaiSiswaEligibleForMapel(s, mapel);
      });

      totalSiswaJenjang += studentsInClass.length;

      let gradedCount = 0;
      if (assignment) {
        studentsInClass.forEach(s => {
          const gradeDoc = global.getNilaiForStudent(assignment, s.nipd);
          if (gradeDoc) {
            const values = global.getNilaiUiValues(gradeDoc);
            const hasAnyValue = Object.keys(values).some(key => key !== "rapor" && values[key] !== "");
            if (hasAnyValue) {
              gradedCount++;
            }
          }
        });
      }

      totalSiswaGradedJenjang += gradedCount;

      let teacherCellHtml = "";
      if (assignment) {
        const guru = semuaDataBulkNilaiGuru.find(g => g.kode_guru === assignment.guru_kode);
        const teacherName = guru ? (guru.nama || guru.guru_nama || assignment.guru_kode) : assignment.guru_kode;
        teacherCellHtml = `<span style="color: var(--gs-color-success-dark); font-weight: 500;">✓ Terisi (${global.escapeNilaiHtml(teacherName)})</span>`;
      } else {
        teacherCellHtml = `<span style="color: var(--gs-color-danger-dark); font-weight: bold;">✗ Guru belum diatur (dilewati saat upload)</span>`;
      }

      const progressPercent = studentsInClass.length ? Math.round((gradedCount / studentsInClass.length) * 100) : 0;
      const progressColor = progressPercent === 100 ? "var(--gs-color-success-dark)" : (progressPercent > 0 ? "var(--gs-color-primary)" : "var(--gs-color-gray-dark)");

      classesTableRowsHtml += `
        <tr>
          <td style="font-weight: bold; font-size: 1.1em; padding: 12px 16px;">Kelas ${selectedTingkat} ${global.escapeNilaiHtml(cls.rombel)}</td>
          <td style="padding: 12px 16px;">${teacherCellHtml}</td>
          <td style="text-align: center; padding: 12px 16px;">${studentsInClass.length} Siswa</td>
          <td style="text-align: center; padding: 12px 16px; font-weight: bold; color: ${progressColor};">
            ${gradedCount} / ${studentsInClass.length} (${progressPercent}%)
          </td>
        </tr>
      `;
    });

    const totalProgressPercent = totalSiswaJenjang ? Math.round((totalSiswaGradedJenjang / totalSiswaJenjang) * 100) : 0;

    container.innerHTML = `
      <div style="background: var(--gs-color-bg-light); border: 1px solid var(--gs-color-border); padding: 16px 20px; border-radius: 8px; margin-bottom: 24px; display: flex; flex-direction: column; gap: 8px;">
        <h3 style="margin: 0; color: var(--gs-color-primary-dark); font-size: 1.25em;">Ringkasan Status Pengisian Nilai</h3>
        <div style="font-size: 1.05em; display: flex; gap: 24px; flex-wrap: wrap; margin-top: 8px;">
          <span><strong>Tingkat:</strong> ${selectedTingkat}</span>
          <span><strong>Mata Pelajaran:</strong> ${global.escapeNilaiHtml(mapelName)}</span>
          <span><strong>Total Siswa:</strong> ${totalSiswaJenjang}</span>
          <span><strong>Sudah Dinilai:</strong> ${totalSiswaGradedJenjang} siswa (${totalProgressPercent}%)</span>
        </div>
        <div style="width: 100%; height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden; margin-top: 8px;">
          <div style="width: ${totalProgressPercent}%; height: 100%; background: var(--gs-color-primary); transition: width 0.3s ease;"></div>
        </div>
      </div>

      <div class="table-container" style="background: white; border: 1px solid var(--gs-color-border); border-radius: 8px; overflow: hidden;">
        <table class="mapel-table" style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: var(--gs-color-bg-light); border-bottom: 2px solid var(--gs-color-border);">
              <th style="text-align: left; padding: 12px 16px;">Nama Rombel / Kelas</th>
              <th style="text-align: left; padding: 12px 16px;">Pembagian Mengajar Guru</th>
              <th style="text-align: center; padding: 12px 16px;">Jumlah Siswa Eligible</th>
              <th style="text-align: center; padding: 12px 16px;">Nilai Terisi</th>
            </tr>
          </thead>
          <tbody>
            ${classesTableRowsHtml}
          </tbody>
        </table>
      </div>
    `;
  }

  function handleBulkNilaiTingkatChange(value) {
    localStorage.setItem("bulkNilaiSelectedTingkat", value);
    renderBulkUploadNilaiPageState();
  }

  function handleBulkNilaiMapelChange(value) {
    localStorage.setItem("bulkNilaiSelectedMapel", value);
    renderBulkUploadNilaiPageState();
  }

  function downloadBulkTemplateTrigger() {
    const selectedTingkat = document.getElementById("bulkNilaiTingkatSelect")?.value;
    const selectedMapel = document.getElementById("bulkNilaiMapelSelect")?.value;
    if (!selectedTingkat || !selectedMapel) {
      Swal.fire("Peringatan", "Pilih Tingkat dan Mapel terlebih dahulu.", "warning");
      return;
    }
    downloadBulkNilaiTemplate(selectedTingkat, selectedMapel);
  }

  function triggerBulkNilaiImport() {
    const input = document.getElementById("bulkNilaiImportInput");
    if (input) input.click();
  }

  async function downloadBulkNilaiTemplate(tingkat, mapelKode) {
    if (typeof global.ensureSpreadsheetLibraries === "function") {
      await global.ensureSpreadsheetLibraries();
    }

    const mapel = global.semuaDataNilaiMapel.find(m => String(m.kode_mapel || m.id).toUpperCase() === String(mapelKode).toUpperCase());

    const students = global.semuaDataNilaiSiswa
      .map(siswa => ({
        ...siswa,
        kelasNilaiParts: global.getNilaiKelasBayanganParts(siswa)
      }))
      .filter(siswa => String(siswa.kelasNilaiParts.tingkat) === String(tingkat) && global.isNilaiSiswaEligibleForMapel(siswa, mapel))
      .sort((a, b) => {
        const classCompare = String(a.kelasNilaiParts.kelas || "").localeCompare(String(b.kelasNilaiParts.kelas || ""), undefined, { numeric: true, sensitivity: 'base' });
        if (classCompare !== 0) return classCompare;
        if (global.AppUtils?.compareStudentPlacement) {
          return global.AppUtils.compareStudentPlacement(a, b);
        }
        return String(a.nama || "").localeCompare(String(b.nama || ""), undefined, { sensitivity: 'base' });
      });

    if (!students.length) {
      Swal.fire("Peringatan", `Tidak ada siswa di jenjang tingkat ${tingkat}`, "warning");
      return;
    }

    const fieldConfigs = global.getNilaiInputFieldConfigs();
    const rows = students.map((siswa, index) => {
      const row = {
        NO: index + 1,
        NIPD: siswa.nipd || "",
        NAMA: siswa.nama || "",
        KELAS: siswa.kelasNilaiParts.kelas || siswa.kelas || "",
      };

      const assignment = global.semuaDataNilaiMengajar.find(m => 
        String(m.tingkat) === String(siswa.kelasNilaiParts.tingkat) &&
        String(m.rombel).toUpperCase() === String(siswa.kelasNilaiParts.rombel).toUpperCase() &&
        String(m.mapel_kode).toUpperCase() === String(mapelKode).toUpperCase()
      );

      let nilaiDoc = null;
      if (assignment) {
        nilaiDoc = global.getNilaiForStudent(assignment, siswa.nipd);
      }
      const values = global.getNilaiUiValues(nilaiDoc);
      
      fieldConfigs.forEach(field => {
        row[global.getNilaiFieldExportHeader(field)] = values[field.key] ?? "";
      });
      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const range = XLSX.utils.decode_range(worksheet["!ref"]);
    const fieldHeaders = fieldConfigs.map(global.getNilaiFieldExportHeader);

    const headerStyle = {
      font: { bold: true, color: { rgb: "0F172A" } },
      fill: { fgColor: { rgb: "F8FAFC" } },
      border: {
        top: { style: "thin", color: { rgb: "CBD5E1" } },
        bottom: { style: "thin", color: { rgb: "CBD5E1" } },
        left: { style: "thin", color: { rgb: "CBD5E1" } },
        right: { style: "thin", color: { rgb: "CBD5E1" } },
      },
      protection: { locked: true },
    };
    const uhStyle = {
      fill: { fgColor: { rgb: "DBEAFE" } },
      border: headerStyle.border,
      protection: { locked: false },
    };
    const ptsStyle = {
      fill: { fgColor: { rgb: "DCFCE7" } },
      border: headerStyle.border,
      protection: { locked: false },
    };
    const semesterStyle = {
      fill: { fgColor: { rgb: "FEF3C7" } },
      border: headerStyle.border,
      protection: { locked: false },
    };
    const raporStyle = {
      fill: { fgColor: { rgb: "FDE68A" } },
      border: headerStyle.border,
      protection: { locked: true },
    };
    const lockedStyle = {
      border: headerStyle.border,
      protection: { locked: true },
    };

    // Format headers
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cell = worksheet[XLSX.utils.encode_cell({ r: 0, c: col })];
      if (!cell) continue;
      const fieldHeader = fieldHeaders[col - 4];
      if (/^UH[1-5]$/.test(fieldHeader || ""))
        cell.s = { ...headerStyle, fill: { fgColor: { rgb: "BFDBFE" } } };
      else if (fieldHeader === "PTS")
        cell.s = { ...headerStyle, fill: { fgColor: { rgb: "BBF7D0" } } };
      else if (fieldHeader === "SEMESTER")
        cell.s = { ...headerStyle, fill: { fgColor: { rgb: "FDE68A" } } };
      else if (fieldHeader === "NILAI_RAPOR")
        cell.s = { ...headerStyle, fill: { fgColor: { rgb: "FBBF24" } } };
      else cell.s = headerStyle;
    }

    // Format cells
    for (let row = 1; row <= rows.length; row++) {
      for (let col = range.s.c; col <= range.e.c; col++) {
        const address = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = worksheet[address] || { t: "s", v: "" };
        worksheet[address] = cell;
        const fieldHeader = fieldHeaders[col - 4];
        if (
          /^UH[1-5]$/.test(fieldHeader || "") &&
          global.getNilaiModeRules().isSemester &&
          global.isFilledNilaiValue(cell.v)
        )
          cell.s = lockedStyle;
        else if (/^UH[1-5]$/.test(fieldHeader || "")) cell.s = uhStyle;
        else if (fieldHeader === "PTS" && global.getNilaiModeRules().isSemester)
          cell.s = lockedStyle;
        else if (fieldHeader === "PTS") cell.s = ptsStyle;
        else if (fieldHeader === "SEMESTER") cell.s = semesterStyle;
        else if (fieldHeader === "NILAI_RAPOR") cell.s = raporStyle;
        else cell.s = lockedStyle;
      }
    }

    worksheet["!cols"] = [{ wch: 6 }, { wch: 14 }, { wch: 30 }, { wch: 12 }].concat(
      fieldHeaders.map((field) =>
        field === "NILAI_RAPOR" ? { wch: 14 } : { wch: 10 },
      ),
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      `Template_${mapelKode}_${tingkat}`
    );
    XLSX.writeFile(workbook, `template-nilai-${mapelKode}-tingkat-${tingkat}.xlsx`);
  }

  async function importBulkNilaiExcel(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const selectedTingkat = document.getElementById("bulkNilaiTingkatSelect")?.value;
    const selectedMapel = document.getElementById("bulkNilaiMapelSelect")?.value;
    
    if (!selectedTingkat || !selectedMapel) {
      Swal.fire("Peringatan", "Pilih Tingkat dan Mapel sebelum melakukan import", "warning");
      event.target.value = "";
      return;
    }

    if (typeof global.ensureSpreadsheetLibraries === "function") {
      await global.ensureSpreadsheetLibraries();
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet);
        
        const modeRules = global.getNilaiModeRules();
        const mapel = global.semuaDataNilaiMapel.find(m => String(m.kode_mapel || m.id).toUpperCase() === String(selectedMapel).toUpperCase());

        global.nilaiPreviewData = json.map((row) => {
          const nipd = String(global.getCellValue(row, ["NIPD", "NO_INDUK", "ID_SISWA"])).trim();
          const nama = String(global.getCellValue(row, ["NAMA", "NAMA_SISWA", "NAMA LENGKAP"])).trim();
          const kelasStr = String(global.getCellValue(row, ["KELAS", "KELAS_BAYANGAN", "ROMBEL"])).trim().toUpperCase();
          const mapelKode = String(global.getCellValue(row, ["MAPEL_KODE", "KODE_MAPEL", "MAPEL KODE"])).trim().toUpperCase();

          const uh1Raw = global.getCellValue(row, ["UH_1", "UH 1", "UH1", "NILAI_UH_1"]);
          const uh2Raw = global.getCellValue(row, ["UH_2", "UH 2", "UH2", "NILAI_UH_2"]);
          const uh3Raw = global.getCellValue(row, ["UH_3", "UH 3", "UH3", "NILAI_UH_3"]);
          const uh4Raw = global.getCellValue(row, ["UH_4", "UH 4", "UH4", "NILAI_UH_4"]);
          const uh5Raw = global.getCellValue(row, ["UH_5", "UH 5", "UH5", "NILAI_UH_5"]);
          const ptsRaw = global.getCellValue(row, ["PTS", "NILAI_PTS"]);
          const semesterRaw = global.getCellValue(row, ["SEMESTER", "SMSTR", "NILAI_SEMESTER"]);

          const uh1 = global.normalizeNilaiImportNumber(uh1Raw);
          const uh2 = global.normalizeNilaiImportNumber(uh2Raw);
          const uh3 = global.normalizeNilaiImportNumber(uh3Raw);
          const uh4 = global.normalizeNilaiImportNumber(uh4Raw);
          const uh5 = global.normalizeNilaiImportNumber(uh5Raw);
          const pts = global.normalizeNilaiImportNumber(ptsRaw);
          const semester = global.normalizeNilaiImportNumber(semesterRaw);

          const siswa = global.semuaDataNilaiSiswa.find(item => String(item.nipd || "") === nipd);
          const kelasParts = siswa ? global.getNilaiKelasBayanganParts(siswa) : null;
          
          let assignment = null;
          if (kelasParts && kelasParts.tingkat && kelasParts.rombel) {
            assignment = global.semuaDataNilaiMengajar.find(m => 
              String(m.tingkat) === String(kelasParts.tingkat) &&
              String(m.rombel).toUpperCase() === String(kelasParts.rombel).toUpperCase() &&
              String(m.mapel_kode).toUpperCase() === String(selectedMapel).toUpperCase()
            );
          }

          const existing = (siswa && assignment) ? global.getNilaiForStudent(assignment, siswa.nipd) : null;
          const existingValues = global.getNilaiUiValues(existing);

          const normalizedImportValues = {
            uh1: global.hasNilaiImportValue(uh1Raw) ? uh1 : "",
            uh2: global.hasNilaiImportValue(uh2Raw) ? uh2 : "",
            uh3: global.hasNilaiImportValue(uh3Raw) ? uh3 : "",
            uh4: global.hasNilaiImportValue(uh4Raw) ? uh4 : "",
            uh5: global.hasNilaiImportValue(uh5Raw) ? uh5 : "",
            pts: global.hasNilaiImportValue(ptsRaw) ? pts : "",
            semester: global.hasNilaiImportValue(semesterRaw) ? semester : "",
          };

          const resolvedValues = global.getNilaiNormalizedValuesForMode(
            normalizedImportValues,
            existingValues,
            { preserveBlankAsFallback: true }
          );

          const importRawValueMap = { uh1: uh1Raw, uh2: uh2Raw, uh3: uh3Raw, uh4: uh4Raw, uh5: uh5Raw, pts: ptsRaw, semester: semesterRaw };
          const importNumberMap = { uh1, uh2, uh3, uh4, uh5, pts, semester };
          const importFieldKeys = modeRules.visibleFieldKeys.filter(
            (key) => key !== "rapor" && !modeRules.fixedReadOnlyKeys.has(key)
          );
          const importRawValues = importFieldKeys.map(key => importRawValueMap[key]);
          const importNumbers = importFieldKeys.map(key => importNumberMap[key]);

          let status = "update";
          let message = "";

          if (!nipd || !siswa) {
            status = "error";
            message = "Siswa tidak ditemukan";
          } else if (String(kelasParts.tingkat) !== String(selectedTingkat)) {
            status = "error";
            message = `Tingkat siswa (${kelasParts.tingkat}) tidak sesuai dengan tingkat terpilih (${selectedTingkat})`;
          } else if (mapelKode && mapelKode !== String(selectedMapel).toUpperCase()) {
            status = "error";
            message = `Mapel siswa (${mapelKode}) tidak sesuai dengan mapel terpilih (${selectedMapel})`;
          } else if (!global.isNilaiSiswaEligibleForMapel(siswa, mapel)) {
            status = "error";
            message = `Siswa tidak eligible untuk mapel keagamaan ${selectedMapel}`;
          } else if (!assignment) {
            status = "error";
            message = `Belum ada pembagian mengajar guru untuk kelas ${kelasParts.kelas} pada mapel ${selectedMapel}`;
          } else if (importRawValues.every(val => val === "" || val === null || val === undefined)) {
            status = "error";
            message = modeRules.isSemester ? "Kolom input semester kosong" : "Semua kolom nilai kosong";
          } else if (importNumbers.some(val => Number.isNaN(val))) {
            status = "error";
            message = "Nilai harus berupa angka antara 0 sampai 100";
          } else if (global.hasNilaiImportValue(uh2Raw) && !global.hasNilaiImportValue(resolvedValues.uh1)) {
            status = "error";
            message = "UH 1 wajib diisi sebelum mengisi UH 2";
          } else if (global.hasNilaiImportValue(uh3Raw) && !global.hasNilaiImportValue(resolvedValues.uh1)) {
            status = "error";
            message = "UH 1 wajib diisi sebelum mengisi UH 3";
          } else if (global.hasNilaiImportValue(uh3Raw) && !global.hasNilaiImportValue(resolvedValues.uh2)) {
            status = "error";
            message = "UH 2 wajib diisi sebelum mengisi UH 3";
          } else if (global.hasNilaiImportValue(uh4Raw) && !global.hasNilaiImportValue(resolvedValues.uh3)) {
            status = "error";
            message = "UH 3 wajib diisi sebelum mengisi UH 4";
          } else if (global.hasNilaiImportValue(uh5Raw) && !global.hasNilaiImportValue(resolvedValues.uh4)) {
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
            kelas: kelasParts?.kelas || kelasStr,
            mapel_kode: selectedMapel,
            tingkat: selectedTingkat,
            rombel: kelasParts?.rombel || "",
            guru_kode: assignment ? assignment.guru_kode : "",
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

        global.nilaiPreviewPage = 1;
        renderBulkNilaiPreview();
      } catch(err) {
        console.error(err);
        Swal.fire("Gagal membaca file", "", "error");
      } finally {
        event.target.value = "";
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function renderBulkNilaiPreview() {
    const container = document.getElementById("nilaiPreviewContainer");
    if (!container) return;
    
    // open bulk preview modal
    const modal = document.getElementById("nilaiPreviewModal");
    if (modal) {
      modal.style.display = "flex";
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
    }

    const previewFields = global.getNilaiPreviewFieldConfigs();

    const summary = {
      new: global.nilaiPreviewData.filter((item) => item.status === "new").length,
      update: global.nilaiPreviewData.filter((item) => item.status === "update").length,
      same: global.nilaiPreviewData.filter((item) => item.status === "same").length,
      error: global.nilaiPreviewData.filter((item) => item.status === "error").length,
    };
    const effectiveRowsPerPage = global.getNilaiPreviewRowsPerPageValue();
    const totalPages = Math.max(
      1,
      Math.ceil(global.nilaiPreviewData.length / effectiveRowsPerPage),
    );
    if (global.nilaiPreviewPage > totalPages) global.nilaiPreviewPage = totalPages;
    const startIndex = (global.nilaiPreviewPage - 1) * effectiveRowsPerPage;
    const rows = global.nilaiPreviewData
      .slice(startIndex, startIndex + effectiveRowsPerPage)
      .map((item) => {
        const color =
          item.status === "error"
            ? "#fee2e2"
            : item.status === "new"
              ? "#bbf7d0"
              : item.status === "update"
                ? "#bfdbfe"
                : "#e5e7eb";
        return `
        <tr style="background:${color}">
          <td>${global.escapeNilaiHtml(item.nipd || "-")}</td>
          <td>${global.escapeNilaiHtml(item.kelas || "-")}</td>
          <td>${global.escapeNilaiHtml(item.nama || "-")}</td>
          <td>${global.escapeNilaiHtml(item.mapel_kode || "-")}</td>
          ${previewFields.map((field) => `<td>${global.escapeNilaiHtml(item[field.valueKey] === "" ? "-" : item[field.valueKey])}</td>`).join("")}
          <td><b>${global.escapeNilaiHtml(item.status.toUpperCase())}</b>${item.message ? `<br><small>${global.escapeNilaiHtml(item.message)}</small>` : ""}</td>
        </tr>
      `;
      })
      .join("");

    container.innerHTML = `
      <div class="preview-header">
        <div>
          <h3>Preview Bulk Import Nilai (${global.nilaiPreviewData.length} data)</h3>
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
            <select id="nilaiPreviewRowsPerPage" onchange="setBulkNilaiPreviewRowsPerPage(this.value)">
              <option value="10" ${global.nilaiPreviewRowsPerPage === 10 ? "selected" : ""}>10</option>
              <option value="20" ${global.nilaiPreviewRowsPerPage === 20 ? "selected" : ""}>20</option>
              <option value="50" ${global.nilaiPreviewRowsPerPage === 50 ? "selected" : ""}>50</option>
              <option value="100" ${global.nilaiPreviewRowsPerPage === 100 ? "selected" : ""}>100</option>
              <option value="all" ${global.nilaiPreviewRowsPerPage === "all" ? "selected" : ""}>Semuanya</option>
            </select>
          </div>
          <button class="btn-secondary" onclick="batalBulkImportNilai()">Tutup</button>
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
              ${previewFields.map((field) => `<th>${global.escapeNilaiHtml(field.label)}</th>`).join("")}
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
        <button class="btn-primary" onclick="uploadBulkImportNilai()">Upload</button>
        <button class="btn-secondary" onclick="batalBulkImportNilai()">Batal</button>
      </div>

      <small class="preview-note">Hijau=baru | Biru=update | Abu=same | Merah=error</small>
    `;
    renderBulkNilaiPreviewPagination(totalPages);
  }

  function setBulkNilaiPreviewRowsPerPage(value) {
    global.nilaiPreviewRowsPerPage = value === "all" ? "all" : Number(value);
    global.nilaiPreviewPage = 1;
    renderBulkNilaiPreview();
  }

  function setBulkNilaiPreviewPage(page) {
    const totalPages = Math.max(
      1,
      Math.ceil(global.nilaiPreviewData.length / global.getNilaiPreviewRowsPerPageValue()),
    );
    global.nilaiPreviewPage = global.AppUtils.clamp ? global.AppUtils.clamp(page, 1, totalPages) : Math.min(Math.max(1, page), totalPages);
    renderBulkNilaiPreview();
  }

  function renderBulkNilaiPreviewPagination(totalPages) {
    const container = document.getElementById("nilaiPreviewPagination");
    if (!container) return;
    if (totalPages <= 1) {
      container.innerHTML = "";
      return;
    }
    container.innerHTML = `
      <div class="pagination">
        <button class="btn-secondary" onclick="setBulkNilaiPreviewPage(${global.nilaiPreviewPage - 1})" ${global.nilaiPreviewPage === 1 ? "disabled" : ""}>Prev</button>
        <span>Halaman ${global.nilaiPreviewPage} dari ${totalPages}</span>
        <button class="btn-secondary" onclick="setBulkNilaiPreviewPage(${global.nilaiPreviewPage + 1})" ${global.nilaiPreviewPage === totalPages ? "disabled" : ""}>Next</button>
      </div>
    `;
  }

  function batalBulkImportNilai(closeModal = true) {
    global.nilaiPreviewData = [];
    global.nilaiPreviewPage = 1;
    const container = document.getElementById("nilaiPreviewContainer");
    if (container) container.innerHTML = "";
    const input = document.getElementById("bulkNilaiImportInput");
    if (input) input.value = "";
    if (closeModal) {
      const modal = document.getElementById("nilaiPreviewModal");
      if (modal) {
        modal.style.display = "none";
        document.body.style.overflow = "";
        document.documentElement.style.overflow = "";
      }
    }
  }

  async function uploadBulkImportNilai() {
    if (global.isNilaiUploading) return;
    global.isNilaiUploading = true;

    const user = global.getCurrentNilaiUser ? global.getCurrentNilaiUser() : {};
    const mode = global.getNilaiImportMode ? global.getNilaiImportMode() : "update";
    const siapUpload = global.nilaiPreviewData.filter((item) => {
      if (item.status === "error") return false;
      if (mode === "skip" && item.existing) return false;
      if (mode === "update" && item.status === "same") return false;
      return true;
    });

    if (siapUpload.length === 0) {
      global.isNilaiUploading = false;
      Swal.fire(
        "Tidak ada perubahan",
        "Tidak ada nilai yang perlu diupload.",
        "info",
      );
      return;
    }

    try {
      Swal.fire({
        title: "Mengupload nilai...",
        html: "Sedang memproses data nilai jenjang...",
        didOpen: () => Swal.showLoading(),
      });

      // Group by assignment key
      const byAssignment = new Map();
      siapUpload.forEach(item => {
        const key = `${item.tingkat}|${item.rombel}|${item.mapel_kode}|${item.guru_kode}`;
        if (!byAssignment.has(key)) {
          byAssignment.set(key, []);
        }
        byAssignment.get(key).push(item);
      });

      let uploadCount = 0;
      for (const [key, items] of byAssignment.entries()) {
        const assignment = global.parseNilaiAssignmentId(key);
        const rows = items.map((item) => ({
          siswa: { nipd: item.nipd },
          payload: {
            ...global.getNilaiActiveTermPayload(),
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
            pts_locked_upto: global.getNilaiModeRules().isSemester
              ? global.getNilaiPtsLockedUpto(item.existing || {}, item)
              : global.getNilaiPtsLockedUptoFromValues(item, 3),
            updated_by: user.username || "",
            updated_at: new Date().toISOString(),
          },
        }));

        await global.upsertNilaiRows(rows, assignment);
        global.mergeSavedNilaiRowsIntoCache(rows, assignment);
        uploadCount += items.length;
      }

      batalBulkImportNilai(true);
      renderBulkUploadNilaiPageState();
      
      Swal.fire(
        "Import selesai",
        `${uploadCount} nilai berhasil diupload untuk ${byAssignment.size} kelas.`,
        "success"
      );
    } catch (error) {
      console.error(error);
      Swal.fire("Gagal upload", "", "error");
    } finally {
      global.isNilaiUploading = false;
    }
  }

  // Register public API on global window object
  global.BulkNilaiUpload = {
    loadRealtimeBulkUploadNilai,
    renderBulkUploadNilaiPage,
    renderBulkUploadNilaiPageState,
    handleBulkNilaiTingkatChange,
    handleBulkNilaiMapelChange,
    downloadBulkTemplateTrigger,
    triggerBulkNilaiImport,
    downloadBulkNilaiTemplate,
    importBulkNilaiExcel,
    renderBulkNilaiPreview,
    setBulkNilaiPreviewRowsPerPage,
    setBulkNilaiPreviewPage,
    batalBulkImportNilai,
    uploadBulkImportNilai
  };

  global.renderBulkUploadNilaiPage = renderBulkUploadNilaiPage;
  global.loadRealtimeBulkUploadNilai = loadRealtimeBulkUploadNilai;
  global.handleBulkNilaiTingkatChange = handleBulkNilaiTingkatChange;
  global.handleBulkNilaiMapelChange = handleBulkNilaiMapelChange;
  global.downloadBulkTemplateTrigger = downloadBulkTemplateTrigger;
  global.triggerBulkNilaiImport = triggerBulkNilaiImport;
  global.importBulkNilaiExcel = importBulkNilaiExcel;
  global.uploadBulkImportNilai = uploadBulkImportNilai;
  global.batalBulkImportNilai = batalBulkImportNilai;
  global.setBulkNilaiPreviewRowsPerPage = setBulkNilaiPreviewRowsPerPage;
  global.setBulkNilaiPreviewPage = setBulkNilaiPreviewPage;

  // Intercept data synchronization events to dynamically update page summary when data changes
  const originalRenderNilaiPageState = global.renderNilaiPageState;
  global.renderNilaiPageState = function() {
    if (typeof originalRenderNilaiPageState === "function") {
      originalRenderNilaiPageState();
    }
    if (document.getElementById("bulkNilaiContainer")) {
      renderBulkUploadNilaiPageState();
    }
  };

})(window);
