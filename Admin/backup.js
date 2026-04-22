const BACKUP_COLLECTIONS = [
  "guru",
  "siswa",
  "siswa_lulus",
  "kelas",
  "mapel",
  "mapel_bayangan",
  "mengajar",
  "mengajar_bayangan",
  "tugas_tambahan",
  "guru_tugas_tambahan",
  "nilai",
  "kehadiran_rekap_siswa",
  "rapor_catatan_wali",
  "nilai_snapshots",
  "kepangawasan_kartu_guru",
  "informasi_urusan",
  "riwayat_perubahan",
  "user_presence",
  "users",
  "settings"
];

const LEGACY_CLEAN_COLLECTIONS = [
  "kehadiran_siswa"
];

const CLEAN_COLLECTIONS = [...BACKUP_COLLECTIONS, ...LEGACY_CLEAN_COLLECTIONS];

const BACKUP_LOCAL_STORAGE_KEYS = [
  "kepangawasanAsesmenState",
  "appSemester",
  "appKoordinatorLevels",
  "guruNilaiInputMode",
  "nilaiUnifiedInputMode",
  "kelasBayanganSourceByLevel",
  "maintenanceModeState"
];

const BACKUP_LOCAL_STORAGE_PREFIXES = [
  "asesmenAdministrasi"
];

let selectedBackupRestoreFile = null;
let selectedBackupRestorePayload = null;

function renderAdminBackupPage() {
  setTimeout(() => {
    if (typeof window.initializeMaintenanceToggle === "function") {
      window.initializeMaintenanceToggle();
    } else if (typeof window.applyMaintenanceUiState === "function" && window.MaintenanceMode?.load) {
      window.MaintenanceMode.load({ force: true })
        .then(state => window.applyMaintenanceUiState(state))
        .catch(() => {});
    }
  }, 0);

  return `
    <section class="backup-page">
      <div class="nilai-page-head">
        <div>
          <span class="dashboard-eyebrow">Migrasi Data</span>
          <h2>Backup dan Restore</h2>
          <p>Unduh cadangan data sebelum memindahkan aplikasi atau memperbaiki data semester.</p>
        </div>
      </div>

      <div class="backup-grid">
        <article class="backup-panel">
          <h3>Backup</h3>
          <p>File backup berisi data utama, user, nilai, rekap kehadiran, asesmen, kepangawasan, riwayat perubahan, pengaturan, dan data per semester.</p>
          <div class="backup-actions">
            <button class="btn-primary" onclick="downloadFullBackup()">Download Backup JSON</button>
          </div>
          <div id="backupExportStatus" class="backup-status">Siap membuat backup.</div>
        </article>

        <article class="backup-panel backup-panel-danger">
          <h3>Restore</h3>
          <p>Restore akan menulis ulang dokumen yang ada di file backup. Gunakan hanya untuk migrasi atau pemulihan.</p>
          <label class="backup-file-picker">
            <span>Pilih file backup JSON</span>
            <input type="file" accept="application/json,.json" onchange="handleBackupRestoreFile(event)">
          </label>
          <div id="backupRestoreFileName" class="backup-status">Belum ada file dipilih.</div>
          <div id="backupRestorePreview" class="backup-restore-preview" hidden></div>
          <div class="backup-actions">
            <button class="btn-danger" onclick="restoreFullBackup()">Restore Backup</button>
          </div>
          <div id="backupRestoreStatus" class="backup-status">Restore membutuhkan password admin.</div>
        </article>
      </div>

      <section class="backup-panel backup-wide backup-maintenance-panel sidebar-maintenance-panel" id="backupMaintenancePanel" hidden>
        <div class="sidebar-maintenance-head">
          <div>
            <span class="sidebar-maintenance-label">Maintenance</span>
            <strong id="maintenanceStatusText">Memuat status...</strong>
          </div>
          <label class="maintenance-switch" aria-label="Toggle maintenance mode">
            <input type="checkbox" id="maintenanceModeToggle" onchange="handleMaintenanceToggleChange(this)">
            <span class="maintenance-switch-track">
              <span class="maintenance-switch-thumb"></span>
            </span>
          </label>
        </div>
        <p class="sidebar-maintenance-copy">Saat aktif, halaman login tetap bisa dibuka. Admin dan superadmin tetap bisa masuk untuk mematikan mode ini, sedangkan pengguna lain akan diarahkan ke halaman maintenance setelah login.</p>
        <a class="sidebar-maintenance-link" href="maintenance.html" target="_blank" rel="noopener">Lihat halaman maintenance</a>
      </section>

      <section class="backup-panel backup-wide">
        <h3>Isi Backup</h3>
        <div class="backup-chip-list">
          ${BACKUP_COLLECTIONS.map(name => `<span>${escapeBackupHtml(name)}</span>`).join("")}
          <span>data semester/{semester}/siswa</span>
          <span>data semester/{semester}/kelas</span>
          <span>local storage penting</span>
        </div>
      </section>

      <section class="backup-panel backup-panel-danger backup-wide">
        <h3>Reset Semua Data</h3>
        <p>
          Menghapus semua data yang dikenal aplikasi, termasuk data semester, nilai, siswa, guru, kelas, mapel,
          pembagian mengajar, user, asesmen, kepangawasan, rekap kehadiran, dan pengaturan. Jalankan backup dulu sebelum memakai tombol ini.
        </p>
        <div class="backup-chip-list">
          <span>Dihapus: semua collection aplikasi</span>
          <span>Dihapus: mengajar</span>
          <span>Dihapus: mengajar_bayangan</span>
          <span>Dihapus: kepangawasan_kartu_guru</span>
          <span>Dihapus: kehadiran_siswa legacy</span>
          <span>Dihapus: data semester/*/siswa</span>
          <span>Dihapus: data semester/*/kelas</span>
          <span>Dibersihkan: cache login lokal</span>
        </div>
        <div class="backup-actions">
          <button class="btn-danger" onclick="resetAllApplicationData()">Reset Semua Data</button>
        </div>
        <div id="backupCleanStatus" class="backup-status">Menunggu aksi admin.</div>
      </section>
    </section>
  `;
}

function escapeBackupHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function setBackupStatus(id, text) {
  const el = document.getElementById(id);
  if (el) el.innerText = text;
}

function serializeBackupValue(value) {
  if (!value || typeof value !== "object") return value;
  if (typeof value.toDate === "function") {
    return { __type: "timestamp", value: value.toDate().toISOString() };
  }
  if (Array.isArray(value)) return value.map(serializeBackupValue);
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, serializeBackupValue(item)]));
}

function restoreBackupValue(value) {
  if (!value || typeof value !== "object") return value;
  if (value.__type === "timestamp" && value.value) {
    return window.SupabaseDocuments.Timestamp.fromDate(new Date(value.value));
  }
  if (Array.isArray(value)) return value.map(restoreBackupValue);
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, restoreBackupValue(item)]));
}

function readBackupLocalStorage() {
  const result = {};
  try {
    BACKUP_LOCAL_STORAGE_KEYS.forEach(key => {
      const value = localStorage.getItem(key);
      if (value !== null) result[key] = value;
    });
    BACKUP_LOCAL_STORAGE_PREFIXES.forEach(prefix => {
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index);
        if (!key || !key.startsWith(prefix)) continue;
        result[key] = localStorage.getItem(key);
      }
    });
  } catch (error) {
    console.warn("Gagal membaca local storage untuk backup", error);
  }
  return result;
}

function restoreBackupLocalStorage(rows = {}) {
  if (!rows || typeof rows !== "object") return 0;
  let count = 0;
  try {
    Object.entries(rows).forEach(([key, value]) => {
      if (!key || value === undefined || value === null) return;
      localStorage.setItem(key, String(value));
      count++;
    });
  } catch (error) {
    console.warn("Gagal restore local storage dari backup", error);
  }
  return count;
}

