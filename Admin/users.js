let semuaDataAdminGuru = [];
let semuaDataAdminUser = [];
let semuaDataAdminSiswa = [];
let semuaDataAdminKoordinator = {};
let semuaDataAdminPresence = [];
let unsubscribeAdminGuru = null;
let unsubscribeAdminUser = null;
let unsubscribeAdminSiswa = null;
let unsubscribeAdminKoordinator = null;
let unsubscribeAdminPresence = null;
let currentEditAdminUser = null;
let adminKoordinatorDraft = null;
let isInteractingAdminHierarchyUi = false;
let pendingAdminUsersRender = false;
let isSyncingGuruDerivedUsernames = false;
let hasSyncedGuruDerivedUsernames = false;
const PRESENCE_ONLINE_THRESHOLD_MS = 180000;

const DEFAULT_USER_PASSWORD = "guruspenturi";
const USER_ROLES = ["admin", "guru", "koordinator", "urusan", "siswa"];
const KOORDINATOR_LEVELS = [
  { key: "kelas_7", label: "Kelas 7" },
  { key: "kelas_8", label: "Kelas 8" },
  { key: "kelas_9", label: "Kelas 9" }
];

function getAdminUsersDocumentsApi() {
  return window.SupabaseDocuments;
}

function canUserAccessAiPrompt(user = {}) {
  const role = String(user?.role || "").trim().toLowerCase();
  if (["admin", "superadmin"].includes(role)) return true;
  return user?.can_generate_prompt !== false;
}

function isCurrentUserSuperadmin() {
  try {
    const currentUser = JSON.parse(localStorage.getItem("appUser") || "{}");
    return String(currentUser?.role || "").trim().toLowerCase() === "superadmin";
  } catch {
    return false;
  }
}

function syncStoredAppUserPatch(userId, patch = {}) {
  try {
    const currentUser = JSON.parse(localStorage.getItem("appUser") || "{}");
    const currentId = String(currentUser?.id || currentUser?.username || "").trim();
    const targetId = String(userId || "").trim();
    if (!currentId || !targetId || currentId !== targetId) return;
    localStorage.setItem("appUser", JSON.stringify({ ...currentUser, ...patch }));
    if (typeof window.applyRoleAccess === "function") {
      window.setTimeout(() => window.applyRoleAccess(), 0);
    }
  } catch {
    // noop
  }
}

function ensureAdminUserLoadingOverlay() {
  let overlay = document.getElementById("adminUserLoadingOverlay");
  if (overlay) return overlay;

  overlay = document.createElement("div");
  overlay.id = "adminUserLoadingOverlay";
  overlay.className = "admin-user-loading-overlay";
  overlay.innerHTML = `
    <div class="admin-user-loading-card">
      <div class="admin-user-loading-spinner" aria-hidden="true"></div>
      <strong>Memproses data user</strong>
      <span>Mohon tunggu sebentar. Password sedang diperbarui.</span>
    </div>
  `;
  document.body.appendChild(overlay);
  return overlay;
}

function setAdminUserLoading(isActive, title = "Memproses data user", message = "Mohon tunggu sebentar. Password sedang diperbarui.") {
  if (window.AppLoading?.set) {
    window.AppLoading.set("admin-user", isActive, { title, message });
    return;
  }
  const overlay = ensureAdminUserLoadingOverlay();
  const titleEl = overlay.querySelector("strong");
  const messageEl = overlay.querySelector("span");
  if (titleEl) titleEl.textContent = title;
  if (messageEl) messageEl.textContent = message;
  overlay.style.display = isActive ? "flex" : "none";
  document.body.classList.toggle("admin-user-loading-active", Boolean(isActive));
}

function escapeAdminHtml(value) {
  if (window.AppUtils?.escapeHtml) return window.AppUtils.escapeHtml(value);
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function makeUsernameFromName(value = "") {
  if (window.AdminUsersIdentity?.makeUsernameFromName) {
    return window.AdminUsersIdentity.makeUsernameFromName(value);
  }
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9._-]/g, "");
}

function getAdminGuruName(guru) {
  if (window.AdminUsersIdentity?.getGuruName) {
    return window.AdminUsersIdentity.getGuruName(guru);
  }
  if (typeof formatNamaGuru === "function") return formatNamaGuru(guru);
  return [guru?.gelar_depan, guru?.nama, guru?.gelar_belakang].filter(Boolean).join(" ") || guru?.nama || "";
}

