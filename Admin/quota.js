function getAdminQuotaClient() {
  if (window.supabaseClient?.from) return window.supabaseClient;
  const config = window.supabaseConfig || {};
  if (!window.supabase?.createClient || !config.url || !config.anonKey) return null;
  return window.supabase.createClient(config.url, config.anonKey);
}

function escapeAdminQuotaHtml(value) {
  if (window.AppUtils?.escapeHtml) return window.AppUtils.escapeHtml(value);
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatAdminQuotaNumber(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "-";
  return new Intl.NumberFormat("id-ID").format(numeric);
}

function formatAdminQuotaTime(value) {
  if (window.AppUtils?.formatDateTimeId) {
    return window.AppUtils.formatDateTimeId(value, {}, "-");
  }
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function setAdminQuotaText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function formatAdminQuotaBytes(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return "-";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = numeric;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  const fractionDigits = size >= 100 ? 0 : size >= 10 ? 1 : 2;
  return `${new Intl.NumberFormat("id-ID", { maximumFractionDigits: fractionDigits }).format(size)} ${units[unitIndex]}`;
}

function parseSupabaseProjectRef(url = "") {
  const match = String(url || "").match(/^https:\/\/([a-z0-9-]+)\.supabase\.co/i);
  return match ? match[1] : "";
}

function getAdminQuotaFunctionUrl() {
  const customUrl = String(window.supabaseManagementConfig?.usageEndpoint || window.supabaseQuotaEndpoint || "").trim();
  if (customUrl) return customUrl;
  const baseUrl = String(window.supabaseConfig?.url || "").trim().replace(/\/+$/, "");
  if (!baseUrl) return "";
  return `${baseUrl}/functions/v1/supabase-quota`;
}

async function fetchOfficialAdminQuota(projectRef) {
  const functionUrl = getAdminQuotaFunctionUrl();
  if (!functionUrl) return { available: false, reason: "missing-url" };

  const requestUrl = `${functionUrl}?project_ref=${encodeURIComponent(String(projectRef || "").trim())}`;
  const headers = {};
  const anonKey = String(window.supabaseConfig?.anonKey || "").trim();
  if (anonKey) headers.apikey = anonKey;

  try {
    const response = await fetch(requestUrl, { headers });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        available: false,
        reason: "http-error",
        status: response.status,
        error: payload?.error || `HTTP ${response.status}`
      };
    }
    return {
      available: Boolean(payload?.available),
      summary: payload?.summary || {},
      fetchedAt: payload?.fetched_at || "",
      sources: payload?.sources || {}
    };
  } catch (error) {
    return {
      available: false,
      reason: "network-error",
      error: error?.message || "Function quota belum bisa diakses."
    };
  }
}

async function getAdminQuotaSummary() {
  const config = window.supabaseConfig || {};
  const client = getAdminQuotaClient();
  const tableName = String(config.documentsTable || "app_documents").trim();
  if (!client?.from) throw new Error("Client Supabase belum siap.");

  const [totalDocsResult, semesterDocsResult, onlineCountResult, presenceSnapshotResult] = await Promise.all([
    client.from(tableName).select("id", { count: "exact", head: true }),
    client.from(tableName).select("id", { count: "exact", head: true }).like("collection_path", "semester_data/%"),
    typeof window.DashboardShell?.getOnlineUserCount === "function"
      ? window.DashboardShell.getOnlineUserCount().catch(() => null)
      : Promise.resolve(null),
    typeof window.DashboardShell?.getPresenceSnapshot === "function"
      ? window.DashboardShell.getPresenceSnapshot().catch(() => [])
      : Promise.resolve([])
  ]);

  if (totalDocsResult.error) throw totalDocsResult.error;
  if (semesterDocsResult.error) throw semesterDocsResult.error;

  const presenceRows = Array.isArray(presenceSnapshotResult) ? presenceSnapshotResult : [];
  const onlineUsers = Number.isFinite(Number(onlineCountResult)) ? Number(onlineCountResult) : null;
  const lastPresence = presenceRows
    .map(item => item?.last_seen_at || item?.updated_at || item?.created_at || "")
    .filter(Boolean)
    .sort()
    .pop() || "";
  const projectRef = parseSupabaseProjectRef(config.url);
  const officialQuota = await fetchOfficialAdminQuota(projectRef);

  return {
    projectUrl: String(config.url || "").trim(),
    projectRef,
    documentsTable: tableName,
    totalDocuments: Number(totalDocsResult.count || 0),
    semesterDocuments: Number(semesterDocsResult.count || 0),
    presenceDocuments: presenceRows.length,
    onlineUsers,
    lastPresence,
    officialQuota
  };
}

