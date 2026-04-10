(function initAsesmenRuangView(global) {
  if (global.AsesmenRuangView) return;

  function renderAdministrasiKeteranganSelect(context) {
    const value = context.getSetting("Keterangan", "Akhir Tahun");
    const options = context.keteranganOptions;
    const hasStoredValue = options.includes(value);
    const extraOption = value && !hasStoredValue
      ? `<option value="${context.escape(value)}" selected>${context.escape(value)}</option>`
      : "";

    return `
      <select class="kelas-inline-select" onchange="setAdministrasiAsesmenSetting('Keterangan', this.value)">
        ${extraOption}
        ${options.map(option => `<option value="${context.escape(option)}" ${option === value ? "selected" : ""}>${context.escape(option)}</option>`).join("")}
      </select>
    `;
  }

  function renderAdministrasiPage(context) {
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
            <input value="${context.escape(context.getSetting("Judul", "Asesmen Sumatif"))}" oninput="setAdministrasiAsesmenSetting('Judul', this.value)">
          </label>
          <label class="form-group">
            <span>Keterangan</span>
            ${renderAdministrasiKeteranganSelect(context)}
          </label>
          <label class="form-group">
            <span>Tahun Pelajaran</span>
            <input value="${context.escape(context.getSetting("TahunPelajaran", ""))}" placeholder="2025/2026" oninput="setAdministrasiAsesmenSetting('TahunPelajaran', this.value)">
          </label>
        </div>

        ${context.ttdPanelHtml}

        <div class="table-container mapel-table-container asesmen-admin-table-wrap">
          <table class="mapel-table asesmen-admin-table">
            <thead>
              <tr>
                <th>Administrasi</th>
                <th>Export PDF</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="asesmen-admin-name-cell">Tempel Kaca</td>
                <td class="asesmen-admin-action-cell"><button type="button" class="btn-primary btn-table-compact" onclick="exportTempelKacaPDF()">Export PDF</button></td>
              </tr>
              <tr>
                <td class="asesmen-admin-name-cell">Data Map</td>
                <td class="asesmen-admin-action-cell"><button type="button" class="btn-primary btn-table-compact" onclick="exportDataMapPDF()">Export PDF</button></td>
              </tr>
              <tr>
                <td class="asesmen-admin-name-cell">Denah Peserta</td>
                <td class="asesmen-admin-action-cell"><button type="button" class="btn-primary btn-table-compact" onclick="exportDenahPesertaPDF()">Export PDF</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function renderManualInputs(context, level) {
    const settings = context.draftSettings[level];
    if (settings.mode !== "manual") return "";

    const filledCounts = settings.manualCounts
      .slice(0, context.jumlahRuangUjian)
      .map(value => Math.min(Math.max(Number(value) || 0, 0), 20));

    return `
      <div class="asesmen-manual-summary">
        <div class="asesmen-manual-summary-head">
          <span>Manual per ruang</span>
          <button type="button" class="btn-secondary btn-table-compact" onclick="openAsesmenManualCountDialog('${level}')">Atur Manual</button>
        </div>
        <div class="asesmen-level-summary">
          ${Array.from({ length: context.jumlahRuangUjian }, (_, index) => `<span>Ruang ${index + 1}: ${filledCounts[index] || 0}</span>`).join("")}
        </div>
      </div>
    `;
  }

  function renderRoomRangeInputs(context, level) {
    const ranges = context.draftSettings[level].roomRanges;
    return `
      <div class="asesmen-range-grid">
        ${ranges.map((range, index) => `
          <div class="asesmen-range-group">
            <span>Rentang ${index + 1}</span>
            <input
              type="number"
              min="1"
              value="${context.escape(range.start)}"
              placeholder="Awal"
              oninput="setAsesmenRoomRange('${level}', ${index}, 'start', this.value)"
            >
            <input
              type="number"
              min="1"
              value="${context.escape(range.end)}"
              placeholder="Akhir"
              oninput="setAsesmenRoomRange('${level}', ${index}, 'end', this.value)"
            >
          </div>
        `).join("")}
      </div>
    `;
  }

  function renderLevelPanel(context, level) {
    const settings = context.draftSettings[level];
    const totalSiswa = context.getStudentCount(level);

    return `
      <section class="asesmen-level-panel">
        <div class="asesmen-panel-head">
          <div>
            <span class="mapel-row-hint">Panel Kelas ${level}</span>
            <h3>Kelas ${level}</h3>
          </div>
          <strong>${totalSiswa} siswa</strong>
        </div>

        <div class="asesmen-control-grid">
          <label class="form-group">
            <span>Urutan</span>
            <select class="kelas-inline-select" onchange="setAsesmenOrder('${level}', this.value)">
              <option value="az" ${settings.order === "az" ? "selected" : ""}>A-Z</option>
              <option value="za" ${settings.order === "za" ? "selected" : ""}>Z-A</option>
            </select>
          </label>
        </div>

        ${renderRoomRangeInputs(context, level)}
        ${renderManualInputs(context, level)}

        <div class="asesmen-panel-actions">
          <button type="button" class="btn-primary btn-table-compact" onclick="applyAsesmenLevelSettings('${level}')">Set Kelas ${level}</button>
          <span class="mapel-row-hint">Perubahan panel ini diterapkan setelah klik Set.</span>
        </div>

        <div id="asesmenPreview-${level}" class="asesmen-preview"></div>
      </section>
    `;
  }

  function renderPembagianPage(context) {
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
              <span>Jika pilih Manual, isi jumlah siswa per ruang lewat pop-up pada panel kelas.</span>
            </div>
            <div class="asesmen-room-total-control">
              <label class="asesmen-room-total-field">
                <span>Jumlah ruang</span>
                <input type="number" min="1" max="99" value="${context.draftJumlahRuangUjian}" oninput="setJumlahRuangUjian(this.value)" title="Jumlah ruang ujian">
              </label>
              <label class="asesmen-room-total-field">
                <span>Mode pembagian</span>
                <select class="kelas-inline-select" onchange="setPembagianKelasAsesmen(this.value)" title="Pembagian kelas">
                  <option value="setengah" ${context.draftPembagianKelasAsesmen === "setengah" ? "selected" : ""}>Setengah</option>
                  <option value="20siswa" ${context.draftPembagianKelasAsesmen === "20siswa" ? "selected" : ""}>20 siswa</option>
                  <option value="manual" ${context.draftPembagianKelasAsesmen === "manual" ? "selected" : ""}>Manual</option>
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
          ${[7, 8, 9].map(level => renderLevelPanel(context, level)).join("")}
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

  global.AsesmenRuangView = {
    renderAdministrasiKeteranganSelect,
    renderAdministrasiPage,
    renderManualInputs,
    renderRoomRangeInputs,
    renderLevelPanel,
    renderPembagianPage
  };
})(window);
