// ================= UI MAPEL =================
function setMapelTab(tabId) {
  mapelActiveTab = tabId;
  renderMapelPage();
}

function renderMapelPage() {
  const isBayangan = mapelActiveTab === "bayangan";
  return `
    <section class="app-page app-page--data mapel-module-panel">
      <header class="app-page-header mapel-module-header">
        <div class="app-page-title">
          <span class="dashboard-eyebrow">Akademik</span>
          <h2>Data Mata Pelajaran</h2>
        </div>
        <div class="app-page-actions">
          <button class="btn-primary mapel-action-btn" onclick="loadPage('mapel-input')">
            <span class="mapel-action-icon mapel-icon-plus" aria-hidden="true"></span>
            Tambah Mapel
          </button>
        </div>
      </header>

      <nav class="module-tabs" role="tablist" aria-label="Mode mapel">
        <button type="button" class="module-tab ${!isBayangan ? "active" : ""}" 
                role="tab" aria-selected="${!isBayangan}" 
                onclick="setMapelTab('asli')">
          Mapel Asli
        </button>
        <button type="button" class="module-tab ${isBayangan ? "active" : ""}" 
                role="tab" aria-selected="${isBayangan}" 
                onclick="setMapelTab('bayangan')">
          Mapel Bayangan
        </button>
      </nav>

      <div class="action-bar mapel-toolbar-actions">
        ${
          isBayangan
            ? `
          <button class="btn-secondary mapel-action-btn" onclick="syncMapelBayanganManual()">
            <span class="mapel-action-icon mapel-icon-sync" aria-hidden="true"></span>
            Sinkron dari Data Mapel Asli
          </button>
        `
            : `
          <button class="btn-secondary mapel-action-btn" onclick="downloadMapelTemplate()">
            <span class="mapel-action-icon mapel-icon-download" aria-hidden="true"></span>
            Template
          </button>
          <label class="btn-secondary mapel-action-btn mapel-upload-action">
            <span class="mapel-action-icon mapel-icon-upload" aria-hidden="true"></span>
            Import
            <input type="file" accept=".xlsx, .xls" onchange="importMapelExcel(event)">
          </label>
        `
        }
        <button class="btn-secondary mapel-action-btn" onclick="resetMapelFilter()">
          <span class="mapel-action-icon mapel-icon-reset" aria-hidden="true"></span>
          Reset
        </button>
        <button class="btn-secondary mapel-action-btn" onclick="refreshMapelTable()">
          <span class="mapel-action-icon mapel-icon-refresh" aria-hidden="true"></span>
          Refresh
        </button>
      </div>

      ${isBayangan ? `<div class="matrix-toolbar-note mapel-access-note">Disalin dari Data Mapel asli. Yang bisa diubah hanya JP.</div>` : ""}

      <section class="control-panel mapel-toolbar-panel">
        <label class="mapel-field mapel-field-search" for="searchMapel">
          <span>Pencarian</span>
          <input id="searchMapel" placeholder="Cari kode atau nama mapel..." oninput="handleMapelSearch()">
        </label>
      </section>

      <div class="status-strip mapel-table-meta">
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

      <div id="tablePaginationMapel" class="pagination-wrap"></div>
    </section>
  `;
}