function renderAdminQuotaPage() {
  const config = window.supabaseConfig || {};
  const projectUrl = String(config.url || "").trim();
  const projectRef = parseSupabaseProjectRef(projectUrl);
  const documentsTable = String(config.documentsTable || "app_documents").trim();

  return `
    <section class="quota-page">
      <div class="nilai-page-head">
        <div>
          <span class="dashboard-eyebrow">Admin</span>
          <h2>Quota Supabase</h2>
          <p>Halaman ini menampilkan diagnostik pemakaian data yang aman dibaca dari aplikasi saat ini, sambil menyiapkan jalur untuk integrasi quota resmi Supabase.</p>
        </div>
        <div class="quota-actions">
          <button class="btn-primary" type="button" onclick="refreshAdminQuotaDashboard()">Refresh</button>
        </div>
      </div>

      <section class="backup-panel backup-wide quota-status-panel">
        <div class="quota-status-head">
          <div>
            <span class="dashboard-eyebrow">Status Integrasi</span>
            <h3 id="adminQuotaOfficialStatus">Memeriksa koneksi quota resmi...</h3>
          </div>
          <span class="admin-koordinator-badge" id="adminQuotaRefreshBadge">Menunggu refresh</span>
        </div>
        <p id="adminQuotaOfficialCopy" class="quota-muted">
          Frontend ini memakai <code>anonKey</code>, jadi angka quota resmi billing dan usage Supabase tidak aman jika dipanggil langsung dari browser.
        </p>
      </section>

      <div class="backup-grid quota-grid">
        <article class="backup-panel quota-metric-card">
          <span class="dashboard-eyebrow">Project</span>
          <strong class="quota-metric-value" id="adminQuotaProjectRef">${escapeAdminQuotaHtml(projectRef || "-")}</strong>
          <p class="quota-metric-label">Project ref Supabase</p>
        </article>
        <article class="backup-panel quota-metric-card">
          <span class="dashboard-eyebrow">Dokumen</span>
          <strong class="quota-metric-value" id="adminQuotaTotalDocuments">-</strong>
          <p class="quota-metric-label">Total baris di tabel <code>${escapeAdminQuotaHtml(documentsTable)}</code></p>
        </article>
        <article class="backup-panel quota-metric-card">
          <span class="dashboard-eyebrow">Semester</span>
          <strong class="quota-metric-value" id="adminQuotaSemesterDocuments">-</strong>
          <p class="quota-metric-label">Dokumen cabang <code>semester_data/*</code></p>
        </article>
        <article class="backup-panel quota-metric-card">
          <span class="dashboard-eyebrow">Presence</span>
          <strong class="quota-metric-value" id="adminQuotaOnlineUsers">-</strong>
          <p class="quota-metric-label">Pengguna aktif saat ini</p>
        </article>
        <article class="backup-panel quota-metric-card">
          <span class="dashboard-eyebrow">Disk</span>
          <strong class="quota-metric-value" id="adminQuotaDiskUsed">-</strong>
          <p class="quota-metric-label">Pemakaian disk resmi dari Management API</p>
        </article>
        <article class="backup-panel quota-metric-card">
          <span class="dashboard-eyebrow">API</span>
          <strong class="quota-metric-value" id="adminQuotaApiRequests">-</strong>
          <p class="quota-metric-label">Request API resmi dari Management API</p>
        </article>
      </div>

      <div class="backup-grid quota-grid">
        <section class="backup-panel backup-wide">
          <span class="dashboard-eyebrow">Detail Project</span>
          <div class="dashboard-mini-list quota-detail-list">
            <span><strong>Project URL</strong><b id="adminQuotaProjectUrl">${escapeAdminQuotaHtml(projectUrl || "-")}</b></span>
            <span><strong>Tabel dokumen</strong><b id="adminQuotaDocumentsTable">${escapeAdminQuotaHtml(documentsTable)}</b></span>
            <span><strong>Dokumen presence</strong><b id="adminQuotaPresenceDocuments">-</b></span>
            <span><strong>Presence terakhir</strong><b id="adminQuotaLastPresence">-</b></span>
            <span><strong>Nama project resmi</strong><b id="adminQuotaProjectName">-</b></span>
            <span><strong>Status project</strong><b id="adminQuotaProjectStatus">-</b></span>
            <span><strong>Region</strong><b id="adminQuotaProjectRegion">-</b></span>
            <span><strong>Add-on aktif</strong><b id="adminQuotaActiveAddon">-</b></span>
            <span><strong>Disk allocated</strong><b id="adminQuotaDiskSize">-</b></span>
            <span><strong>Disk usage</strong><b id="adminQuotaDiskPercent">-</b></span>
            <span><strong>REST requests</strong><b id="adminQuotaRestRequests">-</b></span>
            <span><strong>Storage requests</strong><b id="adminQuotaStorageRequests">-</b></span>
            <span><strong>Auth requests</strong><b id="adminQuotaAuthRequests">-</b></span>
            <span><strong>Realtime requests</strong><b id="adminQuotaRealtimeRequests">-</b></span>
            <span><strong>Analytics timestamp</strong><b id="adminQuotaAnalyticsTime">-</b></span>
          </div>
        </section>
        <section class="backup-panel backup-wide">
          <span class="dashboard-eyebrow">Catatan Penting</span>
          <ul class="quota-note-list">
            <li>Angka di halaman ini adalah indikator pemakaian data aplikasi, bukan laporan billing resmi Supabase.</li>
            <li>Quota resmi Supabase dibaca lewat Edge Function supabase-quota, jadi PAT management tetap berada di server-side Supabase.</li>
            <li>Karena aplikasi ini belum memakai Supabase Auth admin, endpoint quota ini masih sebaiknya dianggap data internal dan dilindungi lebih lanjut saat auth sudah dimigrasikan.</li>
          </ul>
        </section>
      </div>
    </section>
  `;
}

