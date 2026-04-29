(function initAuditLog(global) {
  if (global.AuditLog) return;

  const COLLECTION = "riwayat_perubahan";
  const MAX_DETAIL_LENGTH = 1600;

  function getDocumentsApi() {
    return global.SupabaseDocuments;
  }

  function getCurrentUser() {
    if (global.DashboardShell?.getCurrentAppUser) return global.DashboardShell.getCurrentAppUser() || {};
    try {
      return JSON.parse(global.localStorage.getItem("currentUser") || "{}") || {};
    } catch {
      return {};
    }
  }

  function normalizeDetail(detail = {}) {
    try {
      const serialized = JSON.stringify(detail || {});
      if (serialized.length <= MAX_DETAIL_LENGTH) return detail || {};
      return {
        ringkasan: String(detail?.ringkasan || detail?.summary || "Detail terlalu panjang"),
        snapshot_ids: Array.isArray(detail?.snapshot_ids) ? detail.snapshot_ids : undefined,
        truncated: true,
        preview: serialized.slice(0, MAX_DETAIL_LENGTH)
      };
    } catch {
      return { ringkasan: String(detail || "") };
    }
  }

  function makeDocId() {
    const random = Math.random().toString(36).slice(2, 8);
    return `${Date.now()}_${random}`;
  }

  async function record(action, detail = {}, options = {}) {
    const documentsApi = getDocumentsApi();
    if (!documentsApi?.collection || !action) return false;
    const user = options.user || getCurrentUser();
    const payload = {
      action: String(action || "").trim(),
      module: String(options.module || detail.module || "aplikasi").trim(),
      title: String(options.title || detail.title || action || "").trim(),
      detail: normalizeDetail(detail),
      username: String(user?.username || user?.id || "").trim(),
      nama: String(user?.nama || user?.name || "").trim(),
      role: String(user?.role || "").trim(),
      created_at: new Date().toISOString()
    };
    try {
      await documentsApi.collection(COLLECTION).doc(makeDocId()).set(payload);
      return true;
    } catch (error) {
      console.warn("Gagal menyimpan riwayat perubahan", error);
      return false;
    }
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatDate(value) {
    if (global.AppUtils?.formatDateTimeId) return global.AppUtils.formatDateTimeId(value);
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("id-ID");
  }

  async function loadRows(limit = 120) {
    const documentsApi = getDocumentsApi();
    if (!documentsApi?.collection) return [];
    const snapshot = await documentsApi.collection(COLLECTION).get();
    return snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")))
      .slice(0, limit);
  }

  function getSnapshotIds(row = {}) {
    const ids = row?.detail?.snapshot_ids || row?.detail?.snapshotIds || [];
    return Array.isArray(ids) ? ids.filter(Boolean) : [];
  }

  async function loadNilaiSnapshots(snapshotIds = []) {
    const documentsApi = getDocumentsApi();
    const rows = [];
    for (const id of snapshotIds) {
      const doc = await documentsApi.collection("nilai_snapshots").doc(id).get();
      if (doc?.exists) rows.push({ id, ...doc.data() });
    }
    return rows;
  }

  async function rollbackNilaiSnapshots(snapshotIds = []) {
    if (!snapshotIds.length) return;
    const snapshots = await loadNilaiSnapshots(snapshotIds);
    const rows = snapshots.flatMap(snapshot => Array.isArray(snapshot.rows) ? snapshot.rows : []);
    if (!rows.length) {
      Swal.fire("Snapshot kosong", "Tidak ada data nilai yang bisa dikembalikan.", "info");
      return;
    }
    const confirm = await Swal.fire({
      title: "Rollback nilai?",
      html: `
        <p><strong>${rows.length}</strong> baris nilai akan dikembalikan ke kondisi sebelum aksi ini.</p>
        <p>Jika baris nilai sebelumnya belum ada, dokumen nilai hasil aksi akan dihapus.</p>
      `,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Rollback",
      cancelButtonText: "Batal"
    });
    if (!confirm.isConfirmed) return;

    let restored = 0;
    let deleted = 0;
    for (let index = 0; index < rows.length; index += 400) {
      const batch = getDocumentsApi().batch();
      rows.slice(index, index + 400).forEach(row => {
        if (!row?.doc_id) return;
        const ref = getDocumentsApi().collection("nilai").doc(row.doc_id);
        if (row.before) {
          restored++;
          batch.set(ref, row.before);
        } else {
          deleted++;
          batch.delete(ref);
        }
      });
      await batch.commit();
    }
    await record("nilai_rollback", {
      ringkasan: `Rollback nilai selesai: ${restored} dikembalikan, ${deleted} dihapus.`,
      snapshot_ids: snapshotIds,
      restored,
      deleted
    }, { module: "Nilai", title: "Rollback Nilai" });
    Swal.fire("Rollback selesai", `${restored} nilai dikembalikan dan ${deleted} nilai baru dihapus.`, "success");
    refreshAdminAuditLog();
  }

  function renderAdminAuditLogPage() {
    setTimeout(() => refreshAdminAuditLog(), 0);
    return `
      <section class="backup-page audit-page">
        <div class="nilai-page-head">
          <div>
            <span class="dashboard-eyebrow">Admin</span>
            <h2>Riwayat Perubahan Data</h2>
            <p>Melacak aksi penting seperti simpan nilai, backup, restore, pembagian ruang, dan kartu pengawas.</p>
          </div>
          <button class="btn-secondary" onclick="refreshAdminAuditLog()">Refresh</button>
        </div>
        <article class="backup-panel backup-wide">
          <div id="auditLogStatus" class="backup-status">Memuat riwayat...</div>
          <div id="auditLogTable" class="table-container mapel-table-container"></div>
        </article>
      </section>
    `;
  }

  async function refreshAdminAuditLog() {
    const status = document.getElementById("auditLogStatus");
    const table = document.getElementById("auditLogTable");
    if (!table) return;
    try {
      if (status) status.innerText = "Membaca riwayat perubahan...";
      const rows = await loadRows();
      if (!rows.length) {
        table.innerHTML = `<div class="backup-status">Belum ada riwayat perubahan.</div>`;
        if (status) status.innerText = "0 riwayat ditemukan.";
        return;
      }
      table.innerHTML = `
        <table class="mapel-table audit-table">
          <thead>
            <tr>
              <th>Waktu</th>
              <th>Modul</th>
              <th>Aksi</th>
              <th>Pengguna</th>
              <th>Detail</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(row => {
              const snapshotIds = getSnapshotIds(row);
              return `
              <tr>
                <td>${escapeHtml(formatDate(row.created_at))}</td>
                <td>${escapeHtml(row.module || "-")}</td>
                <td><strong>${escapeHtml(row.title || row.action || "-")}</strong></td>
                <td>${escapeHtml(row.nama || row.username || "-")}<br><small>${escapeHtml(row.role || "")}</small></td>
                <td>
                  ${escapeHtml(row.detail?.ringkasan || row.detail?.summary || JSON.stringify(row.detail || {}))}
                  ${snapshotIds.length ? `<div class="audit-actions"><button class="btn-secondary btn-mini" onclick='AuditLog.rollbackNilaiSnapshots(${JSON.stringify(snapshotIds)})'>Rollback Nilai</button></div>` : ""}
                </td>
              </tr>
            `; }).join("")}
          </tbody>
        </table>
      `;
      if (status) status.innerText = `${rows.length} riwayat terakhir ditampilkan.`;
    } catch (error) {
      console.error(error);
      if (status) status.innerText = "Gagal membaca riwayat.";
      table.innerHTML = `<div class="backup-status">Gagal membaca riwayat perubahan.</div>`;
    }
  }

  global.AuditLog = { record, loadRows, renderAdminAuditLogPage, refreshAdminAuditLog, rollbackNilaiSnapshots };
  global.recordAuditLog = record;
  global.renderAdminAuditLogPage = renderAdminAuditLogPage;
  global.refreshAdminAuditLog = refreshAdminAuditLog;
})(window);