function stripAdminGuruTitles(value = "") {
  if (window.AdminUsersIdentity?.stripGuruTitles) {
    return window.AdminUsersIdentity.stripGuruTitles(value);
  }
  if (typeof stripGuruTitlesFromName === "function") return stripGuruTitlesFromName(value);
  return String(value || "")
    .replace(/\b(Drs?|Dra|Prof|Hj?|Ir)\.?(?=\s|,|$)/gi, " ")
    .replace(/\b(S|M|D)\.?\s?(Pd|Si|Ag|Kom|H|E|Ak|Ikom|Hum|Kes|Kep|Farm|T|Sc|A)\.?(?=\s|,|$)/gi, " ")
    .replace(/,\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getAdminGuruUsernameName(guru = {}) {
  if (window.AdminUsersIdentity?.getGuruUsernameName) {
    return window.AdminUsersIdentity.getGuruUsernameName(guru);
  }
  const nama = stripAdminGuruTitles(String(guru?.nama || "").trim());
  if (nama) return nama;
  return stripAdminGuruTitles(guru?.nama_lengkap || getAdminGuruName(guru));
}

function makeGuruUsername(guru) {
  if (window.AdminUsersIdentity?.makeGuruUsername) {
    return window.AdminUsersIdentity.makeGuruUsername(guru);
  }
  const nip = String(guru?.nip || "").trim();
  return nip || makeUsernameFromName(getAdminGuruUsernameName(guru));
}

function makeUserDocId(username) {
  if (window.AdminUsersIdentity?.makeUserDocId) {
    return window.AdminUsersIdentity.makeUserDocId(username);
  }
  return makeUsernameFromName(username);
}

function getUserByUsername(username) {
  const target = makeUserDocId(username);
  return semuaDataAdminUser.find(item => makeUserDocId(item.username || item.id) === target) || null;
}

function getUserByGuru(guru = {}) {
  if (window.AdminUsersIdentity?.getUserByGuru) {
    return window.AdminUsersIdentity.getUserByGuru(guru, semuaDataAdminUser);
  }
  const kodeGuru = String(guru?.kode_guru || "").trim();
  if (kodeGuru) {
    const byKode = semuaDataAdminUser.find(item =>
      String(item.kode_guru || "").trim() === kodeGuru
    );
    if (byKode) return byKode;
  }

  const aliases = [
    makeGuruUsername(guru),
    makeUsernameFromName(getAdminGuruName(guru)),
    makeUsernameFromName(getAdminGuruUsernameName(guru))
  ]
    .map(value => makeUserDocId(value))
    .filter(Boolean);

  return semuaDataAdminUser.find(item => aliases.includes(makeUserDocId(item.username || item.id))) || null;
}

function getAllUsersForGuru(guru = {}, fallbackUser = null) {
  if (window.AdminUsersIdentity?.getAllUsersForGuru) {
    return window.AdminUsersIdentity.getAllUsersForGuru(guru, semuaDataAdminUser, fallbackUser);
  }
  const kodeGuru = String(guru?.kode_guru || fallbackUser?.kode_guru || "").trim();
  const aliasIds = new Set();
  const primaryUsername = makeGuruUsername(guru);
  if (primaryUsername) aliasIds.add(makeUserDocId(primaryUsername));

  const titledUsername = makeUsernameFromName(getAdminGuruName(guru));
  if (titledUsername) aliasIds.add(makeUserDocId(titledUsername));

  const fallbackId = makeUserDocId(fallbackUser?.username || fallbackUser?.id || "");
  if (fallbackId) aliasIds.add(fallbackId);

  return semuaDataAdminUser.filter(item => {
    const itemId = String(item.id || makeUserDocId(item.username)).trim();
    if (kodeGuru && String(item.kode_guru || "").trim() === kodeGuru) return true;
    return aliasIds.has(itemId);
  });
}

function getGuruForAdminUser(user = {}) {
  if (window.AdminUsersIdentity?.getGuruForAdminUser) {
    return window.AdminUsersIdentity.getGuruForAdminUser(user, semuaDataAdminGuru, getGuruByKode);
  }
  const kodeGuru = String(user?.kode_guru || "").trim();
  if (kodeGuru) {
    const byKode = getGuruByKode(kodeGuru);
    if (byKode) return byKode;
  }

  const currentId = makeUserDocId(user?.username || user?.id || "");
  const namaUser = stripAdminGuruTitles(String(user?.nama || "").trim());
  const normalizedNamaUser = makeUsernameFromName(namaUser);
  if (!currentId && !normalizedNamaUser) return null;

  return semuaDataAdminGuru.find(guru => {
    const primaryId = makeUserDocId(makeGuruUsername(guru));
    const titledId = makeUsernameFromName(getAdminGuruName(guru));
    const plainNameId = makeUsernameFromName(getAdminGuruUsernameName(guru));
    return [primaryId, titledId, plainNameId].filter(Boolean).includes(currentId) ||
      (normalizedNamaUser && [primaryId, plainNameId].filter(Boolean).includes(normalizedNamaUser));
  }) || null;
}

async function ensureAdminGuruUserIdentity(userOrId) {
  const user = typeof userOrId === "string"
    ? semuaDataAdminUser.find(item => String(item.id || makeUserDocId(item.username)).trim() === String(userOrId).trim())
    : userOrId;
  if (!user) return { userId: String(userOrId || "").trim(), user: null };

  const guru = getGuruForAdminUser(user);
  if (!guru) {
    return { userId: String(user.id || makeUserDocId(user.username)).trim(), user };
  }

  const currentId = String(user.id || makeUserDocId(user.username)).trim();
  const matchedUsers = getAllUsersForGuru(guru, user);
  const nextUsername = makeGuruUsername(guru);
  const nextId = makeUserDocId(nextUsername);
  const nextNama = getAdminGuruName(guru);
  if (!nextId) return { userId: currentId, user };

  const canonicalSource = matchedUsers.find(item =>
    String(item.id || makeUserDocId(item.username)).trim() === nextId
  ) || user;

  const nextUser = {
    ...prepareGuruUser(guru, getAdminResolvedGuruRole(canonicalSource, ...matchedUsers, user)),
    aktif: canonicalSource.aktif !== false,
    can_generate_prompt: canUserAccessAiPrompt(canonicalSource),
    created_at: canonicalSource.created_at || user.created_at || new Date(),
    updated_at: new Date()
  };

  const staleUsers = matchedUsers.filter(item =>
    String(item.id || makeUserDocId(item.username)).trim() !== nextId
  );
  const needsPayloadUpdate =
    String(canonicalSource.username || "").trim() !== nextUsername ||
    String(canonicalSource.nama || "").trim() !== String(nextUser.nama || "").trim() ||
    String(canonicalSource.nip || "").trim() !== String(guru.nip || "").trim() ||
    String(canonicalSource.role || "").trim().toLowerCase() !== String(nextUser.role || "").trim().toLowerCase() ||
    staleUsers.length > 0;

  if (!needsPayloadUpdate && currentId === nextId) {
    return { userId: currentId, user: { ...canonicalSource, ...nextUser } };
  }

  const documentsApi = getAdminUsersDocumentsApi();
  const batch = documentsApi.batch();
  batch.set(documentsApi.collection("users").doc(nextId), nextUser, { merge: true });
  staleUsers.forEach(item => {
    const staleId = String(item.id || makeUserDocId(item.username)).trim();
    if (staleId && staleId !== nextId) batch.delete(documentsApi.collection("users").doc(staleId));
  });
  await batch.commit();

  return { userId: nextId, user: { ...nextUser, id: nextId } };
}

function getGuruByKode(kodeGuru) {
  return semuaDataAdminGuru.find(item => String(item.kode_guru || "") === String(kodeGuru || "")) || null;
}

function getSiswaByNipd(nipd) {
  return semuaDataAdminSiswa.find(item => String(item.nipd || "") === String(nipd || "")) || null;
}

function normalizePresenceKey(value = "") {
  return String(value || "").trim().toLowerCase();
}

function getPresenceKeysFromRecord(record = {}) {
  return [record.id, record.user_id, record.username, record.kode_guru]
    .map(normalizePresenceKey)
    .filter(Boolean);
}

function isAdminPresenceOnline(record = {}, thresholdMs = PRESENCE_ONLINE_THRESHOLD_MS) {
  const raw = record?.last_seen_at || record?.updated_at || record?.created_at || "";
  const seenAt = raw ? new Date(raw).getTime() : 0;
  if (!seenAt) return Boolean(record?.online);
  return Boolean(record?.online) && (Date.now() - seenAt <= Number(thresholdMs || PRESENCE_ONLINE_THRESHOLD_MS));
}

function getAdminPresenceForUser(user = {}) {
  const keys = getPresenceKeysFromRecord({
    id: user.id || makeUserDocId(user.username),
    user_id: user.id || user.username,
    username: user.username,
    kode_guru: user.kode_guru
  });
  if (keys.length === 0) return null;
  return semuaDataAdminPresence.find(record => {
    const recordKeys = getPresenceKeysFromRecord(record);
    return keys.some(key => recordKeys.includes(key));
  }) || null;
}

function getAdminOnlinePresenceRows() {
  return [...semuaDataAdminPresence]
    .filter(record => isAdminPresenceOnline(record))
    .sort((a, b) => new Date(b.last_seen_at || 0).getTime() - new Date(a.last_seen_at || 0).getTime());
}

function formatAdminPresenceAge(value) {
  const seenAt = value ? new Date(value).getTime() : 0;
  if (!seenAt) return "Belum terdeteksi";
  const diff = Math.max(0, Date.now() - seenAt);
  if (diff < 60000) return "Baru saja";
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  return `${days} hari lalu`;
}

function formatAdminPresenceLabel(record = {}) {
  return isAdminPresenceOnline(record) ? "Online" : "Offline";
}

function renderAdminPresenceSummaryHtml() {
  const onlineRows = getAdminOnlinePresenceRows();
  const chips = onlineRows.slice(0, 6).map(record => {
    const user = semuaDataAdminUser.find(item => {
      const userKeys = getPresenceKeysFromRecord({
        id: item.id || makeUserDocId(item.username),
        user_id: item.id || item.username,
        username: item.username,
        kode_guru: item.kode_guru
      });
      const recordKeys = getPresenceKeysFromRecord(record);
      return userKeys.some(key => recordKeys.includes(key));
    }) || null;
    const label = user ? (getAdminGuruName(user) || user.nama || user.username || "-") : (record.nama || record.username || record.kode_guru || "-");
    const role = user ? String(user.role || "-").trim() : String(record.role || "-").trim();
    return `
      <span class="admin-presence-chip">
        <strong>${escapeAdminHtml(label)}</strong>
        <small>${escapeAdminHtml(role)} · ${escapeAdminHtml(formatAdminPresenceAge(record.last_seen_at))}</small>
      </span>
    `;
  }).join("");

  return `
    <div class="dashboard-card-lite admin-presence-summary">
      <div class="admin-presence-summary-head">
        <div>
          <span class="dashboard-card-label">Cek Online</span>
          <h3>${onlineRows.length} user sedang online</h3>
          <p>Status diambil dari heartbeat presence saat user membuka dashboard.</p>
        </div>
        <span class="status-pill status-active">${onlineRows.length} Online</span>
      </div>
      ${chips ? `<div class="admin-presence-chip-list">${chips}</div>` : `<div class="admin-presence-empty">Belum ada user yang terdeteksi online.</div>`}
    </div>
  `;
}

function getKoordinatorDocRef() {
  return getAdminUsersDocumentsApi().collection("informasi_urusan").doc("koordinator_kelas");
}

function sortAdminGuruList(list = []) {
  return [...list].sort((a, b) =>
    String(getAdminGuruName(a) || a.kode_guru || "").localeCompare(
      String(getAdminGuruName(b) || b.kode_guru || ""),
      undefined,
      { sensitivity: "base" }
    )
  );
}

function getAdminKoordinatorSnapshot() {
  return {
    kelas_7: String(semuaDataAdminKoordinator.kelas_7 || "").trim(),
    kelas_8: String(semuaDataAdminKoordinator.kelas_8 || "").trim(),
    kelas_9: String(semuaDataAdminKoordinator.kelas_9 || "").trim()
  };
}

function getAdminKoordinatorEffectiveData() {
  return adminKoordinatorDraft ? { ...getAdminKoordinatorSnapshot(), ...adminKoordinatorDraft } : getAdminKoordinatorSnapshot();
}

function getAdminKoordinatorGuru(code) {
  return getGuruByKode(code) || null;
}

function getAdminKoordinatorName(code) {
  const guru = getAdminKoordinatorGuru(code);
  return guru ? getAdminGuruName(guru) : "-";
}

function getAdminKoordinatorDisplayName(levelKey, code) {
  const guru = getAdminKoordinatorGuru(code);
  if (guru) return getAdminGuruName(guru);
  const storedName = String(semuaDataAdminKoordinator?.[`${levelKey}_nama`] || "").trim();
  return storedName || "-";
}

function showAdminFloatingToast(message = "Tersimpan", type = "success") {
  if (typeof showFloatingToast === "function") {
    return showFloatingToast(message, type);
  }
  document.querySelectorAll(".admin-floating-toast").forEach(item => item.remove());
  const toast = document.createElement("div");
  toast.className = `admin-floating-toast ${type === "error" ? "is-error" : ""}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  window.setTimeout(() => {
    toast.classList.add("is-visible");
  }, 10);

  window.setTimeout(() => {
    toast.classList.remove("is-visible");
    toast.classList.add("is-hiding");
    window.setTimeout(() => toast.remove(), 260);
  }, 3000);
}

function getAdminKoordinatorFormDataFromDom() {
  return KOORDINATOR_LEVELS.reduce((result, item) => {
    result[item.key] = String(document.getElementById(`koordinator-${item.key}`)?.value || "").trim();
    return result;
  }, {});
}

function requestRenderAdminUsersState() {
  const hierarchyVisible = document.getElementById("adminHierarchySections");
  if (hierarchyVisible && isInteractingAdminHierarchyUi) {
    pendingAdminUsersRender = true;
    return;
  }
  pendingAdminUsersRender = false;
  renderAdminUsersState();
}

async function ensureGuruDerivedUsernames() {
  if (isSyncingGuruDerivedUsernames || hasSyncedGuruDerivedUsernames || semuaDataAdminGuru.length === 0 || semuaDataAdminUser.length === 0) return;

  const updates = semuaDataAdminUser
    .filter(user => ["guru", "koordinator", "admin", "urusan"].includes(String(user.role || "").trim().toLowerCase()))
    .filter(user => String(user.sumber || "").trim().toLowerCase() === "guru")
    .filter(user => !String(user.nip || "").trim())
    .map(user => {
      const guru = getGuruByKode(user.kode_guru) || null;
      if (!guru) return null;
      const nextUsername = makeGuruUsername(guru);
      const currentId = String(user.id || makeUserDocId(user.username)).trim();
      const nextId = makeUserDocId(nextUsername);
      if (!nextUsername || currentId === nextId) return null;
      if (semuaDataAdminUser.some(item => String(item.id || makeUserDocId(item.username)).trim() === nextId)) return null;
      return { user, guru, nextUsername, currentId, nextId };
    })
    .filter(Boolean);

  if (updates.length === 0) {
    hasSyncedGuruDerivedUsernames = true;
    return;
  }

  isSyncingGuruDerivedUsernames = true;
  try {
    const documentsApi = getAdminUsersDocumentsApi();
    const batch = documentsApi.batch();
    updates.forEach(({ user, nextUsername, nextId, currentId }) => {
      batch.set(documentsApi.collection("users").doc(nextId), {
        ...user,
        username: nextUsername,
        updated_at: new Date()
      }, { merge: true });
      batch.delete(documentsApi.collection("users").doc(currentId));
    });
    await batch.commit();
    hasSyncedGuruDerivedUsernames = true;
  } catch (error) {
    console.error("Gagal sinkron username guru turunan", error);
  } finally {
    isSyncingGuruDerivedUsernames = false;
  }
}

function hasAdminKoordinatorDraftSelection(draft = adminKoordinatorDraft) {
  return KOORDINATOR_LEVELS.some(item => String(draft?.[item.key] || "").trim());
}

function handleAdminHierarchyUiFocus() {
  isInteractingAdminHierarchyUi = true;
}

function handleAdminHierarchyUiBlur() {
  window.setTimeout(() => {
    const active = document.activeElement;
    if (active?.closest?.(".admin-koordinator-card")) return;
    isInteractingAdminHierarchyUi = false;
    if (pendingAdminUsersRender) requestRenderAdminUsersState();
  }, 90);
}

function handleAdminHierarchyUiButtonDown() {
  isInteractingAdminHierarchyUi = true;
}

function prepareGuruUser(guru, role = "guru") {
  const nama = getAdminGuruName(guru);
  const username = makeGuruUsername(guru);
  return {
    nama,
    username,
    password: DEFAULT_USER_PASSWORD,
    role,
    sumber: "guru",
    kode_guru: guru.kode_guru || "",
    nip: guru.nip || "",
    aktif: true,
    can_generate_prompt: true,
    updated_at: new Date()
  };
}

function getAdminResolvedGuruRole(...users) {
  const allowedRoles = ["koordinator", "urusan", "guru"];
  for (const user of users) {
    const role = String(user?.role || "").trim().toLowerCase();
    if (allowedRoles.includes(role)) return role;
  }
  return "guru";
}

function prepareSiswaUser(siswa) {
  const username = makeUsernameFromName(siswa.nisn || siswa.nipd || siswa.nama);
  return {
    nama: siswa.nama || username,
    username,
    password: DEFAULT_USER_PASSWORD,
    role: "siswa",
    sumber: "siswa",
    nipd: siswa.nipd || "",
    nisn: siswa.nisn || "",
    aktif: true,
    can_generate_prompt: true,
    updated_at: new Date()
  };
}

function renderAdminUserPage() {
  if (window.AdminUsersView?.renderUserPage) {
    return window.AdminUsersView.renderUserPage({
      defaultPassword: DEFAULT_USER_PASSWORD,
      roles: USER_ROLES,
      canManageAiPrompt: isCurrentUserSuperadmin(),
      presenceSummaryHtml: renderAdminPresenceSummaryHtml()
    });
  }
  const canManageAiPrompt = isCurrentUserSuperadmin();
  return `
    <div class="card">
      <div class="kelas-bayangan-head">
        <div>
          <span class="dashboard-eyebrow">Admin</span>
          <h2>Daftar User</h2>
          <p>Username dibuat otomatis dari NIP guru atau nama guru tanpa gelar, lalu dihapus spasinya.</p>
        </div>
        <div class="kelas-bayangan-actions">
          <button class="btn-secondary" onclick="syncGuruUsers()">Tambah dari Data Guru</button>
          <button class="btn-primary" onclick="resetAllUserPasswords()">Reset Password</button>
        </div>
      </div>

      <div class="matrix-toolbar-note">Password default pengguna baru: <strong>${DEFAULT_USER_PASSWORD}</strong></div>
      ${renderAdminPresenceSummaryHtml()}

      <div class="table-container mapel-table-container admin-user-table-wrap">
        <table class="mapel-table admin-user-table">
          <thead>
            <tr>
              <th>Nama</th>
              <th>Username</th>
              <th>Password</th>
              <th>Role</th>
              <th>Online</th>
              ${canManageAiPrompt ? "<th>Generate Prompt AI</th>" : ""}
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody id="adminUserBody"></tbody>
        </table>
      </div>
    </div>
  `;
}

function renderAdminHierarchyPage() {
  return `
    <div class="card">
      <div class="kelas-bayangan-head">
        <div>
          <span class="dashboard-eyebrow">Admin</span>
          <h2>Pengguna Hierarki</h2>
          <p>Kelola pengguna berdasarkan role admin, guru, urusan, dan siswa.</p>
        </div>
      </div>

      ${renderAdminPresenceSummaryHtml()}

      <div class="kelas-form-grid admin-hierarchy-form-grid">
        <label class="form-group admin-hierarchy-form-group">
          <span>Role</span>
          <select id="newUserRole" onchange="handleAdminRoleSourceChange()">
            ${USER_ROLES.map(role => `<option value="${role}">${role}</option>`).join("")}
          </select>
        </label>
        <label class="form-group admin-hierarchy-form-group">
          <span>Sumber Data</span>
          <select id="newUserSource" onchange="fillAdminUserFromSource()"></select>
        </label>
        <label class="form-group admin-hierarchy-form-group">
          <span>Nama</span>
          <input id="newUserName" placeholder="Nama pengguna">
        </label>
        <label class="form-group admin-hierarchy-form-group">
          <span>Username</span>
          <input id="newUserUsername" placeholder="Username">
        </label>
        <label class="form-group admin-hierarchy-form-group">
          <span>Password</span>
          <input id="newUserPassword" value="${DEFAULT_USER_PASSWORD}">
        </label>
        <div class="form-group admin-hierarchy-form-group">
          <span>&nbsp;</span>
          <button class="btn-primary" onclick="addHierarchyUser()">Tambah Pengguna</button>
        </div>
      </div>

      <div id="adminHierarchySections" class="dashboard-grid"></div>
    </div>
  `;
}

function loadRealtimeAdminUsers(includeSiswa = false) {
  if (window.AdminUsersService?.loadRealtimeUsers) {
    if (unsubscribeAdminGuru) unsubscribeAdminGuru();
    if (unsubscribeAdminUser) unsubscribeAdminUser();
    if (unsubscribeAdminSiswa) unsubscribeAdminSiswa();
    if (unsubscribeAdminKoordinator) unsubscribeAdminKoordinator();
    if (unsubscribeAdminPresence) unsubscribeAdminPresence();

    const unsubs = window.AdminUsersService.loadRealtimeUsers({
      includeSiswa,
      getKoordinatorDocRef,
      onGuruData: rows => {
        semuaDataAdminGuru = rows;
      },
      onUserData: rows => {
        semuaDataAdminUser = rows;
      },
      onSiswaData: rows => {
        semuaDataAdminSiswa = rows;
      },
      onKoordinatorData: data => {
        semuaDataAdminKoordinator = data;
        if (!isInteractingAdminHierarchyUi || !hasAdminKoordinatorDraftSelection()) {
          adminKoordinatorDraft = null;
          requestRenderAdminUsersState();
        }
      },
      onPresenceData: rows => {
        semuaDataAdminPresence = rows;
      },
      onGuruUpdated: () => {
        hasSyncedGuruDerivedUsernames = false;
        ensureGuruDerivedUsernames();
      },
      onUserUpdated: () => {
        ensureGuruDerivedUsernames();
      },
      onPresenceUpdated: rows => {
        semuaDataAdminPresence = rows || [];
      },
      onRender: () => requestRenderAdminUsersState()
    });
    unsubscribeAdminGuru = unsubs.guru || null;
    unsubscribeAdminUser = unsubs.user || null;
    unsubscribeAdminSiswa = unsubs.siswa || null;
    unsubscribeAdminKoordinator = unsubs.koordinator || null;
    unsubscribeAdminPresence = unsubs.presence || null;
    return;
  }
  if (unsubscribeAdminGuru) unsubscribeAdminGuru();
  if (unsubscribeAdminUser) unsubscribeAdminUser();
  if (unsubscribeAdminSiswa) unsubscribeAdminSiswa();
  if (unsubscribeAdminKoordinator) unsubscribeAdminKoordinator();
  if (unsubscribeAdminPresence) unsubscribeAdminPresence();

  const documentsApi = getAdminUsersDocumentsApi();

  unsubscribeAdminGuru = documentsApi.collection("guru").orderBy("kode_guru").onSnapshot(snapshot => {
    semuaDataAdminGuru = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    hasSyncedGuruDerivedUsernames = false;
    ensureGuruDerivedUsernames();
    requestRenderAdminUsersState();
  });

  unsubscribeAdminUser = documentsApi.collection("users").orderBy("role").onSnapshot(snapshot => {
    semuaDataAdminUser = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    ensureGuruDerivedUsernames();
    requestRenderAdminUsersState();
  });

  if (includeSiswa) {
    const siswaQuery = typeof getSemesterCollectionQuery === "function"
      ? getSemesterCollectionQuery("siswa", "nama")
      : documentsApi.collection("siswa").orderBy("nama");
    unsubscribeAdminSiswa = siswaQuery.onSnapshot(snapshot => {
      semuaDataAdminSiswa = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      requestRenderAdminUsersState();
    });
  }

  unsubscribeAdminKoordinator = getKoordinatorDocRef().onSnapshot(snapshot => {
    semuaDataAdminKoordinator = snapshot.exists ? { id: snapshot.id, ...snapshot.data() } : {};
    if (!isInteractingAdminHierarchyUi || !hasAdminKoordinatorDraftSelection()) {
      adminKoordinatorDraft = null;
      requestRenderAdminUsersState();
    }
  });

  unsubscribeAdminPresence = documentsApi.collection("user_presence").orderBy("last_seen_at", "desc").onSnapshot(snapshot => {
    semuaDataAdminPresence = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    requestRenderAdminUsersState();
  });
}

function renderAdminUsersState() {
  const userBody = document.getElementById("adminUserBody");
  if (userBody) userBody.innerHTML = renderAdminUserRows();

  const hierarchy = document.getElementById("adminHierarchySections");
  if (hierarchy) {
    if (isInteractingAdminHierarchyUi) captureAdminKoordinatorDraft();
    handleAdminRoleSourceChange(false);
    hierarchy.innerHTML = [
      renderAdminKoordinatorPanel(),
      ...USER_ROLES.map(renderAdminHierarchySection)
    ].join("");
  }
}

function renderAdminUserRows() {
  if (window.AdminUsersView?.renderUserRows) {
    return window.AdminUsersView.renderUserRows({
      users: semuaDataAdminUser,
      currentEditId: currentEditAdminUser,
      roles: USER_ROLES,
      defaultPassword: DEFAULT_USER_PASSWORD,
      canManageAiPrompt: isCurrentUserSuperadmin(),
      escape: escapeAdminHtml,
      makeUserDocId,
      getPresenceForUser: getAdminPresenceForUser,
      isPresenceOnline: isAdminPresenceOnline,
      formatPresenceLabel: formatAdminPresenceLabel,
      formatPresenceAge: formatAdminPresenceAge
    });
  }
  const rows = [...semuaDataAdminUser].sort((a, b) =>
    String(a.nama || "").localeCompare(String(b.nama || ""), undefined, { sensitivity: "base" })
  );

  if (rows.length === 0) {
    return `<tr><td colspan="${isCurrentUserSuperadmin() ? 7 : 6}" class="empty-cell">Belum ada pengguna. Klik Tambah dari Data Guru.</td></tr>`;
  }

  return rows.map(user => {
    const safeId = escapeAdminHtml(user.id || makeUserDocId(user.username));
    const safeIdJs = String(user.id || makeUserDocId(user.username)).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
    const isEditing = currentEditAdminUser === (user.id || makeUserDocId(user.username));
    const canAccessPrompt = canUserAccessAiPrompt(user);
    const isAdminRole = String(user.role || "").trim().toLowerCase() === "admin";
    const canManageAiPrompt = isCurrentUserSuperadmin();
    const presence = getAdminPresenceForUser(user);
    const isOnline = isAdminPresenceOnline(presence);
    return `
      <tr class="${isEditing ? "table-edit-row admin-user-edit-row" : ""}" data-admin-user-id="${safeId}">
        <td class="admin-user-name">
          <strong>${escapeAdminHtml(user.nama || "-")}</strong>
          <small>${escapeAdminHtml(user.sumber || user.role || "-")}</small>
        </td>
        <td><input class="admin-user-input" value="${escapeAdminHtml(user.username || user.id || "")}" readonly></td>
        <td><input class="admin-user-input" id="userPassword-${safeId}" value="${escapeAdminHtml(user.password || "")}" ${isEditing ? "" : "readonly"}></td>
        <td>
          <select class="admin-user-select" id="userRole-${safeId}" ${isEditing ? "" : "disabled"}>
            ${USER_ROLES.map(role => `<option value="${role}" ${user.role === role ? "selected" : ""}>${role}</option>`).join("")}
          </select>
        </td>
        <td>
          <span class="status-pill ${isOnline ? "status-active" : "status-offline"}">${escapeAdminHtml(formatAdminPresenceLabel(presence))}</span>
          ${presence ? `<small class="admin-user-online-meta">${escapeAdminHtml(formatAdminPresenceAge(presence.last_seen_at))}</small>` : ""}
        </td>
        ${canManageAiPrompt ? `<td>
          <label class="admin-user-feature-toggle ${isAdminRole ? "is-locked" : ""}">
            <input
              type="checkbox"
              id="userAiPrompt-${safeId}"
              ${canAccessPrompt ? "checked" : ""}
              ${isAdminRole ? "checked disabled" : ""}
              onchange="this.nextElementSibling.textContent = this.checked ? 'Aktif' : 'Nonaktif'; toggleUserGeneratePromptAccess('${safeIdJs}', this.checked)"
            >
            <span>${isAdminRole ? "Selalu aktif" : (canAccessPrompt ? "Aktif" : "Nonaktif")}</span>
          </label>
        </td>` : ""}
        <td>
          <div class="admin-user-actions">
            ${isEditing ? `
              <button class="btn-primary btn-table-compact" onclick="saveUser('${safeIdJs}')">Simpan</button>
              <button class="btn-secondary btn-table-compact" onclick="cancelEditAdminUser()">Batal</button>
            ` : `
              <button class="btn-secondary btn-table-compact" onclick="editAdminUser('${safeIdJs}')">Edit</button>
            `}
            <button class="btn-secondary btn-table-compact" onclick="resetSingleUserPassword('${safeIdJs}')">Reset</button>
            <button class="btn-danger btn-table-compact" onclick="deleteUser('${safeIdJs}')">Hapus</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

function editAdminUser(userId) {
  currentEditAdminUser = userId;
  renderAdminUsersState();
}

function cancelEditAdminUser() {
  currentEditAdminUser = null;
  renderAdminUsersState();
}

function renderAdminHierarchySection(role) {
  const users = semuaDataAdminUser.filter(item => item.role === role)
    .sort((a, b) => String(a.nama || "").localeCompare(String(b.nama || ""), undefined, { sensitivity: "base" }));
  return `
    <article class="dashboard-card-lite admin-role-summary-card">
      <span class="dashboard-card-label">${escapeAdminHtml(role)}</span>
      <h3>${users.length} pengguna</h3>
      <div class="dashboard-mini-list">
        <span><strong>Total akun ${escapeAdminHtml(role)}</strong><b>${users.length}</b></span>
        <span><strong>Password default</strong><b>${escapeAdminHtml(DEFAULT_USER_PASSWORD)}</b></span>
      </div>
    </article>
  `;
}

function renderAdminKoordinatorPanel() {
  const data = getAdminKoordinatorEffectiveData();
  return `
    <article class="dashboard-card-lite admin-koordinator-card">
      <div class="admin-koordinator-head">
        <div>
          <span class="dashboard-card-label">Koordinator</span>
          <h3>Informasi Urusan</h3>
          <p>Pilih guru koordinator untuk tiap jenjang dan simpan langsung ke informasi urusan.</p>
        </div>
        <div class="admin-koordinator-badge">3 Jenjang</div>
      </div>

      <div class="admin-koordinator-grid">
        ${KOORDINATOR_LEVELS.map(item => `
          <label class="admin-koordinator-row">
            <span class="admin-koordinator-label">${item.label}</span>
            <span class="admin-koordinator-meta">${escapeAdminHtml(data[item.key] ? `Aktif: ${getAdminKoordinatorDisplayName(item.key, data[item.key])}` : "Belum dipilih")}</span>
            <div class="admin-koordinator-select-wrap">
              <select id="koordinator-${item.key}" onchange="handleAdminKoordinatorChange()" onfocus="handleAdminHierarchyUiFocus()" onblur="handleAdminHierarchyUiBlur()">
                <option value="">Pilih guru</option>
                ${sortAdminGuruList(semuaDataAdminGuru).map(guru => {
                  const value = String(guru.kode_guru || guru.id || "");
                  return `<option value="${escapeAdminHtml(value)}" ${value === String(data[item.key] || "") ? "selected" : ""}>${escapeAdminHtml(getAdminGuruName(guru) || guru.kode_guru || "-")}</option>`;
                }).join("")}
              </select>
            </div>
          </label>
        `).join("")}
      </div>

      <div class="dashboard-mini-list admin-koordinator-summary">
        ${KOORDINATOR_LEVELS.map(item => `
          <span><strong>${item.label}</strong><b>${escapeAdminHtml(data[item.key] ? getAdminKoordinatorDisplayName(item.key, data[item.key]) : "Belum dipilih")}</b></span>
        `).join("")}
      </div>

      <div class="admin-koordinator-actions" data-admin-koordinator-panel="koordinator">
        <button class="btn-primary btn-table-compact" type="button" onmousedown="handleAdminHierarchyUiButtonDown()" onclick="saveAdminKoordinator()">Simpan Koordinator</button>
      </div>
    </article>
  `;
}

function captureAdminKoordinatorDraft() {
  const fields = {};
  let hasAnyField = false;
  KOORDINATOR_LEVELS.forEach(item => {
    const value = document.getElementById(`koordinator-${item.key}`)?.value;
    if (typeof value === "string") {
      fields[item.key] = value.trim();
      hasAnyField = true;
    }
  });
  if (!hasAnyField) return;
  if (Object.values(fields).some(Boolean) || isInteractingAdminHierarchyUi) {
    adminKoordinatorDraft = fields;
  } else {
    adminKoordinatorDraft = null;
  }
}

function handleAdminKoordinatorChange() {
  captureAdminKoordinatorDraft();
  KOORDINATOR_LEVELS.forEach(item => {
    const meta = document.querySelector(`#koordinator-${item.key}`)?.closest(".admin-koordinator-row")?.querySelector(".admin-koordinator-meta");
    if (meta) {
      const data = getAdminKoordinatorEffectiveData();
      meta.textContent = data[item.key] ? `Aktif: ${getAdminKoordinatorDisplayName(item.key, data[item.key])}` : "Belum dipilih";
    }
  });
  const summary = document.querySelector(".admin-koordinator-summary");
  if (!summary) return;
  const data = getAdminKoordinatorEffectiveData();
  summary.innerHTML = KOORDINATOR_LEVELS.map(item => `
    <span><strong>${item.label}</strong><b>${escapeAdminHtml(data[item.key] ? getAdminKoordinatorDisplayName(item.key, data[item.key]) : "Belum dipilih")}</b></span>
  `).join("");
}

function handleAdminRoleSourceChange(shouldClear = true) {
  const role = document.getElementById("newUserRole")?.value || "admin";
  const source = document.getElementById("newUserSource");
  if (!source) return;

  let options = [`<option value="">Manual</option>`];
  if (role === "guru" || role === "admin" || role === "superadmin" || role === "koordinator" || role === "urusan") {
    options = options.concat(semuaDataAdminGuru.map(guru =>
      `<option value="guru:${escapeAdminHtml(guru.kode_guru || guru.id)}">${escapeAdminHtml(getAdminGuruName(guru) || guru.kode_guru || "-")}</option>`
    ));
  }
  if (role === "siswa") {
    options = options.concat(semuaDataAdminSiswa.map(siswa =>
      `<option value="siswa:${escapeAdminHtml(siswa.nipd || siswa.id)}">${escapeAdminHtml(siswa.nama || siswa.nipd || "-")}</option>`
    ));
  }

  const previous = source.value;
  source.innerHTML = options.join("");
  if (!shouldClear && previous) source.value = previous;
}

function fillAdminUserFromSource() {
  const role = document.getElementById("newUserRole")?.value || "admin";
  const value = document.getElementById("newUserSource")?.value || "";
  const nameEl = document.getElementById("newUserName");
  const usernameEl = document.getElementById("newUserUsername");
  const passwordEl = document.getElementById("newUserPassword");
  if (!nameEl || !usernameEl || !passwordEl) return;

  if (!value) {
    usernameEl.value = makeUsernameFromName(nameEl.value);
    return;
  }

  const [type, id] = value.split(":");
  if (type === "guru") {
    const guru = getGuruByKode(id) || semuaDataAdminGuru.find(item => item.id === id);
    const payload = prepareGuruUser(guru || {}, role);
    nameEl.value = payload.nama;
    usernameEl.value = payload.username;
    passwordEl.value = DEFAULT_USER_PASSWORD;
  }
  if (type === "siswa") {
    const siswa = getSiswaByNipd(id) || semuaDataAdminSiswa.find(item => item.id === id);
    const payload = prepareSiswaUser(siswa || {});
    nameEl.value = payload.nama;
    usernameEl.value = payload.username;
    passwordEl.value = DEFAULT_USER_PASSWORD;
  }
}

async function syncGuruUsers() {
  if (window.AdminUsersService?.syncGuruUsers) {
    const result = await window.AdminUsersService.syncGuruUsers({
      guruList: semuaDataAdminGuru,
      getUserByGuru,
      prepareGuruUser,
      makeUserDocId
    });
    if (!result.added) {
      Swal.fire("Sudah lengkap", "Semua guru sudah memiliki user.", "info");
      return;
    }
    Swal.fire("Selesai", `${result.added} user guru ditambahkan.`, "success");
    return;
  }
  const candidates = semuaDataAdminGuru
    .filter(guru => !getUserByGuru(guru))
    .map(guru => prepareGuruUser(guru))
    .filter(user => user.username);

  if (candidates.length === 0) {
    Swal.fire("Sudah lengkap", "Semua guru sudah memiliki user.", "info");
    return;
  }

  const documentsApi = getAdminUsersDocumentsApi();
  const batch = documentsApi.batch();
  candidates.forEach(user => {
    batch.set(documentsApi.collection("users").doc(makeUserDocId(user.username)), { ...user, created_at: new Date() }, { merge: true });
  });
  await batch.commit();
  Swal.fire("Selesai", `${candidates.length} user guru ditambahkan.`, "success");
}

async function resetAllUserPasswords() {
  const { value } = await Swal.fire({
    title: "Reset semua password",
    input: "text",
    inputValue: DEFAULT_USER_PASSWORD,
    inputLabel: "Password default baru",
    showCancelButton: true,
    confirmButtonText: "Reset"
  });
  if (!value) return;

  if (window.AdminUsersService?.resetAllPasswords) {
    await window.AdminUsersService.resetAllPasswords(semuaDataAdminUser, value);
  } else {
    const documentsApi = getAdminUsersDocumentsApi();
    const batch = documentsApi.batch();
    semuaDataAdminUser.forEach(user => {
      batch.update(documentsApi.collection("users").doc(user.id), { password: value, updated_at: new Date() });
    });
    await batch.commit();
  }
  Swal.fire("Selesai", "Semua password pengguna sudah diganti.", "success");
}

async function resetSingleUserPassword(userId) {
  setAdminUserLoading(true, "Reset password user", "Mohon tunggu sebentar. Password default sedang diterapkan.");
  try {
    const resolved = await ensureAdminGuruUserIdentity(userId);
    if (!resolved.user) {
      Swal.fire("User tidak ditemukan", "Silakan refresh halaman lalu coba lagi.", "warning");
      return;
    }
    const targetId = resolved.userId || userId;
    await getAdminUsersDocumentsApi().collection("users").doc(targetId).set({
      ...(resolved.user || {}),
      password: DEFAULT_USER_PASSWORD,
      updated_at: new Date()
    }, { merge: true });
    Swal.fire("Selesai", "Password pengguna sudah direset.", "success");
  } finally {
    setAdminUserLoading(false);
  }
}

async function saveUser(userId) {
  try {
    const password = document.getElementById(`userPassword-${userId}`)?.value || DEFAULT_USER_PASSWORD;
    const role = document.getElementById(`userRole-${userId}`)?.value || "guru";
    const isSuperadmin = isCurrentUserSuperadmin();
    const resolved = await ensureAdminGuruUserIdentity(userId);
    if (!resolved.user) {
      showAdminFloatingToast("User tidak ditemukan.", "error");
      return;
    }
    const targetId = resolved.userId || userId;
    const aiPromptEnabled = isSuperadmin
      ? document.getElementById(`userAiPrompt-${userId}`)?.checked !== false
      : canUserAccessAiPrompt(resolved.user || {});
    await getAdminUsersDocumentsApi().collection("users").doc(targetId).set({
      ...(resolved.user || {}),
      password,
      role,
      can_generate_prompt: ["admin", "superadmin"].includes(role) ? true : aiPromptEnabled,
      updated_at: new Date()
    }, { merge: true });
    syncStoredAppUserPatch(targetId, {
      password,
      role,
      can_generate_prompt: ["admin", "superadmin"].includes(role) ? true : aiPromptEnabled
    });
    currentEditAdminUser = null;
    renderAdminUsersState();
    showAdminFloatingToast("Perubahan user tersimpan.");
  } catch (error) {
    console.error(error);
    showAdminFloatingToast("Perubahan user gagal disimpan.", "error");
  }
}

async function toggleUserGeneratePromptAccess(userId, isEnabled) {
  if (!isCurrentUserSuperadmin()) {
    renderAdminUsersState();
    return;
  }
  const targetUser = semuaDataAdminUser.find(item => String(item.id || makeUserDocId(item.username)).trim() === String(userId).trim());
  if (String(targetUser?.role || "").trim().toLowerCase() === "admin") {
    renderAdminUsersState();
    return;
  }

  try {
    const resolved = await ensureAdminGuruUserIdentity(userId);
    if (!resolved.user) {
      showAdminFloatingToast("User tidak ditemukan.", "error");
      renderAdminUsersState();
      return;
    }
    const targetId = resolved.userId || userId;
    const nextAccess = Boolean(isEnabled);
    await getAdminUsersDocumentsApi().collection("users").doc(targetId).set({
      ...(resolved.user || {}),
      can_generate_prompt: nextAccess,
      updated_at: new Date()
    }, { merge: true });
    syncStoredAppUserPatch(targetId, { can_generate_prompt: nextAccess });
    showAdminFloatingToast(nextAccess ? "Akses Generate Prompt AI diaktifkan." : "Akses Generate Prompt AI dinonaktifkan.");
  } catch (error) {
    console.error(error);
    showAdminFloatingToast("Hak akses belum berhasil diperbarui.", "error");
  }
}

async function deleteUser(userId) {
  const result = await Swal.fire({
    title: "Hapus user?",
    text: userId,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Hapus"
  });
  if (!result.isConfirmed) return;
  if (window.AdminUsersService?.deleteUser) {
    await window.AdminUsersService.deleteUser(userId);
  } else {
    await getAdminUsersDocumentsApi().collection("users").doc(userId).delete();
  }
  Swal.fire("Terhapus", "User sudah dihapus.", "success");
}

async function addHierarchyUser() {
  const role = document.getElementById("newUserRole")?.value || "guru";
  const name = document.getElementById("newUserName")?.value.trim() || "";
  const username = document.getElementById("newUserUsername")?.value.trim() || "";
  const password = document.getElementById("newUserPassword")?.value || DEFAULT_USER_PASSWORD;

  if (!name || !username) {
    Swal.fire("Lengkapi data", "Nama dan username wajib diisi.", "warning");
    return;
  }

  const payload = {
    nama: name,
    username,
    password,
    role,
    aktif: true,
    can_generate_prompt: true,
    updated_at: new Date(),
    created_at: new Date()
  };

  await getAdminUsersDocumentsApi().collection("users").doc(makeUserDocId(username)).set(payload, { merge: true });
  Swal.fire("Tersimpan", "Pengguna sudah ditambahkan.", "success");
}

async function saveAdminKoordinator() {
  const saveButton = document.querySelector("[data-admin-koordinator-panel='koordinator'] button");
  const domData = getAdminKoordinatorFormDataFromDom();
  adminKoordinatorDraft = domData;
  const data = { ...getAdminKoordinatorSnapshot(), ...domData };
  const payload = KOORDINATOR_LEVELS.reduce((result, item) => {
    const kodeGuru = String(data[item.key] || "").trim();
    const guru = getAdminKoordinatorGuru(kodeGuru);
    result[item.key] = kodeGuru;
    result[`${item.key}_nama`] = guru ? getAdminGuruName(guru) : "";
    result[`${item.key}_nip`] = String(guru?.nip || "").trim();
    return result;
  }, { updated_at: new Date() });

  try {
    if (saveButton) {
      saveButton.disabled = true;
      saveButton.textContent = "Menyimpan...";
    }

    await getKoordinatorDocRef().set(payload, { merge: true });
    const verifySnapshot = await getKoordinatorDocRef().get();
    const verifiedData = verifySnapshot.exists ? verifySnapshot.data() : {};
    const hasMismatch = KOORDINATOR_LEVELS.some(item =>
      String(verifiedData[item.key] || "") !== String(payload[item.key] || "")
    );
    if (hasMismatch) {
      throw new Error("Verifikasi simpan koordinator tidak cocok dengan data yang dibaca ulang.");
    }
    semuaDataAdminKoordinator = { ...semuaDataAdminKoordinator, ...verifiedData, ...payload };
    adminKoordinatorDraft = null;
    isInteractingAdminHierarchyUi = false;
    pendingAdminUsersRender = false;
    renderAdminUsersState();
    showAdminFloatingToast("Koordinator berhasil disimpan");
  } catch (error) {
    console.error("Gagal menyimpan koordinator", error);
    showAdminFloatingToast("Gagal menyimpan koordinator", "error");
  } finally {
    if (saveButton) {
      saveButton.disabled = false;
      saveButton.textContent = "Simpan Koordinator";
    }
  }
}