async function refreshAdminQuotaDashboard() {
  setAdminQuotaText("adminQuotaRefreshBadge", "Memuat...");
  setAdminQuotaText("adminQuotaOfficialStatus", "Mengambil ringkasan project...");
  try {
    const summary = await getAdminQuotaSummary();
    const official = summary.officialQuota || {};
    const officialSummary = official.summary || {};
    const diskUsedLabel = officialSummary.disk_used_bytes
      ? formatAdminQuotaBytes(officialSummary.disk_used_bytes)
      : (officialSummary.disk_used_gb ? `${formatAdminQuotaNumber(officialSummary.disk_used_gb)} GB` : "-");
    const diskSizeLabel = officialSummary.disk_size_gb ? `${formatAdminQuotaNumber(officialSummary.disk_size_gb)} GB` : "-";
    const diskPercentLabel = officialSummary.disk_usage_percent || officialSummary.disk_usage_percent === 0
      ? `${formatAdminQuotaNumber(officialSummary.disk_usage_percent)}%`
      : "-";

    setAdminQuotaText(
      "adminQuotaOfficialStatus",
      official.available ? "Quota resmi Supabase aktif" : "Quota resmi belum tersedia"
    );
    setAdminQuotaText(
      "adminQuotaOfficialCopy",
      official.available
        ? "Data official berhasil dibaca dari Edge Function server-side. Token management tidak dikirim ke browser."
        : `Frontend tetap menampilkan diagnostik lokal. ${official.error || "Deploy function supabase-quota dan set secret management token untuk menampilkan angka resmi."}`
    );
    setAdminQuotaText("adminQuotaProjectRef", summary.projectRef || "-");
    setAdminQuotaText("adminQuotaProjectUrl", summary.projectUrl || "-");
    setAdminQuotaText("adminQuotaDocumentsTable", summary.documentsTable || "-");
    setAdminQuotaText("adminQuotaTotalDocuments", formatAdminQuotaNumber(summary.totalDocuments));
    setAdminQuotaText("adminQuotaSemesterDocuments", formatAdminQuotaNumber(summary.semesterDocuments));
    setAdminQuotaText("adminQuotaPresenceDocuments", formatAdminQuotaNumber(summary.presenceDocuments));
    setAdminQuotaText("adminQuotaOnlineUsers", summary.onlineUsers === null ? "-" : formatAdminQuotaNumber(summary.onlineUsers));
    setAdminQuotaText("adminQuotaLastPresence", formatAdminQuotaTime(summary.lastPresence));
    setAdminQuotaText("adminQuotaProjectName", officialSummary.project_name || "-");
    setAdminQuotaText("adminQuotaProjectStatus", officialSummary.project_status || "-");
    setAdminQuotaText("adminQuotaProjectRegion", officialSummary.region || "-");
    setAdminQuotaText("adminQuotaActiveAddon", officialSummary.active_addon || "-");
    setAdminQuotaText("adminQuotaDiskUsed", diskUsedLabel);
    setAdminQuotaText("adminQuotaDiskSize", diskSizeLabel);
    setAdminQuotaText("adminQuotaDiskPercent", diskPercentLabel);
    setAdminQuotaText("adminQuotaApiRequests", officialSummary.api_requests_count === null || officialSummary.api_requests_count === undefined ? "-" : formatAdminQuotaNumber(officialSummary.api_requests_count));
    setAdminQuotaText("adminQuotaRestRequests", officialSummary.total_rest_requests === null || officialSummary.total_rest_requests === undefined ? "-" : formatAdminQuotaNumber(officialSummary.total_rest_requests));
    setAdminQuotaText("adminQuotaStorageRequests", officialSummary.total_storage_requests === null || officialSummary.total_storage_requests === undefined ? "-" : formatAdminQuotaNumber(officialSummary.total_storage_requests));
    setAdminQuotaText("adminQuotaAuthRequests", officialSummary.total_auth_requests === null || officialSummary.total_auth_requests === undefined ? "-" : formatAdminQuotaNumber(officialSummary.total_auth_requests));
    setAdminQuotaText("adminQuotaRealtimeRequests", officialSummary.total_realtime_requests === null || officialSummary.total_realtime_requests === undefined ? "-" : formatAdminQuotaNumber(officialSummary.total_realtime_requests));
    setAdminQuotaText("adminQuotaAnalyticsTime", formatAdminQuotaTime(officialSummary.analytics_timestamp));
    setAdminQuotaText("adminQuotaRefreshBadge", `Refresh ${formatAdminQuotaTime(official.fetchedAt || new Date().toISOString())}`);
  } catch (error) {
    console.error(error);
    setAdminQuotaText("adminQuotaOfficialStatus", "Gagal membaca ringkasan project");
    setAdminQuotaText(
      "adminQuotaOfficialCopy",
      error?.message ? `Detail: ${error.message}` : "Terjadi kendala saat membaca data Supabase."
    );
    setAdminQuotaText("adminQuotaTotalDocuments", "-");
    setAdminQuotaText("adminQuotaSemesterDocuments", "-");
    setAdminQuotaText("adminQuotaPresenceDocuments", "-");
    setAdminQuotaText("adminQuotaOnlineUsers", "-");
    setAdminQuotaText("adminQuotaLastPresence", "-");
    setAdminQuotaText("adminQuotaProjectName", "-");
    setAdminQuotaText("adminQuotaProjectStatus", "-");
    setAdminQuotaText("adminQuotaProjectRegion", "-");
    setAdminQuotaText("adminQuotaActiveAddon", "-");
    setAdminQuotaText("adminQuotaDiskUsed", "-");
    setAdminQuotaText("adminQuotaDiskSize", "-");
    setAdminQuotaText("adminQuotaDiskPercent", "-");
    setAdminQuotaText("adminQuotaApiRequests", "-");
    setAdminQuotaText("adminQuotaRestRequests", "-");
    setAdminQuotaText("adminQuotaStorageRequests", "-");
    setAdminQuotaText("adminQuotaAuthRequests", "-");
    setAdminQuotaText("adminQuotaRealtimeRequests", "-");
    setAdminQuotaText("adminQuotaAnalyticsTime", "-");
    setAdminQuotaText("adminQuotaRefreshBadge", "Refresh gagal");
  }
}

function loadRealtimeAdminQuota() {
  return refreshAdminQuotaDashboard();
}
