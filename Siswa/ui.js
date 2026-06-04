// ================= FORM =================
function renderForm() {
  const isKoordinator =
    typeof canUseCoordinatorAccess === "function" && canUseCoordinatorAccess();
  const levels =
    typeof getCurrentCoordinatorLevelsSync === "function"
      ? getCurrentCoordinatorLevelsSync()
      : [];
  return `
    <div class="student-form-layout">
      <section class="student-form-shell">
        <div class="student-form-hero">
          <div>
            <span class="student-form-eyebrow">Input Data Siswa</span>
            <h2>Tambah data baru dengan format yang rapi dan cepat dibaca.</h2>
            <p>
              Isi identitas inti siswa, lalu simpan ke database. Form ini dibuat
              agar operator bisa fokus pada akurasi tanpa tampilan yang ramai.
            </p>
            ${isKoordinator ? `<div class="matrix-toolbar-note">Input siswa dibatasi ke jenjang ${escapeSiswaHtml(levels.length ? levels.join(", ") : "-")}.</div>` : ""}
          </div>
          <div class="student-form-hero-badge">
            <strong>6 Field</strong>
            <span>Identitas utama siswa</span>
          </div>
        </div>

        <div class="student-form-card">
          <div class="student-form-grid">
            <div class="form-group">
              <label for="nipd">NIPD</label>
              <input id="nipd" placeholder="Masukkan NIPD" oninput="validateForm()">
              <div id="err-nipd" class="error-text"></div>
            </div>

            <div class="form-group">
              <label for="nisn">NISN</label>
              <input id="nisn" placeholder="10 digit NISN" oninput="validateForm()">
              <div id="err-nisn" class="error-text"></div>
            </div>

            <div class="form-group form-group-full">
              <label for="nama">Nama Siswa</label>
              <input id="nama" placeholder="Masukkan nama lengkap siswa" oninput="validateForm()">
              <div id="err-nama" class="error-text"></div>
            </div>

            <div class="form-group">
              <label for="jk">Jenis Kelamin</label>
              <select id="jk" onchange="validateForm()">
                <option value="">Pilih jenis kelamin</option>
                <option value="L">Laki-laki</option>
                <option value="P">Perempuan</option>
              </select>
            </div>

            <div class="form-group">
              <label for="agama">Agama</label>
              <select id="agama">
                <option value="">Pilih agama</option>
                <option>Islam</option>
                <option>Kristen</option>
                <option>Katolik</option>
                <option>Hindu</option>
                <option>Buddha</option>
                <option>Konghucu</option>
              </select>
            </div>

            <div class="form-group form-group-full">
              <label for="kelas">Kelas</label>
              <select id="kelas">
                ${renderSiswaKelasOptions()}
              </select>
            </div>
          </div>

          <div class="student-form-actions">
            <button type="button" class="btn-secondary" onclick="loadPage('lihat')">
              Kembali ke Data Siswa
            </button>
            <button id="btnSimpan" class="btn-primary" onclick="simpanData()">
              Simpan Data
            </button>
            <span class="student-form-helper">Pastikan NIPD dan NISN tidak duplikat sebelum menyimpan.</span>
          </div>
        </div>
      </section>

      <aside class="student-form-sidepanel">
        <div class="student-side-card">
          <span class="student-side-label">Checklist Cepat</span>
          <ul>
            <li>NIPD wajib diisi dan unik</li>
            <li>NISN harus 10 digit angka</li>
            <li>Nama siswa minimal 3 karakter</li>
            <li>Kelas boleh ditulis dengan spasi atau tanpa spasi</li>
          </ul>
        </div>

        <div class="student-side-card student-side-card-accent">
          <span class="student-side-label">Tips Operator</span>
          <p>
            Gunakan format penulisan nama yang konsisten agar pencarian dan proses
            import data berikutnya lebih mudah dicocokkan.
          </p>
        </div>
      </aside>
    </div>
  `;
}

