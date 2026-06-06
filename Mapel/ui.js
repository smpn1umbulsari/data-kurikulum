// ================= UI MAPEL =================
function setMapelTab(tabId) {
  mapelActiveTab = tabId;
  renderMapelPage();
}

function renderMapelPage() {
  const isBayangan = mapelActiveTab === "bayangan";

  const tabsHtml = `
        <button type="button" class="module-tab ${!isBayangan ? "active" : ""}" 
                role="tab" aria-selected="${!isBayangan}" 
                onclick="setMapelTab('asli')">
          Mapel Asli
        </button>
        <button type="button" class="module-tab ${isBayangan ? "active" : ""}" 
                role="tab" aria-selected="${isBayangan}" 
                onclick="setMapelTab('bayangan')">
          Mapel Bayangan
        </button>`;

  const toolbarHtml = `
        <!-- toolbar-row--actions -->
        <div class="toolbar-row toolbar-row--actions">
          <button class="btn-primary" onclick="loadPage('mapel-input')">
            <span class="mapel-action-icon mapel-icon-plus" aria-hidden="true"></span>
            Tambah Mapel
          </button>
          ${
            isBayangan
              ? `
            <button class="btn-secondary" onclick="syncMapelBayanganManual()">
              <span class="mapel-action-icon mapel-icon-sync" aria-hidden="true"></span>
              Sinkron dari Data Mapel Asli
            </button>
          `
              : `
            <button class="btn-secondary" onclick="downloadMapelTemplate()">
              <span class="mapel-action-icon mapel-icon-download" aria-hidden="true"></span>
              Template
            </button>
            <label class="btn-secondary mapel-upload-action">
              <span class="mapel-action-icon mapel-icon-upload" aria-hidden="true"></span>
              Import
              <input type="file" accept=".xlsx, .xls" onchange="importMapelExcel(event)">
            </label>
          `
          }
          <button class="btn-secondary" onclick="resetMapelFilter()">
            <span class="mapel-action-icon mapel-icon-reset" aria-hidden="true"></span>
            Reset
          </button>
          <button class="btn-secondary" onclick="refreshMapelTable()">
            <span class="mapel-action-icon mapel-icon-refresh" aria-hidden="true"></span>
            Refresh
          </button>
        </div>

        <!-- toolbar-row--filters -->
        <div class="toolbar-row toolbar-row--filters">
          ${isBayangan ? `<span class="matrix-toolbar-note mapel-access-note">Disalin dari Data Mapel asli. Yang bisa diubah hanya JP.</span>` : ""}
          <label class="mapel-field mapel-field-search" for="searchMapel">
            <span>Pencarian</span>
            <input id="searchMapel" placeholder="Cari kode atau nama mapel..." oninput="handleMapelSearch()">
          </label>

          <div class="toolbar-row--info-inline">
            <span id="jumlahDataMapel">0 mapel</span>
            <label class="page-size-control" for="rowsPerPageMapel">
              <span>Rows per page</span>
              <select id="rowsPerPageMapel" onchange="setMapelRowsPerPage(this.value)">
                <option value="10" selected>10</option>
                <option value="20">20</option>
                <option value="50">50</option>
                <option value="100">100</option>
                <option value="200">200</option>
                <option value="all">Semua</option>
              </select>
            </label>
          </div>
        </div>`;

  const contentHtml = `
        <div class="table-container mapel-table-container">
          <table class="data-table mapel-table mapel-master-table">
            <colgroup>
              <col class="mapel-master-col-map">
              <col class="mapel-master-col-induk">
              <col class="mapel-master-col-kode">
              <col class="mapel-master-col-nama">
              <col class="mapel-master-col-jp">
              <col class="mapel-master-col-aksi">
            </colgroup>
            <thead>
              <tr>
                ${renderSortableHeader("No", "mapping", mapelSortField, mapelSortDirection, "setMapelSort")}
                ${renderSortableHeader("Induk", "induk_mapel", mapelSortField, mapelSortDirection, "setMapelSort")}
                ${renderSortableHeader("Kode Mapel", "kode_mapel", mapelSortField, mapelSortDirection, "setMapelSort")}
                ${renderSortableHeader("Nama Mapel", "nama_mapel", mapelSortField, mapelSortDirection, "setMapelSort")}
                ${renderSortableHeader("JP", "jp", mapelSortField, mapelSortDirection, "setMapelSort")}
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody id="tbodyMapel"></tbody>
          </table>

          <div id="emptyStateMapel" class="empty-state mapel-empty-state" style="display:none;">
            Tidak ada data mata pelajaran
          </div>
        </div>

        <div id="tablePaginationMapel" class="pagination-wrap"></div>`;

  return AppUtils.renderModuleLayout({
    moduleName: "mapel",
    eyebrow: "Akademik",
    title: "Data Mata Pelajaran",
    subtitle: "Kelola data mapel asli dan mapel bayangan.",
    tabs: tabsHtml,
    tabsLabel: "Mode mapel",
    toolbar: toolbarHtml,
    content: contentHtml,
  });
}
