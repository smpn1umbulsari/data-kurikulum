(function initDataHealth(global) {
  if (global.DataHealth) return;

  const COLLECTIONS = ["guru", "siswa", "kelas", "mapel_bayangan", "mengajar_bayangan", "nilai", "settings"];

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

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  async function readCollection(name) {
    const snapshot = await getDocumentsApi().collection(name).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async function writeRows(collectionName, rows = []) {
    let count = 0;
    for (let index = 0; index < rows.length; index += 450) {
      const batch = getDocumentsApi().batch();
      rows.slice(index, index + 450).forEach(row => {
        if (!row?.id) return;
        count++;
        batch.set(getDocumentsApi().collection(collectionName).doc(row.id), row.data || {}, { merge: true });
      });
      await batch.commit();
    }
    return count;
  }

  async function deleteRows(collectionName, rows = []) {
    let count = 0;
    for (let index = 0; index < rows.length; index += 450) {
      const batch = getDocumentsApi().batch();
      rows.slice(index, index + 450).forEach(row => {
        if (!row?.id) return;
        count++;
        batch.delete(getDocumentsApi().collection(collectionName).doc(row.id));
      });
      await batch.commit();
    }
    return count;
  }

  function getClassParts(value = "") {
    if (global.NilaiEngine?.getKelasParts) return global.NilaiEngine.getKelasParts(value);
    const text = String(value || "").trim().toUpperCase().replace(/\s+/g, "");
    const match = text.match(/^(\d+)([A-Z])$/);
    return match ? { tingkat: match[1], rombel: match[2], kelas: `${match[1]} ${match[2]}` } : { tingkat: "", rombel: "", kelas: "" };
  }

  function getEffectiveStudentClass(siswa = {}) {
    if (global.NilaiEngine?.getKelasBayanganParts) return global.NilaiEngine.getKelasBayanganParts(siswa);
    const asli = getClassParts(siswa.kelas);
    const bayangan = getClassParts(siswa.kelas_bayangan);
    if (bayangan.tingkat === asli.tingkat && /^[A-H]$/.test(bayangan.rombel)) return bayangan;
    if (/^[A-H]$/.test(asli.rombel)) return asli;
    return { tingkat: asli.tingkat, rombel: "", kelas: "" };
  }

  function makeIssue(severity, category, title, detail = "", ref = "") {
    return { severity, category, title, detail, ref };
  }

  function buildDataHealthIssues(data = {}) {
    const issues = [];
    const guru = data.guru || [];
    const siswa = data.siswa || [];
    const kelas = data.kelas || [];
    const mapel = data.mapel_bayangan || [];
    const mengajar = data.mengajar_bayangan || [];
    const nilai = data.nilai || [];
    const guruCodes = new Set(guru.map(item => String(item.kode_guru || "").trim().toUpperCase()).filter(Boolean));
    const mapelCodes = new Set(mapel.map(item => String(item.kode_mapel || item.id || "").trim().toUpperCase()).filter(Boolean));
    const classKeys = new Set(kelas.map(item => getClassParts(item.kelas || `${item.tingkat || ""}${item.rombel || ""}`).kelas).filter(Boolean));
    const siswaByNipd = new Map(siswa.map(item => [String(item.nipd || "").trim(), item]).filter(([nipd]) => Boolean(nipd)));

    guru.forEach(item => {
      if (!String(item.kode_guru || "").trim()) {
        issues.push(makeIssue("tinggi", "Guru", "Guru belum punya kode guru", item.nama || item.username || "-", item.id));
      }
      if (!String(item.nama || "").trim()) {
        issues.push(makeIssue("sedang", "Guru", "Guru belum punya nama", item.kode_guru || item.username || "-", item.id));
      }
    });

    siswa.forEach(item => {
      const asli = getClassParts(item.kelas);
      const efektif = getEffectiveStudentClass(item);
      if (!String(item.kelas || "").trim() || !asli.kelas) {
        issues.push(makeIssue("tinggi", "Siswa", "Siswa tanpa kelas asal valid", item.nama || item.nipd || "-", item.id));
      }
      if (!String(item.nipd || "").trim()) {
        issues.push(makeIssue("tinggi", "Siswa", "Siswa belum punya NIPD", item.nama || "-", item.id));
      }
      if (!efektif.kelas) {
        issues.push(makeIssue("tinggi", "Kelas Bayangan", "Siswa kelas bayangan tidak sinkron", `${item.nama || item.nipd || "-"} | kelas: ${item.kelas || "-"} | bayangan: ${item.kelas_bayangan || "-"}`, item.id));
      } else if (classKeys.size && !classKeys.has(efektif.kelas)) {
        issues.push(makeIssue("sedang", "Kelas Bayangan", "Kelas efektif siswa belum ada di Data Kelas", `${item.nama || item.nipd || "-"} masuk ${efektif.kelas}`, item.id));
      }
    });

    mapel.forEach(item => {
      if (!String(item.kode_mapel || item.id || "").trim()) {
        issues.push(makeIssue("tinggi", "Mapel", "Mapel tanpa kode", item.nama_mapel || item.nama || "-", item.id));
      }
      if (!String(item.nama_mapel || item.nama || "").trim()) {
        issues.push(makeIssue("sedang", "Mapel", "Mapel tanpa nama", item.kode_mapel || item.id || "-", item.id));
      }
    });

    const assignmentKeys = new Map();
    mengajar.forEach(item => {
      const key = [
        String(item.tingkat || "").trim(),
        String(item.rombel || "").trim().toUpperCase(),
        String(item.mapel_kode || "").trim().toUpperCase(),
        String(item.guru_kode || "").trim().toUpperCase()
      ].join("|");
      assignmentKeys.set(key, (assignmentKeys.get(key) || 0) + 1);
      if (!guruCodes.has(String(item.guru_kode || "").trim().toUpperCase())) {
        issues.push(makeIssue("tinggi", "Pembagian Mengajar", "Assignment memakai kode guru yang tidak ada", `${item.tingkat || "-"} ${item.rombel || "-"} | ${item.mapel_kode || "-"} | ${item.guru_kode || "-"}`, item.id));
      }
      if (!mapelCodes.has(String(item.mapel_kode || "").trim().toUpperCase())) {
        issues.push(makeIssue("tinggi", "Pembagian Mengajar", "Assignment memakai kode mapel yang tidak ada", `${item.tingkat || "-"} ${item.rombel || "-"} | ${item.mapel_kode || "-"}`, item.id));
      }
    });
    assignmentKeys.forEach((count, key) => {
      if (count > 1) issues.push(makeIssue("sedang", "Pembagian Mengajar", "Assignment ganda", `${key.replace(/\|/g, " / ")} muncul ${count} kali`, key));
    });

    nilai.forEach(item => {
      const nipd = String(item.nipd || "").trim();
      const kelasNilai = getClassParts(item.kelas || `${item.tingkat || ""}${item.rombel || ""}`);
      if (nipd && !siswaByNipd.has(nipd)) {
        issues.push(makeIssue("sedang", "Nilai", "Nilai tersimpan untuk NIPD yang tidak ada di data siswa aktif", `${nipd} | ${item.mapel_kode || "-"}`, item.id));
      }
      if (!item.term_id && typeof global.getActiveTermId === "function" && global.getActiveTermId() !== "legacy") {
        issues.push(makeIssue("rendah", "Nilai", "Nilai memakai format lama tanpa term_id", `${nipd || "-"} | ${item.mapel_kode || "-"} | ${kelasNilai.kelas || "-"}`, item.id));
      }
      if (!classKeys.has(kelasNilai.kelas) && kelasNilai.kelas) {
        issues.push(makeIssue("rendah", "Nilai", "Nilai tersimpan di kelas yang tidak ada di Data Kelas aktif", `${nipd || "-"} | ${kelasNilai.kelas} | ${item.mapel_kode || "-"}`, item.id));
      }
    });

    return issues.sort((a, b) => {
      const order = { tinggi: 0, sedang: 1, rendah: 2 };
      return (order[a.severity] ?? 9) - (order[b.severity] ?? 9) || a.category.localeCompare(b.category);
    });
  }

  async function runDataHealthAudit() {
    const data = {};
    for (const name of COLLECTIONS) {
      data[name] = await readCollection(name).catch(error => {
        console.warn(`Gagal membaca ${name}`, error);
        return [];
      });
    }
    return { data, issues: buildDataHealthIssues(data) };
  }

  function makeGuruCodeFromItem(item = {}, usedCodes = new Set()) {
    const source = String(item.username || item.nama || item.id || "").trim().toUpperCase();
    const words = source.replace(/[^A-Z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
    const base = (words.length >= 2
      ? words.map(word => word[0]).join("")
      : (words[0] || "GR").slice(0, 4)
    ).slice(0, 4) || "GR";
    let candidate = base;
    let index = 1;
    while (usedCodes.has(candidate)) {
      index += 1;
      candidate = `${base}${index}`;
    }
    usedCodes.add(candidate);
    return candidate;
  }

  async function fixGuruCodes() {
    const { data } = await runDataHealthAudit();
    const usedCodes = new Set((data.guru || []).map(item => String(item.kode_guru || "").trim().toUpperCase()).filter(Boolean));
    const rows = (data.guru || [])
      .filter(item => !String(item.kode_guru || "").trim())
      .map(item => ({
        id: item.id,
        data: {
          kode_guru: makeGuruCodeFromItem(item, usedCodes),
          updated_at: new Date().toISOString()
        }
      }));
    if (!rows.length) {
      Swal.fire("Tidak ada data", "Tidak ada guru tanpa kode yang bisa diperbaiki otomatis.", "info");
      return;
    }
    const confirm = await Swal.fire({
      title: "Isi kode guru otomatis?",
      html: `<p>${rows.length} guru akan diberi kode dari username/nama. Kode dibuat unik dan bisa diedit lagi di Data Guru.</p>`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Isi Kode",
      cancelButtonText: "Batal"
    });
    if (!confirm.isConfirmed) return;
    const count = await writeRows("guru", rows);
    await global.AuditLog?.record?.("data_fix_guru_codes", {
      ringkasan: `${count} kode guru diisi otomatis.`,
      count
    }, { module: "Validasi Data", title: "Isi Kode Guru Otomatis", user: getCurrentUser() });
    Swal.fire("Selesai", `${count} kode guru berhasil diisi.`, "success");
    refreshDataHealthAudit();
  }

  async function removeDuplicateAssignments() {
    const { data } = await runDataHealthAudit();
    const groups = new Map();
    (data.mengajar_bayangan || []).forEach(item => {
      const key = [
        String(item.tingkat || "").trim(),
        String(item.rombel || "").trim().toUpperCase(),
        String(item.mapel_kode || "").trim().toUpperCase(),
        String(item.guru_kode || "").trim().toUpperCase()
      ].join("|");
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item);
    });
    const duplicates = [];
    groups.forEach(items => {
      if (items.length <= 1) return;
      const sorted = [...items].sort((a, b) => String(b.updated_at || b.id || "").localeCompare(String(a.updated_at || a.id || "")));
      duplicates.push(...sorted.slice(1));
    });
    if (!duplicates.length) {
      Swal.fire("Tidak ada duplikat", "Tidak ada assignment ganda yang perlu dihapus.", "info");
      return;
    }
    const confirm = await Swal.fire({
      title: "Hapus assignment ganda?",
      html: `<p>${duplicates.length} assignment duplikat akan dihapus. Satu data terbaru di tiap kelompok akan dipertahankan.</p>`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Hapus Duplikat",
      cancelButtonText: "Batal"
    });
    if (!confirm.isConfirmed) return;
    const count = await deleteRows("mengajar_bayangan", duplicates);
    await global.AuditLog?.record?.("data_fix_duplicate_assignments", {
      ringkasan: `${count} assignment ganda dihapus.`,
      count
    }, { module: "Validasi Data", title: "Hapus Assignment Ganda", user: getCurrentUser() });
    Swal.fire("Selesai", `${count} assignment duplikat dihapus.`, "success");
    refreshDataHealthAudit();
  }

  async function syncKelasBayangan() {
    const { data } = await runDataHealthAudit();
    const rows = (data.siswa || [])
      .map(item => {
        const asli = getClassParts(item.kelas);
        const bayangan = getClassParts(item.kelas_bayangan);
        if (/^[A-H]$/.test(asli.rombel) && (!item.kelas_bayangan || !bayangan.kelas || bayangan.tingkat !== asli.tingkat)) {
          return {
            id: item.id,
            data: {
              kelas_bayangan: asli.kelas,
              updated_at: new Date().toISOString()
            }
          };
        }
        return null;
      })
      .filter(Boolean);
    if (!rows.length) {
      Swal.fire("Tidak ada data", "Tidak ada kelas bayangan yang aman untuk disinkronkan otomatis.", "info");
      return;
    }
    const confirm = await Swal.fire({
      title: "Sinkronkan kelas bayangan?",
      html: `<p>${rows.length} siswa dengan kelas asal reguler akan disamakan kelas bayangannya dengan kelas asal. Siswa kelas gabungan seperti I/J yang butuh keputusan manual tidak diubah.</p>`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sinkronkan",
      cancelButtonText: "Batal"
    });
    if (!confirm.isConfirmed) return;
    const count = await writeRows("siswa", rows);
    await global.AuditLog?.record?.("data_fix_shadow_classes", {
      ringkasan: `${count} kelas bayangan siswa disinkronkan.`,
      count
    }, { module: "Validasi Data", title: "Sinkron Kelas Bayangan", user: getCurrentUser() });
    Swal.fire("Selesai", `${count} kelas bayangan siswa disinkronkan.`, "success");
    refreshDataHealthAudit();
  }

  function getActiveTermPayload() {
    const term = typeof global.getActiveSemesterContext === "function" ? global.getActiveSemesterContext() : { id: "legacy", semester: "", tahun: "" };
    return {
      term_id: term.id || "legacy",
      semester: term.semester || "",
      tahun_pelajaran: term.tahun || ""
    };
  }

  function makeNilaiDocId(assignment = {}, nipd = "") {
    const baseId = [
      assignment.tingkat,
      String(assignment.rombel || "").toUpperCase(),
      String(assignment.mapel_kode || "").toUpperCase(),
      String(assignment.guru_kode || "").toUpperCase(),
      String(nipd || "")
    ].join("_");
    const termId = getActiveTermPayload().term_id || "legacy";
    return termId === "legacy" ? baseId : `${termId}_${baseId}`;
  }

  function resolveNilaiMigrationRows(data = {}) {
    const activeTerm = getActiveTermPayload();
    const assignments = data.mengajar_bayangan || [];
    return (data.nilai || [])
      .filter(item => !item.term_id && activeTerm.term_id !== "legacy")
      .map(item => {
        const kelas = getClassParts(item.kelas || `${item.tingkat || ""}${item.rombel || ""}`);
        const mapelKode = String(item.mapel_kode || "").trim().toUpperCase();
        const guruKode = String(item.guru_kode || "").trim().toUpperCase()
          || String(assignments.find(assignment =>
            String(assignment.tingkat || "") === String(kelas.tingkat || item.tingkat || "") &&
            String(assignment.rombel || "").trim().toUpperCase() === String(kelas.rombel || item.rombel || "").trim().toUpperCase() &&
            String(assignment.mapel_kode || "").trim().toUpperCase() === mapelKode
          )?.guru_kode || "").trim().toUpperCase();
        if (!kelas.tingkat || !kelas.rombel || !mapelKode || !guruKode || !item.nipd) return null;
        const assignment = {
          tingkat: kelas.tingkat,
          rombel: kelas.rombel,
          mapel_kode: mapelKode,
          guru_kode: guruKode
        };
        const targetId = makeNilaiDocId(assignment, item.nipd);
        const { id, ...nilaiData } = item;
        return {
          sourceId: item.id,
          targetId,
          data: {
            ...nilaiData,
            ...activeTerm,
            tingkat: assignment.tingkat,
            rombel: assignment.rombel,
            mapel_kode: assignment.mapel_kode,
            guru_kode: assignment.guru_kode,
            migrated_from: item.id,
            migrated_at: new Date().toISOString()
          }
        };
      })
      .filter(Boolean);
  }

  async function previewMigrateLegacyNilai() {
    const { data } = await runDataHealthAudit();
    const rows = resolveNilaiMigrationRows(data);
    if (!rows.length) {
      Swal.fire("Tidak ada nilai legacy", "Tidak ada nilai lama yang siap dimigrasikan ke semester aktif.", "info");
      return;
    }
    const sample = rows.slice(0, 8).map(row => `<li><code>${escapeHtml(row.sourceId)}</code> &rarr; <code>${escapeHtml(row.targetId)}</code></li>`).join("");
    const confirm = await Swal.fire({
      title: "Migrasi nilai lama?",
      html: `
        <p><strong>${rows.length}</strong> dokumen nilai lama akan disalin ke format semester aktif.</p>
        <p>Dokumen lama tidak dihapus. Jika target sudah ada, datanya akan ditimpa/merge.</p>
        <ul class="data-health-preview-list">${sample}</ul>
      `,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Migrasikan",
      cancelButtonText: "Batal"
    });
    if (!confirm.isConfirmed) return;
    const count = await writeRows("nilai", rows.map(row => ({ id: row.targetId, data: row.data })));
    await global.AuditLog?.record?.("data_migrate_legacy_scores", {
      ringkasan: `${count} nilai legacy disalin ke format semester aktif.`,
      count
    }, { module: "Validasi Data", title: "Migrasi Nilai Lama", user: getCurrentUser() });
    Swal.fire("Migrasi selesai", `${count} nilai lama berhasil disalin.`, "success");
    refreshDataHealthAudit();
  }

  function renderSeverityBadge(severity) {
    return `<span class="data-health-badge data-health-${escapeHtml(severity)}">${escapeHtml(severity)}</span>`;
  }

  function renderDataHealthPage() {
    setTimeout(() => refreshDataHealthAudit(), 0);
    return `
      <section class="backup-page data-health-page">
        <div class="nilai-page-head">
          <div>
            <span class="dashboard-eyebrow">Audit Data</span>
            <h2>Validasi Data</h2>
            <p>Mendeteksi data bermasalah sebelum input nilai, rekap, export rapor, backup, atau restore.</p>
          </div>
          <button class="btn-primary" onclick="refreshDataHealthAudit()">Jalankan Validasi</button>
        </div>
        <div id="dataHealthSummary" class="backup-grid"></div>
        <article class="backup-panel backup-wide data-health-fix-panel">
          <h3>Panel Perbaikan Otomatis</h3>
          <p>Gunakan aksi aman berikut setelah membaca hasil validasi. Aksi migrasi selalu menyalin data lama tanpa menghapus sumbernya.</p>
          <div class="backup-actions">
            <button class="btn-secondary" onclick="DataHealth.fixGuruCodes()">Isi Kode Guru dari Username</button>
            <button class="btn-secondary" onclick="DataHealth.removeDuplicateAssignments()">Hapus Assignment Ganda</button>
            <button class="btn-secondary" onclick="DataHealth.syncKelasBayangan()">Sinkronkan Kelas Bayangan</button>
            <button class="btn-primary" onclick="DataHealth.previewMigrateLegacyNilai()">Preview Migrasi Nilai Lama</button>
          </div>
        </article>
        <article class="backup-panel backup-wide">
          <div id="dataHealthStatus" class="backup-status">Menunggu validasi...</div>
          <div id="dataHealthTable" class="table-container mapel-table-container"></div>
        </article>
      </section>
    `;
  }

  async function refreshDataHealthAudit() {
    const status = document.getElementById("dataHealthStatus");
    const summary = document.getElementById("dataHealthSummary");
    const table = document.getElementById("dataHealthTable");
    if (!table) return;
    try {
      if (status) status.innerText = "Memeriksa data...";
      const { issues } = await runDataHealthAudit();
      const counts = issues.reduce((acc, item) => {
        acc[item.severity] = (acc[item.severity] || 0) + 1;
        return acc;
      }, {});
      if (summary) {
        summary.innerHTML = ["tinggi", "sedang", "rendah"].map(key => `
          <article class="backup-panel data-health-summary-card">
            <span>${key.toUpperCase()}</span>
            <strong>${counts[key] || 0}</strong>
          </article>
        `).join("");
      }
      if (!issues.length) {
        table.innerHTML = `<div class="backup-status">Tidak ada masalah utama yang terdeteksi.</div>`;
        if (status) status.innerText = "Validasi selesai. Data terlihat sehat.";
        return;
      }
      table.innerHTML = `
        <table class="mapel-table data-health-table">
          <thead>
            <tr>
              <th>Level</th>
              <th>Kategori</th>
              <th>Masalah</th>
              <th>Detail</th>
              <th>Referensi</th>
            </tr>
          </thead>
          <tbody>
            ${issues.map(issue => `
              <tr>
                <td>${renderSeverityBadge(issue.severity)}</td>
                <td>${escapeHtml(issue.category)}</td>
                <td><strong>${escapeHtml(issue.title)}</strong></td>
                <td>${escapeHtml(issue.detail || "-")}</td>
                <td><code>${escapeHtml(issue.ref || "-")}</code></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      `;
      if (status) status.innerText = `Validasi selesai. ${issues.length} masalah ditemukan.`;
    } catch (error) {
      console.error(error);
      if (status) status.innerText = "Validasi gagal.";
      table.innerHTML = `<div class="backup-status">Validasi gagal dijalankan.</div>`;
    }
  }

  global.DataHealth = {
    runDataHealthAudit,
    renderDataHealthPage,
    refreshDataHealthAudit,
    buildDataHealthIssues,
    fixGuruCodes,
    removeDuplicateAssignments,
    syncKelasBayangan,
    previewMigrateLegacyNilai
  };
  global.renderDataHealthPage = renderDataHealthPage;
  global.refreshDataHealthAudit = refreshDataHealthAudit;
})(window);