function isSupportedBackupVersion(version) {
  return version === 1 || version === 2 || version === undefined || version === null;
}

function validateBackupPayload(payload) {
  const errors = [];
  const warnings = [];
  if (!payload || typeof payload !== "object") {
    errors.push("File backup tidak bisa dibaca sebagai objek JSON.");
    return { valid: false, errors, warnings };
  }
  if (payload.app !== "DATA SISWA") {
    errors.push("File ini bukan backup aplikasi Data Siswa.");
  }
  if (!payload.collections || typeof payload.collections !== "object") {
    errors.push("Backup tidak memiliki bagian collections.");
  }
  if (!isSupportedBackupVersion(payload.version)) {
    errors.push(`Versi backup ${payload.version} belum didukung oleh aplikasi ini.`);
  }
  if ((payload.version || 1) < 2) {
    warnings.push("Backup versi lama terdeteksi. Local storage dan beberapa koleksi baru mungkin belum ada.");
  }
  const unknownCollections = Object.keys(payload.collections || {})
    .filter(name => !BACKUP_COLLECTIONS.includes(name));
  if (unknownCollections.length) {
    warnings.push(`Ada collection di luar daftar aktif: ${unknownCollections.join(", ")}.`);
  }
  return { valid: !errors.length, errors, warnings };
}

function getBackupRestoreSelection() {
  const selectedCollections = Array.from(document.querySelectorAll(".backup-restore-collection:checked"))
    .map(input => input.value)
    .filter(Boolean);
  return {
    collections: selectedCollections,
    semesterData: document.getElementById("backupRestoreSemesterData")?.checked === true,
    localStorage: document.getElementById("backupRestoreLocalStorage")?.checked === true,
    autoBackup: document.getElementById("backupRestoreAutoBackup")?.checked !== false
  };
}

async function createBackupPayload(options = {}) {
  const collections = {};
  const collectionNames = options.collections || BACKUP_COLLECTIONS;
  for (const name of collectionNames) {
    if (options.statusId) setBackupStatus(options.statusId, `Membaca ${name}...`);
    collections[name] = await readBackupCollection(name);
  }
  const semesterIds = getBackupSemesterIds(collections.settings || []);
  const semesterData = options.includeSemesterData === false ? {} : await readBackupSemesterData(semesterIds);
  return {
    app: "DATA SISWA",
    version: 2,
    exported_at: new Date().toISOString(),
    collections_order: [...collectionNames],
    collections,
    semester_data: semesterData,
    local_storage: options.includeLocalStorage === false ? {} : readBackupLocalStorage()
  };
}

