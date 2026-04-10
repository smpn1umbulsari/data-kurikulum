(function initWaliKelasView(global) {
  if (global.WaliKelasView) return;

  function renderPageShell() {
    return `
      <div class="card">
        <div id="waliKelasPageShell">
          <div class="empty-panel">Memuat data wali kelas...</div>
        </div>
      </div>
    `;
  }

  function renderHeader(context) {
    return `
      <div class="kelas-bayangan-head nilai-page-head">
        <div>
          <span class="dashboard-eyebrow">Wali Kelas</span>
          <h2>${context.escape(context.title)}</h2>
          <p>${context.escape(context.description)}</p>
        </div>
      </div>
      <div class="nilai-control-panel wali-control-panel">
        <label class="form-group">
          <span>Pilih kelas</span>
          <select id="waliKelasSelect" onchange="renderWaliKelasActivePage()">${context.selectOptionsHtml}</select>
        </label>
        <div class="nilai-control-actions">${context.extraActions || ""}</div>
      </div>
    `;
  }

  function renderKehadiranTable(context) {
    if (!context.kelas) {
      return `<div class="empty-panel">Tidak ada kelas wali yang bisa ditampilkan.</div>`;
    }

    return `
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
          ${context.students.map((siswa, index) => {
            const counts = context.getCounts(context.kelas, siswa.nipd);
            return `
              <tr>
                <td>${index + 1}</td>
                <td class="wali-student-name">${context.escape(siswa.nama || "-")}</td>
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

  function renderKelengkapanTable(context) {
    if (!context.kelas) {
      return `<div class="empty-panel">Tidak ada kelas wali yang bisa ditampilkan.</div>`;
    }
    if (!context.assignments.length) {
      return `<div class="empty-panel">Belum ada pembagian mengajar untuk ${context.escape(context.kelas)}.</div>`;
    }

    return `
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
          ${context.assignments.map(item => {
            const fields = [["uh_1", "UH 1"], ["uh_2", "UH 2"], ["uh_3", "UH 3"], ["pts", "PTS"]];
            return `
              <tr>
                <td>${context.escape(context.getMapelName(item.mapel_kode))}</td>
                <td>${context.escape(context.getGuruName(item))}</td>
                ${fields.map(([field]) => {
                  const result = context.getNilaiCount(context.kelas, item.mapel_kode, field);
                  return `<td class="${context.getCompletenessClass(result.count, result.total)}">${context.formatCompletenessText(result.count, result.total)}</td>`;
                }).join("")}
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    `;
  }

  global.WaliKelasView = {
    renderPageShell,
    renderHeader,
    renderKehadiranTable,
    renderKelengkapanTable
  };
})(window);