function renderSortableHeader(
  label,
  field,
  sortField,
  sortDirection,
  handlerName,
) {
  const isActive = sortField === field;
  const indicator = isActive ? (sortDirection === "asc" ? " ▲" : " ▼") : "";
  return `<th class="sortable-header ${isActive ? "active" : ""}" onclick="${handlerName}('${field}')">${label}${indicator}</th>`;
}

// ================= TABLE =================
function escapeSiswaHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeSiswaJs(value) {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'");
}

function updateFilterUI() {
  const rows = document.getElementById("rowsPerPage");
  if (rows) rows.value = String(rowsPerPage);
}

function renderSiswaModuleTabs(activeRoute = "lihat") {
  const tabs = [
    { route: "lihat", label: "Siswa Aktif" },
    { route: "siswa-lulus", label: "Siswa Lulus" },
  ];
  return `
    <div class="siswa-module-tabs" role="tablist" aria-label="Navigasi data siswa">
      ${tabs
        .map(
          (tab) => `
        <button
          type="button"
          class="siswa-module-tab ${activeRoute === tab.route ? "active" : ""}"
          role="tab"
          aria-selected="${activeRoute === tab.route ? "true" : "false"}"
          onclick="loadPage('${tab.route}')"
        >
          ${tab.label}
        </button>
      `,
        )
        .join("")}
    </div>
  `;
}

