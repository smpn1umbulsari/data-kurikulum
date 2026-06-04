// ================= UI MENGAJAR (UI-6 Phase 5: Matrix Shell) =================
function renderMengajarPage() {
  return `
    <div class="card">
      <header class="asesmen-module-header Mengajar-module-header">
        <div>
          <span class="dashboard-eyebrow">Mengajar</span>
          <h2>Pembagian Mengajar Guru</h2>
        </div>
      </header>

      <div class="control-panel matrix-layout-toolbar">
        <div class="toolbar-left">
          <label class="form-group">
            <span>Tingkat</span>
            <select id="tingkatMengajar" onchange="setMengajarTingkat(this.value)">
              <option value="7" ${mengajarSelectedTingkat === "7" ? "selected" : ""}>7</option>
              <option value="8" ${mengajarSelectedTingkat === "8" ? "selected" : ""}>8</option>
              <option value="9" ${mengajarSelectedTingkat === "9" ? "selected" : ""}>9</option>
            </select>
          </label>
        </div>
        <div class="toolbar-right">
          <button class="btn-secondary" onclick="syncMengajarAsliFromBayangan()">Sinkron dari Kelas Bayangan</button>
          <button class="btn-secondary" onclick="downloadMengajarTemplate()">Download Template</button>
          <label class="btn-upload">
            Import
            <input type="file" accept=".xlsx, .xls" onchange="importMengajarExcel(event)">
          </label>
          <button class="btn-secondary mengajar-recalc-button" onclick="recalculateGuruJPFromCurrentData()">
            Rekalkulasi JP Guru
          </button>
          <button class="btn-primary" onclick="saveAllMengajar()">Simpan Semua</button>
        </div>
      </div>

      <div class="status-strip matrix-layout-summary">
        <span id="jumlahMengajarInfo">0 mapel x 0 kelas</span>
        <span id="pendingMengajarInfo">0 perubahan belum disimpan</span>
        <button class="btn-secondary" onclick="refreshMengajarPage()">Refresh</button>
      </div>

      <div class="matrix-search-bar">
        <select id="mengajarSearchInput" class="matrix-search-input" onchange="handleMengajarSearchInput(this.value)" onkeydown="handleMengajarSearchKeydown(event)">
          ${getMengajarSearchGuruOptions(false, mengajarSearchDraft)}
        </select>
        <button class="btn-secondary" onclick="submitMengajarSearch()">Cari</button>
        <button class="btn-secondary" onclick="clearMengajarSearch()">Reset</button>
        <small id="mengajarSearchInfo" class="matrix-search-info">Pilih nama guru untuk menyorot posisinya di matriks.</small>
      </div>

      <div class="matrix-toolbar-note">
        Dropdown tabel menampilkan kode guru agar matriks lebih ramping. PABP yang tidak sesuai agama siswa di kelas akan disamarkan.
      </div>

      <div id="mengajarMatrixContainer"></div>
    </div>
  `;
}