function downloadBackupPayload(payload, prefix = "backup-data-siswa") {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  a.href = url;
  a.download = `${prefix}-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function calculateRestoreImpact(payload, selection) {
  const impacts = [];
  for (const collectionName of selection.collections) {
    const incomingRows = payload.collections?.[collectionName] || [];
    const currentRows = await readBackupCollection(collectionName).catch(() => []);
    const currentIds = new Set(currentRows.map(row => row.id));
    const overwrite = incomingRows.filter(row => currentIds.has(row.id)).length;
    const create = incomingRows.length - overwrite;
    impacts.push({ label: collectionName, incoming: incomingRows.length, overwrite, create });
  }
  if (selection.semesterData) {
    let incoming = 0;
    Object.values(payload.semester_data || {}).forEach(termData => {
      incoming += (termData.siswa || []).length + (termData.kelas || []).length;
    });
    impacts.push({ label: "semester_data", incoming, overwrite: "cek per semester", create: "-" });
  }
  if (selection.localStorage) {
    impacts.push({ label: "local_storage", incoming: Object.keys(payload.local_storage || {}).length, overwrite: "lokal", create: "-" });
  }
  return impacts;
}

function renderRestoreImpactTable(impact = []) {
  return `
    <table class="backup-impact-table">
      <thead><tr><th>Bagian</th><th>Masuk</th><th>Menimpa</th><th>Baru</th></tr></thead>
      <tbody>
        ${impact.map(item => `
          <tr>
            <td>${escapeBackupHtml(item.label)}</td>
            <td>${escapeBackupHtml(item.incoming)}</td>
            <td>${escapeBackupHtml(item.overwrite)}</td>
            <td>${escapeBackupHtml(item.create)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function renderBackupRestorePreview(payload) {
  const preview = document.getElementById("backupRestorePreview");
  if (!preview) return;
  if (!payload) {
    preview.hidden = true;
    preview.innerHTML = "";
    return;
  }
  const validation = validateBackupPayload(payload);
  const collections = Object.entries(payload.collections || {});
  const semesterEntries = Object.entries(payload.semester_data || {});
  const localCount = Object.keys(payload.local_storage || {}).length;
  const collectionRows = collections.map(([name, rows]) => `
    <label class="backup-restore-option">
      <input class="backup-restore-collection" type="checkbox" value="${escapeBackupHtml(name)}" ${BACKUP_COLLECTIONS.includes(name) ? "checked" : ""}>
      <span>${escapeBackupHtml(name)}</span>
      <small>${Array.isArray(rows) ? rows.length : 0} dokumen</small>
    </label>
  `).join("");
  preview.hidden = false;
  preview.innerHTML = `
    <div class="backup-preview-head">
      <strong>Preview Backup</strong>
      <span>Versi ${escapeBackupHtml(payload.version ?? "legacy")} | ${escapeBackupHtml(payload.exported_at || "-")}</span>
    </div>
    ${validation.errors.length ? `<div class="backup-preview-alert backup-preview-error">${validation.errors.map(escapeBackupHtml).join("<br>")}</div>` : ""}
    ${validation.warnings.length ? `<div class="backup-preview-alert backup-preview-warning">${validation.warnings.map(escapeBackupHtml).join("<br>")}</div>` : ""}
    <div class="backup-restore-options">
      ${collectionRows || `<div class="backup-status">Tidak ada collection di file backup.</div>`}
      <label class="backup-restore-option backup-restore-option-wide">
        <input id="backupRestoreSemesterData" type="checkbox" ${semesterEntries.length ? "checked" : ""}>
        <span>Data semester</span>
        <small>${semesterEntries.length} semester</small>
      </label>
      <label class="backup-restore-option backup-restore-option-wide">
        <input id="backupRestoreLocalStorage" type="checkbox" ${localCount ? "checked" : ""}>
        <span>Local storage penting</span>
        <small>${localCount} item</small>
      </label>
      <label class="backup-restore-option backup-restore-option-wide backup-restore-safety">
        <input id="backupRestoreAutoBackup" type="checkbox" checked>
        <span>Buat backup otomatis sebelum restore</span>
        <small>Disarankan</small>
      </label>
    </div>
  `;
}

async function readBackupCollection(collectionName) {
  const snapshot = await getBackupDocumentsApi().collection(collectionName).get();
  return snapshot.docs.map(doc => ({
    id: doc.id,
    data: serializeBackupValue(doc.data())
  }));
}

function getBackupSemesterIds(settingsRows) {
  const semesterDoc = settingsRows.find(item => item.id === "semester")?.data || {};
  const ids = new Set();
  if (semesterDoc.active_id) ids.add(semesterDoc.active_id);
  if (semesterDoc.live_id) ids.add(semesterDoc.live_id);
  (semesterDoc.list || []).forEach(item => {
    if (item?.id) ids.add(item.id);
  });
  return [...ids].filter(Boolean);
}

async function readBackupSemesterData(semesterIds) {
  const result = {};
  for (const termId of semesterIds) {
    result[termId] = {
      siswa: await readBackupSemesterCollection(termId, "siswa"),
      kelas: await readBackupSemesterCollection(termId, "kelas")
    };
  }
  return result;
}

async function readBackupSemesterCollection(termId, collectionName) {
  const snapshot = await getBackupDocumentsApi().collection("semester_data").doc(termId).collection(collectionName).get();
  return snapshot.docs.map(doc => ({
    id: doc.id,
    data: serializeBackupValue(doc.data())
  }));
}

async function downloadFullBackup() {
  try {
    setBackupStatus("backupExportStatus", "Membaca data...");
    window.AppLoading?.set("backup-export", true, { title: "Membuat backup...", message: "Mohon tunggu sebentar." });
    const payload = await createBackupPayload({ statusId: "backupExportStatus" });
    const semesterIds = Object.keys(payload.semester_data || {});
    downloadBackupPayload(payload);
    setBackupStatus("backupExportStatus", `Backup selesai. ${BACKUP_COLLECTIONS.length} collection dibaca.`);
    window.AuditLog?.record?.("backup_download", {
      ringkasan: `Backup JSON dibuat: ${BACKUP_COLLECTIONS.length} collection, ${semesterIds.length} semester.`,
      collections: BACKUP_COLLECTIONS,
      semester_count: semesterIds.length
    }, { module: "Backup Restore", title: "Download Backup" });
    Swal.fire("Backup selesai", "File JSON sudah diunduh.", "success");
  } catch (error) {
    console.error(error);
    setBackupStatus("backupExportStatus", "Backup gagal.");
    Swal.fire("Backup gagal", error.message || "", "error");
  } finally {
    window.AppLoading?.set("backup-export", false);
  }
}

async function handleBackupRestoreFile(event) {
  selectedBackupRestoreFile = event.target.files?.[0] || null;
  selectedBackupRestorePayload = null;
  setBackupStatus(
    "backupRestoreFileName",
    selectedBackupRestoreFile ? `${selectedBackupRestoreFile.name} (${Math.ceil(selectedBackupRestoreFile.size / 1024)} KB)` : "Belum ada file dipilih."
  );
  renderBackupRestorePreview(null);
  if (!selectedBackupRestoreFile) return;
  try {
    selectedBackupRestorePayload = await readSelectedBackupFile();
    renderBackupRestorePreview(selectedBackupRestorePayload);
    const validation = validateBackupPayload(selectedBackupRestorePayload);
    setBackupStatus(
      "backupRestoreStatus",
      validation.valid
        ? "Preview berhasil dibaca. Pilih bagian yang akan direstore."
        : "File backup tidak valid. Restore tidak bisa dilanjutkan."
    );
  } catch (error) {
    selectedBackupRestorePayload = null;
    setBackupStatus("backupRestoreStatus", error.message || "File backup gagal dibaca.");
  }
}

function readSelectedBackupFile() {
  return new Promise((resolve, reject) => {
    if (!selectedBackupRestoreFile) {
      reject(new Error("Pilih file backup JSON terlebih dahulu."));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(JSON.parse(reader.result));
      } catch (error) {
        reject(new Error("File backup tidak valid."));
      }
    };
    reader.onerror = () => reject(new Error("File backup gagal dibaca."));
    reader.readAsText(selectedBackupRestoreFile);
  });
}

async function restoreFullBackup() {
  try {
    const payload = selectedBackupRestorePayload || await readSelectedBackupFile();
    const validation = validateBackupPayload(payload);
    if (!validation.valid) {
      Swal.fire("File tidak cocok", validation.errors.join("\n"), "error");
      return;
    }
    const selection = getBackupRestoreSelection();
    if (!selection.collections.length && !selection.semesterData && !selection.localStorage) {
      Swal.fire("Tidak ada pilihan", "Pilih minimal satu bagian data untuk direstore.", "warning");
      return;
    }

    const impact = await calculateRestoreImpact(payload, selection);
    const confirm = await Swal.fire({
      title: "Restore backup?",
      html: `
        <p>Masukkan password admin. Bagian yang dipilih akan ditulis ulang ke Supabase.</p>
        <p><strong>${selection.collections.length}</strong> collection, data semester: <strong>${selection.semesterData ? "ya" : "tidak"}</strong>, local storage: <strong>${selection.localStorage ? "ya" : "tidak"}</strong>.</p>
        ${renderRestoreImpactTable(impact)}
        <p>Backup otomatis sebelum restore: <strong>${selection.autoBackup ? "aktif" : "nonaktif"}</strong>.</p>
      `,
      input: "password",
      inputPlaceholder: "Password admin",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Restore",
      cancelButtonText: "Batal",
      inputValidator: value => !value ? "Password wajib diisi" : undefined
    });
    if (!confirm.isConfirmed) return;

    const validPassword = typeof verifyAdminSemesterPassword === "function"
      ? await verifyAdminSemesterPassword(confirm.value)
      : confirm.value === "admin123" || confirm.value === "guruspenturi";
    if (!validPassword) {
      Swal.fire("Password salah", "Restore dibatalkan.", "error");
      return;
    }

    window.AppLoading?.set("backup-restore", true, { title: "Restore berjalan...", message: "Mohon tunggu sebentar." });
    try {
      if (selection.autoBackup) {
        setBackupStatus("backupRestoreStatus", "Membuat backup otomatis sebelum restore...");
        const safetyPayload = await createBackupPayload({ statusId: "backupRestoreStatus" });
        downloadBackupPayload(safetyPayload, "backup-sebelum-restore");
      }
      let count = 0;
      for (const collectionName of selection.collections) {
        const rows = payload.collections?.[collectionName] || [];
        setBackupStatus("backupRestoreStatus", `Restore ${collectionName}...`);
        count += await writeBackupCollection(collectionName, rows);
      }
      if (selection.semesterData) {
        for (const [termId, termData] of Object.entries(payload.semester_data || {})) {
          count += await writeBackupSemesterCollection(termId, "siswa", termData.siswa || []);
          count += await writeBackupSemesterCollection(termId, "kelas", termData.kelas || []);
        }
      }
      const localCount = selection.localStorage ? restoreBackupLocalStorage(payload.local_storage || {}) : 0;
      setBackupStatus("backupRestoreStatus", `Restore selesai. ${count} dokumen ditulis. ${localCount} item lokal dipulihkan.`);
      window.AuditLog?.record?.("backup_restore", {
        ringkasan: `Restore selesai: ${count} dokumen, ${localCount} item lokal.`,
        collections: selection.collections,
        restore_semester_data: selection.semesterData,
        restore_local_storage: selection.localStorage,
        backup_version: payload.version || "legacy"
      }, { module: "Backup Restore", title: "Restore Backup" });
      await Swal.fire("Restore selesai", `${count} dokumen ditulis dan ${localCount} item lokal dipulihkan. Silakan logout dan login ulang.`, "success");
    } finally {
      window.AppLoading?.set("backup-restore", false);
    }
  } catch (error) {
    console.error(error);
    setBackupStatus("backupRestoreStatus", "Restore gagal.");
    Swal.fire("Restore gagal", error.message || "", "error");
  }
}

async function writeBackupCollection(collectionName, rows = []) {
  let count = 0;
  for (let index = 0; index < rows.length; index += 450) {
    const documentsApi = getBackupDocumentsApi();
    const batch = documentsApi.batch();
    rows.slice(index, index + 450).forEach(row => {
      if (!row?.id) return;
      count++;
      batch.set(documentsApi.collection(collectionName).doc(row.id), restoreBackupValue(row.data || {}));
    });
    await batch.commit();
  }
  return count;
}

async function writeBackupSemesterCollection(termId, collectionName, rows = []) {
  let count = 0;
  for (let index = 0; index < rows.length; index += 450) {
    const documentsApi = getBackupDocumentsApi();
    const batch = documentsApi.batch();
    rows.slice(index, index + 450).forEach(row => {
      if (!row?.id) return;
      count++;
      batch.set(
        documentsApi.collection("semester_data").doc(termId).collection(collectionName).doc(row.id),
        restoreBackupValue(row.data || {})
      );
    });
    await batch.commit();
  }
  return count;
}

async function resetAllApplicationData() {
  const settingsRows = await readBackupCollection("settings").catch(() => []);
  const semesterIds = getBackupSemesterIds(settingsRows);
  const confirmText = "HAPUS DATA";

  const confirm = await Swal.fire({
    title: "Reset semua data?",
    html: `
      <p>Aksi ini akan menghapus semua data aplikasi, termasuk siswa, guru, kelas, mapel, nilai, rekap kehadiran, asesmen, kepangawasan, pembagian mengajar, user, settings, dan data per semester.</p>
      <p>Setelah selesai, aplikasi kembali kosong dan login memakai fallback admin.</p>
      <p>Ketik <b>${confirmText}</b> untuk melanjutkan.</p>
    `,
    input: "text",
    inputPlaceholder: confirmText,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Lanjut",
    cancelButtonText: "Batal",
    inputValidator: value => value !== confirmText ? `Ketik ${confirmText} dengan benar` : undefined
  });
  if (!confirm.isConfirmed) return;

  const password = await Swal.fire({
    title: "Password admin",
    input: "password",
    inputPlaceholder: "Password admin",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Hapus",
    cancelButtonText: "Batal",
    inputValidator: value => !value ? "Password wajib diisi" : undefined
  });
  if (!password.isConfirmed) return;

  const validPassword = typeof verifyAdminSemesterPassword === "function"
    ? await verifyAdminSemesterPassword(password.value)
    : password.value === "admin123" || password.value === "guruspenturi";
  if (!validPassword) {
    Swal.fire("Password salah", "Pembersihan dibatalkan.", "error");
    return;
  }

  try {
    window.AppLoading?.set("backup-clean", true, { title: "Membersihkan data...", message: "Mohon tunggu sebentar." });
    try {
      let deleted = 0;
      for (const collectionName of CLEAN_COLLECTIONS) {
        setBackupStatus("backupCleanStatus", `Menghapus ${collectionName}...`);
        deleted += await deleteBackupCollection(getBackupDocumentsApi().collection(collectionName));
      }
      for (const termId of semesterIds) {
        setBackupStatus("backupCleanStatus", `Menghapus data semester ${termId}...`);
        deleted += await deleteBackupCollection(getBackupDocumentsApi().collection("semester_data").doc(termId).collection("siswa"));
        deleted += await deleteBackupCollection(getBackupDocumentsApi().collection("semester_data").doc(termId).collection("kelas"));
        await getBackupDocumentsApi().collection("semester_data").doc(termId).delete();
      }
      localStorage.clear();
      setBackupStatus("backupCleanStatus", `Selesai. ${deleted} dokumen dihapus. Cache lokal dibersihkan.`);
      window.AuditLog?.record?.("reset_all_data", {
        ringkasan: `Reset semua data selesai. ${deleted} dokumen dihapus.`,
        deleted
      }, { module: "Backup Restore", title: "Reset Semua Data" });
      await Swal.fire("Selesai", `${deleted} dokumen dihapus. Aplikasi siap diisi dari awal.`, "success");
      window.location.href = "login.html";
    } finally {
      window.AppLoading?.set("backup-clean", false);
    }
  } catch (error) {
    console.error(error);
    setBackupStatus("backupCleanStatus", "Pembersihan gagal.");
    Swal.fire("Pembersihan gagal", error.message || "", "error");
  }
}

async function deleteBackupCollection(collectionRef) {
  let count = 0;
  while (true) {
    const snapshot = await collectionRef.limit(450).get();
    if (snapshot.empty) break;
    const batch = getBackupDocumentsApi().batch();
    snapshot.docs.forEach(doc => {
      count++;
      batch.delete(doc.ref);
    });
    await batch.commit();
  }
  return count;
}
function getBackupDocumentsApi() {
  return window.SupabaseDocuments;
}
