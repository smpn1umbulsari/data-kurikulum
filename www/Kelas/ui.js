// ================= UI KELAS =================
function renderKelasPage() {
  const isKoordinator = typeof canUseCoordinatorAccess === "function" && canUseCoordinatorAccess();
  const levels = typeof getCurrentCoordinatorLevelsSync === "function" ? getCurrentCoordinatorLevelsSync() : [];
  return `
    <div class="card kelas-module-panel">
      <div class="kelas-module-header">
        <div>
          <span class="dashboard-eyebrow">Administrasi</span>
          <h2>Data Kelas</h2>
        </div>
        <div class="kelas-toolbar-actions">
          ${isKoordinator ? "" : `
            <button class="btn-secondary kelas-action-btn" onclick="downloadKelasTemplate()">
              <span class="kelas-action-icon kelas-icon-download" aria-hidden="true"></span>
              Template
            </button>
            <label class="btn-secondary kelas-action-btn kelas-upload-action">
              <span class="kelas-action-icon kelas-icon-upload" aria-hidden="true"></span>
              Import
              <input type="file" accept=".xlsx, .xls" onchange="importKelasExcel(event)">
            </label>
          `}
          <button class="btn-secondary kelas-action-btn" onclick="resetKelasFilter()">
            <span class="kelas-action-icon kelas-icon-reset" aria-hidden="true"></span>
            Reset
          </button>
          <button class="btn-secondary kelas-action-btn" onclick="refreshKelasTable()">
            <span class="kelas-action-icon kelas-icon-refresh" aria-hidden="true"></span>
            Refresh
          </button>
        </div>
      </div>

      ${isKoordinator ? `<div class="matrix-toolbar-note kelas-access-note">Koordinator hanya melihat kelas pada jenjang ${escapeKelasHtml(levels.length ? levels.join(", ") : "-")}.</div>` : ""}

      <div class="kelas-table-meta">
        <span id="jumlahDataKelas">0 kelas</span>
        <label class="page-size-control" for="rowsPerPageKelas">
          <span>Rows per page</span>
          <select id="rowsPerPageKelas" onchange="setKelasRowsPerPage(this.value)">
            <option value="10" selected>10</option>
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="100">100</option>
            <option value="200">200</option>
            <option value="all">Semua</option>
          </select>
        </label>
      </div>

      <div class="kelas-form-split">
        ${isKoordinator ? "" : `<div id="kelasCreateForm"></div>`}
      </div>

      <div class="table-container kelas-table-container">
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

        <div id="emptyStateKelas" class="kelas-empty-state" style="display:none;">
          Tidak ada data kelas
        </div>
      </div>

      <div id="tablePaginationKelas" class="pagination-wrap"></div>
    </div>
  `;
}
