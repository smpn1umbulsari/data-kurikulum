// ================= UI KELAS =================
function renderKelasPage() {
  const isKoordinator = typeof canUseCoordinatorAccess === "function" && canUseCoordinatorAccess();
  const levels = typeof getCurrentCoordinatorLevelsSync === "function" ? getCurrentCoordinatorLevelsSync() : [];
  return `
    <div class="card">
      <h2>Data Kelas</h2>
      ${isKoordinator ? `<div class="matrix-toolbar-note">Koordinator hanya melihat kelas pada jenjang ${escapeKelasHtml(levels.length ? levels.join(", ") : "-")}.</div>` : ""}

      <div class="toolbar">
        <div class="toolbar-left"></div>
        <div class="toolbar-right">
          ${isKoordinator ? "" : `
            <button class="btn-secondary" onclick="downloadKelasTemplate()">Download Template</button>
            <label class="btn-upload">
              Import
              <input type="file" accept=".xlsx, .xls" onchange="importKelasExcel(event)">
            </label>
          `}
        </div>
      </div>

      <div class="toolbar-info">
        <span id="jumlahDataKelas">0 kelas</span>
        <div class="page-size-control">
          <label for="rowsPerPageKelas">Tampilkan</label>
          <select id="rowsPerPageKelas" onchange="setKelasRowsPerPage(this.value)">
            <option value="10" selected>10</option>
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="100">100</option>
            <option value="200">200</option>
            <option value="all">Semuanya</option>
          </select>
          <button class="btn-secondary" onclick="refreshKelasTable()">Refresh</button>
        </div>
      </div>

      <div class="kelas-form-split">
        ${isKoordinator ? "" : `<div id="kelasCreateForm"></div>`}
      </div>

      <div class="table-container">
        <table class="kelas-data-table">
          <thead>
            <tr>
              ${renderSortableHeader("Tingkat", "tingkat", kelasSortField, kelasSortDirection, "setKelasSort")}
              ${renderSortableHeader("Kelas", "rombel", kelasSortField, kelasSortDirection, "setKelasSort")}
              ${renderSortableHeader("Wali Kelas", "wali_kelas", kelasSortField, kelasSortDirection, "setKelasSort")}
              <th>Jumlah Anggota</th>
              <th>${isKoordinator ? "Detail" : "Aksi"}</th>
            </tr>
          </thead>
          <tbody id="tbodyKelas"></tbody>
        </table>

        <div id="emptyStateKelas" style="display:none; text-align:center; padding:20px; color:#64748b;">
          Tidak ada data kelas
        </div>
      </div>

      <div id="tablePaginationKelas" class="pagination-wrap"></div>
    </div>
  `;
}
