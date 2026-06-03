// ================= UI MAPEL =================
function renderMapelPage() {
  const isBayangan =
    typeof getActiveMapelCollectionName === "function" &&
    getActiveMapelCollectionName() === "mapel_bayangan";
  return `
    <div class="card mapel-module-panel">
      <div class="mapel-module-header">
        <div>
          <span class="dashboard-eyebrow">Akademik</span>
          <h2>${isBayangan ? "Data Mata Pelajaran Kelas Bayangan" : "Data Mata Pelajaran"}</h2>
        </div>
        <div class="mapel-toolbar-actions">
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
      </div>

      ${isBayangan ? `<div class="matrix-toolbar-note mapel-access-note">Disalin dari Data Mapel asli. Yang bisa diubah hanya JP.</div>` : ""}

      <div class="mapel-toolbar-panel">
        <label class="mapel-field mapel-field-search" for="searchMapel">
          <span>Pencarian</span>
          <input id="searchMapel" placeholder="Cari kode atau nama mapel..." oninput="handleMapelSearch()">
        </label>
      </div>

      <div class="mapel-table-meta">
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
        <table class="mapel-table mapel-master-table">
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

        <div id="emptyStateMapel" class="mapel-empty-state" style="display:none;">
          Tidak ada data mata pelajaran
        </div>
      </div>

      <div id="tablePaginationMapel" class="pagination-wrap"></div>
    </div>
  `;
}
