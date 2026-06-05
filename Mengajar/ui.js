// ================= UI MENGAJAR (UI-6 Phase 5: Matrix Shell) =================
function renderMengajarPage() {
  return `
    <section class="app-page app-page--module mengajar-page">
      <!-- UI-8: Panel 1 - Header -->
      <header class="app-panel app-panel--header mengajar-header">
        <div class="app-page-title">
          <span class="dashboard-eyebrow">Mengajar</span>
          <h2>Pembagian Mengajar Guru</h2>
          <p>Kelola data tugas mengajar guru mata pelajaran untuk setiap kelas.</p>
        </div>
      </header>

      <!-- UI-8: Panel 3 - Toolbar -->
      <section class="app-panel app-panel--toolbar mengajar-toolbar">
        <!-- toolbar-row--actions -->
        <div class="toolbar-row toolbar-row--actions">
          <button class="btn-primary" onclick="saveAllMengajar()">
            Simpan Semua
          </button>
          <button class="btn-secondary" onclick="syncMengajarAsliFromBayangan()">
            Sinkron dari Kelas Bayangan
          </button>
          <button class="btn-secondary" onclick="downloadMengajarTemplate()">
            Download Template
          </button>
          <label class="btn-secondary rekap-upload-action">
            Import
            <input type="file" accept=".xlsx, .xls" onchange="importMengajarExcel(event)">
          </label>
          <button class="btn-secondary mengajar-recalc-button" onclick="recalculateGuruJPFromCurrentData()">
            Rekalkulasi JP Guru
          </button>
          <button class="btn-secondary" onclick="refreshMengajarPage()">
            Refresh
          </button>
        </div>

        <!-- toolbar-row--filters -->
        <div class="toolbar-row toolbar-row--filters">
          <label class="siswa-field" for="tingkatMengajar">
            <span>Tingkat</span>
            <select id="tingkatMengajar" onchange="setMengajarTingkat(this.value)">
              <option value="7" ${mengajarSelectedTingkat === "7" ? "selected" : ""}>7</option>
              <option value="8" ${mengajarSelectedTingkat === "8" ? "selected" : ""}>8</option>
              <option value="9" ${mengajarSelectedTingkat === "9" ? "selected" : ""}>9</option>
            </select>
          </label>

          <label class="siswa-field" for="mengajarSearchInput">
            <span>Pencarian Guru</span>
            <select id="mengajarSearchInput" class="matrix-search-input" onchange="handleMengajarSearchInput(this.value)" onkeydown="handleMengajarSearchKeydown(event)">
              ${getMengajarSearchGuruOptions(false, mengajarSearchDraft)}
            </select>
          </label>
          
          <button class="btn-secondary" onclick="submitMengajarSearch()">Cari</button>
          <button class="btn-secondary" onclick="clearMengajarSearch()">Reset</button>

          <div class="toolbar-row--info-inline">
            <span id="jumlahMengajarInfo">0 mapel x 0 kelas</span>
            <span id="pendingMengajarInfo" style="margin-left: 12px;">0 perubahan belum disimpan</span>
          </div>
        </div>
      </section>

      <!-- UI-8: Panel 4 - Content -->
      <section class="app-panel app-panel--content mengajar-content">
        <div style="padding: var(--gs-space-4);">
          <small id="mengajarSearchInfo" class="matrix-search-info" style="display: block; margin-bottom: var(--gs-space-2); color: var(--gs-text-muted);">Pilih nama guru untuk menyorot posisinya di matriks.</small>
          <div class="matrix-toolbar-note" style="margin-bottom: var(--gs-space-4); font-size: var(--gs-font-size-xs); color: var(--gs-text-muted);">
            Dropdown tabel menampilkan kode guru agar matriks lebih ramping. PABP yang tidak sesuai agama siswa di kelas akan disamarkan.
          </div>
          <div id="mengajarMatrixContainer"></div>
        </div>
      </section>
    </section>
  `;
}