function renderTable() {
  const isKoordinator =
    typeof canUseCoordinatorAccess === "function" && canUseCoordinatorAccess();
  const levels =
    typeof getCurrentCoordinatorLevelsSync === "function"
      ? getCurrentCoordinatorLevelsSync()
      : [];
  return `
    <section class="app-page app-page--data siswa-module-panel">
      <!-- HEADER BARU: Identitas + Tab digabung -->
      <header class="siswa-new-header">
        <div class="siswa-new-header-left">
          <span class="dashboard-eyebrow siswa-accent-text">Akademik</span>
          <h2>Data Siswa</h2>
        </div>
        <div class="siswa-new-header-right">
          ${renderSiswaModuleTabs("lihat")}
        </div>
      </header>

      <!-- TOMBOL CEPAT BARU: Semua tombol di satu baris -->
      <div class="siswa-action-bar">
        <button class="btn-primary siswa-action-add" onclick="loadPage('input')">
          <span class="siswa-action-icon siswa-icon-plus" aria-hidden="true"></span>
          Tambah Siswa
        </button>
        ${
          isKoordinator
            ? ""
            : `
          <button class="btn-secondary siswa-action-btn" onclick="downloadSiswaTemplate()">
            <span class="siswa-action-icon siswa-icon-download" aria-hidden="true"></span>
            Template
          </button>
          <label class="btn-secondary siswa-action-btn siswa-upload-action">
            <span class="siswa-action-icon siswa-icon-upload" aria-hidden="true"></span>
            Import
            <input type="file" accept=".xlsx, .xls" onchange="importExcel(event)">
          </label>
        `
        }
        <button class="btn-secondary siswa-action-btn" onclick="resetFilter()">
          <span class="siswa-action-icon siswa-icon-reset" aria-hidden="true"></span>
          Reset
        </button>
        <button class="btn-secondary siswa-action-btn" onclick="refreshSiswaTable()">
          <span class="siswa-action-icon siswa-icon-refresh" aria-hidden="true"></span>
          Refresh
        </button>
      </div>

      ${isKoordinator ? `<div class="matrix-toolbar-note siswa-access-note">Akses koordinator dibatasi ke jenjang ${escapeSiswaHtml(levels.length ? levels.join(", ") : "-")}.</div>` : ""}

      <section class="control-panel siswa-toolbar-panel">
        <div class="siswa-filter-grid">
          <label class="siswa-field siswa-field-search" for="search">
            <span>Pencarian</span>
            <input id="search" placeholder="Cari nama, NIPD, atau NISN..." oninput="handleSearch(); updateFilterUI()">
          </label>

          <label class="siswa-field" for="filterTingkat">
            <span>Tingkat</span>
            <select id="filterTingkat" onchange="handleTingkatFilterChange()">
              <option value="">Semua Tingkat</option>
              <option value="7">Tingkat 7</option>
              <option value="8">Tingkat 8</option>
              <option value="9">Tingkat 9</option>
            </select>
          </label>

          <label class="siswa-field" for="filterKelas">
            <span>Kelas</span>
            <select id="filterKelas" onchange="applyFilters()">
              <option value="">Semua Kelas</option>
            </select>
          </label>

          <label class="siswa-field" for="filterAgama">
            <span>Agama</span>
            <select id="filterAgama" onchange="applyFilters(); updateFilterUI()">
              <option value="">Semua Agama</option>
              <option>Islam</option>
              <option>Kristen</option>
              <option>Katolik</option>
              <option>Hindu</option>
              <option>Buddha</option>
              <option>Konghucu</option>
            </select>
          </label>
        </div>
      </section>

      <div class="status-strip siswa-table-meta">
        <span id="jumlahData">0 siswa</span>
        <label class="page-size-control" for="rowsPerPage">
          <span>Rows per page</span>
          <select id="rowsPerPage" onchange="setRowsPerPage(this.value)">
            <option value="10" selected>10</option>
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="100">100</option>
            <option value="200">200</option>
            <option value="all">Semua</option>
          </select>
        </label>
      </div>

      <div class="table-container siswa-table-container">
        <table class="data-table siswa-compact-table">
          <thead>
            <tr>
              <th class="sortable-header siswa-col-nipd ${siswaSortField === "nipd" ? "active" : ""}" onclick="setSiswaSort('nipd')">NIPD${siswaSortField === "nipd" ? (siswaSortDirection === "asc" ? " ▲" : " ▼") : ""}</th>
              <th class="sortable-header siswa-col-nisn ${siswaSortField === "nisn" ? "active" : ""}" onclick="setSiswaSort('nisn')">NISN${siswaSortField === "nisn" ? (siswaSortDirection === "asc" ? " ▲" : " ▼") : ""}</th>
              <th class="sortable-header siswa-col-nama ${siswaSortField === "nama" ? "active" : ""}" onclick="setSiswaSort('nama')">Nama${siswaSortField === "nama" ? (siswaSortDirection === "asc" ? " ▲" : " ▼") : ""}</th>
              <th class="sortable-header siswa-col-jk ${siswaSortField === "jk" ? "active" : ""}" onclick="setSiswaSort('jk')">JK${siswaSortField === "jk" ? (siswaSortDirection === "asc" ? " ▲" : " ▼") : ""}</th>
              <th class="sortable-header siswa-col-agama ${siswaSortField === "agama" ? "active" : ""}" onclick="setSiswaSort('agama')">Agama${siswaSortField === "agama" ? (siswaSortDirection === "asc" ? " ▲" : " ▼") : ""}</th>
              <th class="sortable-header siswa-col-kelas ${siswaSortField === "kelas" ? "active" : ""}" onclick="setSiswaSort('kelas')">Kelas${siswaSortField === "kelas" ? (siswaSortDirection === "asc" ? " ▲" : " ▼") : ""}</th>
              <th class="siswa-col-aksi">Aksi</th>
            </tr>
          </thead>
          <tbody id="tbody"></tbody>
        </table>

        <div id="emptyState" class="empty-state siswa-empty-state" style="display:none;">
          Tidak ada data
        </div>
      </div>

      <div id="tablePagination" class="pagination-wrap"></div>

    </section>

    <div id="previewModal" class="preview-modal" style="display:none;" onclick="handlePreviewBackdrop(event)">
      <div class="preview-modal-content">
        <div id="previewContainer"></div>
      </div>
    </div>
  `;
}

