// ================= UI GURU =================
function renderGuruForm() {
  return `
    <div class="student-form-layout">
      <section class="student-form-shell teacher-form-shell">
        <div class="student-form-hero teacher-form-hero">
          <div>
            <span class="student-form-eyebrow teacher-form-eyebrow">Input Data Guru</span>
            <h2>Susun identitas guru dengan format profesional dan mudah dicek ulang.</h2>
            <p>
              Simpan data inti guru agar daftar pengajar tetap konsisten, mudah dicari,
              dan siap dipakai untuk kebutuhan administrasi sekolah.
            </p>
          </div>
          <div class="student-form-hero-badge teacher-form-badge">
            <strong>7 Field</strong>
            <span>Profil utama guru</span>
          </div>
        </div>

        <div class="student-form-card">
          <div class="student-form-grid">
            <div class="form-group">
              <label for="kodeGuru">Kode Guru</label>
              <input id="kodeGuru" placeholder="Masukkan kode guru" oninput="validateGuruForm()">
              <div id="err-kodeGuru" class="error-text"></div>
            </div>

            <div class="form-group">
              <label for="nipGuru">NIP</label>
              <input id="nipGuru" placeholder="Masukkan NIP" oninput="validateGuruForm()">
              <div id="err-nipGuru" class="error-text"></div>
            </div>

            <div class="form-group">
              <label for="statusGuru">Status</label>
              <select id="statusGuru" onchange="handleGuruStatusChange()">
                ${renderGuruStatusOptions("PNS")}
              </select>
            </div>

            <div class="form-group form-group-full">
              <label for="namaGuru">Nama Tanpa Gelar</label>
              <input id="namaGuru" placeholder="Masukkan nama tanpa gelar" oninput="validateGuruForm()">
              <div id="err-namaGuru" class="error-text"></div>
            </div>

            <div class="form-group">
              <label for="gelarDepanGuru">Gelar Depan</label>
              <input id="gelarDepanGuru" placeholder="Contoh: Drs.">
            </div>

            <div class="form-group">
              <label for="gelarBelakangGuru">Gelar Belakang</label>
              <input id="gelarBelakangGuru" placeholder="Contoh: S.Pd.">
            </div>

            <div class="form-group form-group-full">
              <label for="mapelGuru">Mata Pelajaran</label>
              <select id="mapelGuru" onchange="validateGuruForm()">
                ${renderGuruMapelOptions()}
              </select>
              <div id="err-mapelGuru" class="error-text"></div>
            </div>
          </div>

          <div class="student-form-actions">
            <button id="btnSimpanGuru" class="btn-primary" onclick="simpanGuruData()">
              Simpan Data Guru
            </button>
            <span class="student-form-helper">Nama pada tabel akan otomatis ditampilkan beserta gelar depan dan belakang.</span>
          </div>
        </div>
      </section>

      <aside class="student-form-sidepanel">
        <div class="student-side-card teacher-side-card">
          <span class="student-side-label teacher-side-label">Checklist Cepat</span>
          <ul>
            <li>Kode guru wajib unik</li>
            <li>Nama disimpan tanpa gelar</li>
            <li>Gelar depan dan belakang boleh kosong</li>
            <li>NIP harus berupa angka</li>
            <li>Status default adalah PNS</li>
            <li>Mata pelajaran wajib diisi</li>
          </ul>
        </div>

        <div class="student-side-card student-side-card-accent teacher-side-card-accent">
          <span class="student-side-label teacher-side-label">Tampilan Otomatis</span>
          <p>
            Saat data ditampilkan, nama guru akan dirangkai otomatis menjadi format lengkap,
            misalnya gelar depan, nama, lalu gelar belakang.
          </p>
        </div>
      </aside>
    </div>
  `;
}

