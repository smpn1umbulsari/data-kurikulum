// ================= UI KELAS =================
function setKelasTab(tabId) {
  kelasActiveTab = tabId;
  renderKelasPage();
}

function renderKelasPage() {
  const isDataMode = kelasActiveTab === "data";
  const isStatistikMode = kelasActiveTab === "statistik";
  const isKoordinator =
    typeof canUseCoordinatorAccess === "function" && canUseCoordinatorAccess();
  const levels =
    typeof getCurrentCoordinatorLevelsSync === "function"
      ? getCurrentCoordinatorLevelsSync()
      : [];

  return `
    <section class="app-page app-page--module kelas-page">
      <!-- UI-8: Panel 1 - Header -->
      <header class="app-panel app-panel--header kelas-header">
        <div class="app-page-title">
          <span class="dashboard-eyebrow">Administrasi</span>
          <h2>Data Kelas</h2>
          <p>Kelola data kelas dan wali kelas.</p>
        </div>
      </header>

      <!-- UI-8: Panel 2 - Tab -->
      <nav class="app-panel app-panel--tabs module-tabs kelas-tabs" role="tablist" aria-label="Mode kelas">
        <button type="button" class="module-tab ${isDataMode ? "active" : ""}"
                role="tab" aria-selected="${isDataMode}"
                onclick="setKelasTab('data')">
          Data Kelas
        </button>
        <button type="button" class="module-tab ${isStatistikMode ? "active" : ""}"
                role="tab" aria-selected="${isStatistikMode}"
                onclick="setKelasTab('statistik')">
          Statistik
        </button>
      </nav>

      ${
        isDataMode
          ? `
      <!-- UI-8: Panel 3 - Toolbar (SATU panel dengan 3 toolbar-row) -->
      <section class="app-panel app-panel--toolbar kelas-toolbar">
        <!-- toolbar-row--actions -->
        <div class="toolbar-row toolbar-row--actions">
          ${
            isKoordinator
              ? ""
              : `
            <button class="btn-secondary" onclick="downloadKelasTemplate()">
              <span class="kelas-action-icon kelas-icon-download" aria-hidden="true"></span>
              Template
            </button>
            <label class="btn-secondary kelas-upload-action">
              <span class="kelas-action-icon kelas-icon-upload" aria-hidden="true"></span>
              Import
              <input type="file" accept=".xlsx, .xls" onchange="importKelasExcel(event)">
            </label>
          `
          }
          <button class="btn-secondary" onclick="resetKelasFilter()">
            <span class="kelas-action-icon kelas-icon-reset" aria-hidden="true"></span>
            Reset
          </button>
          <button class="btn-secondary" onclick="refreshKelasTable()">
            <span class="kelas-action-icon kelas-icon-refresh" aria-hidden="true"></span>
            Refresh
          </button>
        </div>

        <!-- toolbar-row--filters -->
        <div class="toolbar-row toolbar-row--filters">
          ${isKoordinator ? `<span class="matrix-toolbar-note kelas-access-note">Koordinator hanya melihat kelas pada jenjang ${escapeKelasHtml(levels.length ? levels.join(", ") : "-")}.</span>` : ""}

          <div class="toolbar-row--info-inline">
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
        </div>
      </section>

      <!-- UI-8: Panel 4 - Content -->
      <section class="app-panel app-panel--content kelas-content">
        <div class="kelas-form-split">
          ${isKoordinator ? "" : `<div id="kelasCreateForm"></div>`}
        </div>

        <div class="table-container kelas-table-container">
          <table class="data-table kelas-data-table">
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

          <div id="emptyStateKelas" class="empty-state kelas-empty-state" style="display:none;">
            Tidak ada data kelas
          </div>
        </div>

        <div id="tablePaginationKelas" class="pagination-wrap"></div>
      </section>
      `
          : ""
      }

      ${
        isStatistikMode
          ? `
      <!-- UI-8: Panel 3 & 4 - Statistik Mode -->
      <section class="app-panel app-panel--toolbar kelas-toolbar">
        <div class="toolbar-row toolbar-row--info">
          <span>Mode Statistik</span>
        </div>
      </section>
      
      <section class="app-panel app-panel--content kelas-content">
        <div id="kelasStatistikContainer">
          ${renderKelasStatistikPage()}
        </div>
      </section>
      `
          : ""
      }
    </section>
  `;
}