// ================= ROW =================
function renderRow(d) {
  const isKoordinator =
    typeof canUseCoordinatorAccess === "function" && canUseCoordinatorAccess();
  const nipd = String(d.nipd || "");
  const safeNipd = escapeSiswaHtml(nipd);
  const safeNipdJs = escapeSiswaJs(nipd);

  if (currentEdit === d.nipd) {
    return `
      <tr class="table-edit-row" data-siswa-nipd="${safeNipd}">
        <td class="siswa-col-nipd">${safeNipd}</td>
        <td class="siswa-col-nisn"><input id="nisn-${safeNipd}" value="${escapeSiswaHtml(d.nisn || "")}"></td>
        <td class="siswa-col-nama"><input id="nama-${safeNipd}" value="${escapeSiswaHtml(d.nama || "")}"></td>

        <td class="siswa-col-jk">
          <select id="jk-${safeNipd}">
            <option value="L" ${d.jk === "L" ? "selected" : ""}>L</option>
            <option value="P" ${d.jk === "P" ? "selected" : ""}>P</option>
          </select>
        </td>

        <td class="siswa-col-agama">
          <select id="agama-${safeNipd}">
            ${renderAgamaOptions(d.agama)}
          </select>
        </td>

        <td class="siswa-col-kelas">
          <select id="kelas-${safeNipd}">
            ${renderSiswaKelasOptions(d.kelas || "")}
          </select>
        </td>

        <td class="siswa-col-aksi">
          <div class="table-actions siswa-row-actions">
            <button type="button" onclick="saveEdit('${safeNipdJs}')" class="btn-primary btn-table-compact table-action-icon-btn table-action-save" title="Simpan" aria-label="Simpan"></button>
            <button type="button" onclick="cancelEdit()" class="btn-secondary btn-table-compact table-action-icon-btn table-action-cancel" title="Batal" aria-label="Batal"></button>
          </div>
        </td>
      </tr>
    `;
  }

  return `
    <tr data-siswa-nipd="${safeNipd}">
      <td class="siswa-col-nipd">${escapeSiswaHtml(d.nipd || "-")}</td>
      <td class="siswa-col-nisn">${escapeSiswaHtml(d.nisn || "-")}</td>
      <td class="siswa-col-nama" title="${escapeSiswaHtml(d.nama || "-")}">${escapeSiswaHtml(d.nama || "-")}</td>
      <td class="siswa-col-jk">${escapeSiswaHtml(d.jk || "-")}</td>
      <td class="siswa-col-agama">${escapeSiswaHtml(d.agama || "-")}</td>
      <td class="siswa-col-kelas">${escapeSiswaHtml(d.kelas || "-")}</td>
      <td class="siswa-col-aksi">
        <div class="table-actions siswa-row-actions">
        ${
          d.nipd
            ? `
          <button type="button" class="btn-secondary btn-table-compact siswa-edit-btn table-action-icon-btn table-action-edit" onclick="editRow('${safeNipdJs}')" title="Edit" aria-label="Edit"></button>
        `
            : `
          <button type="button" class="btn-secondary btn-table-compact siswa-edit-btn table-action-icon-btn table-action-edit" disabled title="Edit tidak tersedia" aria-label="Edit tidak tersedia"></button>
        `
        }

        <button type="button" class="btn-danger btn-table-compact siswa-delete-btn table-action-icon-btn table-action-delete" onclick="hapusData('${safeNipdJs}')" title="Hapus" aria-label="Hapus"></button>
        </div>
      </td>
    </tr>
  `;
}

// ================= HELPER =================
function renderAgamaOptions(selected) {
  const list = ["Islam", "Kristen", "Katolik", "Hindu", "Buddha", "Konghucu"];
  return list
    .map((a) => `<option ${a === selected ? "selected" : ""}>${a}</option>`)
    .join("");
}