function renderGuruModuleTabs(activeRoute = "guru-lihat") {
  const tabs = [
    { route: "guru-lihat", label: "Data Guru" },
    { route: "tugas-tambahan", label: "Tugas Tambahan" }
  ];
  return `
    <div class="siswa-module-tabs guru-module-tabs" role="tablist" aria-label="Navigasi guru dan tugas tambahan">
      ${tabs.map(tab => `
        <button
          type="button"
          class="siswa-module-tab guru-module-tab ${activeRoute === tab.route ? "active" : ""}"
          role="tab"
          aria-selected="${activeRoute === tab.route ? "true" : "false"}"
          onclick="loadPage('${tab.route}')"
        >
          ${tab.label}
        </button>
      `).join("")}
    </div>
  `;
}

function renderGuruTable() {
  return `
    <div class="card guru-module-panel">
      <div class="guru-module-header">
        <div>
          <span class="dashboard-eyebrow">Administrasi</span>
          <h2>Data Guru</h2>
        </div>
        <button class="btn-primary guru-primary-action" onclick="loadPage('guru-input')">
          <span class="guru-action-icon guru-icon-plus" aria-hidden="true"></span>
          Tambah Guru
        </button>
        <div class="guru-toolbar-actions">
          <button class="btn-secondary guru-action-btn" onclick="downloadGuruTemplate()">
            <span class="guru-action-icon guru-icon-download" aria-hidden="true"></span>
            Template
          </button>
          <label class="btn-secondary guru-action-btn guru-upload-action">
            <span class="guru-action-icon guru-icon-upload" aria-hidden="true"></span>
            Import
            <input type="file" accept=".xlsx, .xls" onchange="importGuruExcel(event)">
          </label>
          <button class="btn-secondary guru-action-btn" onclick="resetGuruFilter()">
            <span class="guru-action-icon guru-icon-reset" aria-hidden="true"></span>
            Reset
          </button>
          <button class="btn-secondary guru-action-btn" onclick="refreshGuruTable()">
            <span class="guru-action-icon guru-icon-refresh" aria-hidden="true"></span>
            Refresh
          </button>
        </div>
      </div>

      ${renderGuruModuleTabs("guru-lihat")}

      <div class="guru-toolbar-panel">
        <label class="guru-field guru-field-search" for="searchGuru">
          <span>Pencarian</span>
          <input id="searchGuru" placeholder="Cari guru, kode, NIP, status, atau mapel..." oninput="handleGuruSearch()">
        </label>
      </div>

      <div class="guru-table-meta">
        <span id="jumlahDataGuru">0 guru</span>
        <label class="page-size-control" for="rowsPerPageGuru">
          <span>Rows per page</span>
          <select id="rowsPerPageGuru" onchange="setGuruRowsPerPage(this.value)">
            <option value="10" selected>10</option>
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="100">100</option>
            <option value="200">200</option>
            <option value="all">Semua</option>
          </select>
        </label>
      </div>

      <div class="table-container guru-table-container">
        <table class="guru-compact-table">
          <thead>
            <tr>
              ${renderSortableHeader("Kode Guru", "kode_guru", guruSortField, guruSortDirection, "setGuruSort")}
              ${renderSortableHeader("Nama dengan Gelar", "nama_lengkap", guruSortField, guruSortDirection, "setGuruSort")}
              ${renderSortableHeader("NIP", "nip", guruSortField, guruSortDirection, "setGuruSort")}
              ${renderSortableHeader("Status", "status", guruSortField, guruSortDirection, "setGuruSort")}
              ${renderSortableHeader("Mata Pelajaran", "mata_pelajaran", guruSortField, guruSortDirection, "setGuruSort")}
              ${renderSortableHeader("JP", "jp", guruSortField, guruSortDirection, "setGuruSort")}
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody id="tbodyGuru"></tbody>
        </table>

        <div id="emptyStateGuru" class="guru-empty-state" style="display:none;">
          Tidak ada data guru
        </div>
      </div>

      <div id="tablePaginationGuru" class="pagination-wrap"></div>
    </div>
  `;
}
