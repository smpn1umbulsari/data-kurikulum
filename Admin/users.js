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
let pendingAdminUsersRenderTimer = null;
let adminUserActiveTab = "daftar-user";
let isSyncingGuruDerivedUsernames = false;
let hasSyncedGuruDerivedUsernames = false;
const PRESENCE_ONLINE_THRESHOLD_MS = 180000;
const ADMIN_USERS_RENDER_DEBOUNCE_MS = 80;
const adminUsersByIdCache = new Map();
const adminUsersByKodeGuruCache = new Map();
const adminGuruByKodeCache = new Map();
const adminSiswaByNipdCache = new Map();
const adminPresenceByKeyCache = new Map();
let adminOnlinePresenceRowsCache = null;
let adminPresenceSummaryHtmlCache = "";
let adminRoleSummaryCache = null;

const DEFAULT_USER_PASSWORD = "guruspenturi";
const USER_ROLES = ["admin", "guru", "koordinator", "urusan", "siswa"];
const KOORDINATOR_LEVELS = [
  { key: "kelas_7", label: "Kelas 7" },
  { key: "kelas_8", label: "Kelas 8" },
  { key: "kelas_9", label: "Kelas 9" }
];
const adminUsersDerivedCache = {
  userListRef: null,
  userIndex: null,
  guruListRef: null,
  guruIndex: null,
  siswaListRef: null,
  siswaIndex: null,
  presenceListRef: null,
  presenceIndex: null,
  onlinePresenceRowsRef: null,
  onlinePresenceRows: null,
  sortedUsersRef: null,
  sortedUsers: null,
  sortedGuruRef: null,
  sortedGuru: null,
  usersByRoleRef: null,
  usersByRole: null
};

function getAdminUsersDocumentsApi() {
  return window.SupabaseDocuments;
}

function rebuildAdminUserCaches() {
  adminUsersByIdCache.clear();
  adminUsersByKodeGuruCache.clear();
  adminRoleSummaryCache = null;
  adminPresenceSummaryHtmlCache = "";
  semuaDataAdminUser.forEach(user => {
    const userId = String(user?.id || makeUserDocId(user?.username)).trim();
    if (userId) adminUsersByIdCache.set(userId, user);
    const kodeGuru = String(user?.kode_guru || "").trim();
    if (kodeGuru && !adminUsersByKodeGuruCache.has(kodeGuru)) adminUsersByKodeGuruCache.set(kodeGuru, user);
  });
}

function rebuildAdminGuruCaches() {
  adminGuruByKodeCache.clear();
  semuaDataAdminGuru.forEach(guru => {
    const kodeGuru = String(guru?.kode_guru || "").trim();
    if (kodeGuru) adminGuruByKodeCache.set(kodeGuru, guru);
  });
}

function rebuildAdminSiswaCaches() {
  adminSiswaByNipdCache.clear();
  semuaDataAdminSiswa.forEach(siswa => {
    const nipd = String(siswa?.nipd || "").trim();
    if (nipd) adminSiswaByNipdCache.set(nipd, siswa);
  });
}

function rebuildAdminPresenceCaches() {
  adminPresenceByKeyCache.clear();
  adminOnlinePresenceRowsCache = null;
  adminPresenceSummaryHtmlCache = "";
  semuaDataAdminPresence.forEach(record => {
    getPresenceKeysFromRecord(record).forEach(key => {
      if (!adminPresenceByKeyCache.has(key)) adminPresenceByKeyCache.set(key, record);
    });
  });
}

function canUserAccessAiPrompt(user = {}) {
  const role = String(user?.role || "").trim().toLowerCase();
  if (["admin", "superadmin"].includes(role)) return true;
  const rawAccess = user?.can_generate_prompt;
  if (typeof rawAccess === "string") {
    const normalized = rawAccess.trim().toLowerCase();
    return ["true", "1", "yes", "ya"].includes(normalized);
  }
  if (typeof rawAccess === "number") return rawAccess === 1;
  return rawAccess === true;
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
  const normalizedNip = nip === "-" ? "" : nip;
  return normalizedNip || makeUsernameFromName(getAdminGuruUsernameName(guru));
}

function makeUserDocId(username) {
  if (window.AdminUsersIdentity?.makeUserDocId) {
    return window.AdminUsersIdentity.makeUserDocId(username);
  }
  return makeUsernameFromName(username);
}

function getAdminUserIndex() {
  if (adminUsersDerivedCache.userListRef === semuaDataAdminUser && adminUsersDerivedCache.userIndex) {
    return adminUsersDerivedCache.userIndex;
  }
  const byDocId = new Map();
  const byKodeGuru = new Map();
  const byAlias = new Map();
  const byRole = new Map();
  semuaDataAdminUser.forEach(user => {
    const docId = String(user.id || makeUserDocId(user.username)).trim();
    if (docId) byDocId.set(docId, user);
    const kodeGuru = String(user.kode_guru || "").trim();
    if (kodeGuru) {
      if (!byKodeGuru.has(kodeGuru)) byKodeGuru.set(kodeGuru, []);
      byKodeGuru.get(kodeGuru).push(user);
      const normalizedKodeGuru = normalizePresenceKey(kodeGuru);
      if (normalizedKodeGuru && normalizedKodeGuru !== kodeGuru) {
        if (!byKodeGuru.has(normalizedKodeGuru)) byKodeGuru.set(normalizedKodeGuru, []);
        byKodeGuru.get(normalizedKodeGuru).push(user);
      }
    }
    [user.id, user.username, user.nama]
      .map(item => makeUserDocId(item))
      .filter(Boolean)
      .forEach(alias => {
        if (!byAlias.has(alias)) byAlias.set(alias, user);
      });
    const role = String(user.role || "").trim();
    if (role) {
      if (!byRole.has(role)) byRole.set(role, []);
      byRole.get(role).push(user);
    }
  });
  adminUsersDerivedCache.userListRef = semuaDataAdminUser;
  adminUsersDerivedCache.userIndex = { byDocId, byKodeGuru, byAlias, byRole };
  adminUsersDerivedCache.sortedUsersRef = null;
  adminUsersDerivedCache.usersByRoleRef = null;
  return adminUsersDerivedCache.userIndex;
}

function getAdminGuruIndex() {
  if (adminUsersDerivedCache.guruListRef === semuaDataAdminGuru && adminUsersDerivedCache.guruIndex) {
    return adminUsersDerivedCache.guruIndex;
  }
  const byKode = new Map();
  const byId = new Map();
  semuaDataAdminGuru.forEach(guru => {
    const kode = String(guru.kode_guru || "").trim();
    const id = String(guru.id || "").trim();
    if (kode) byKode.set(kode, guru);
    if (id) byId.set(id, guru);
  });
  adminUsersDerivedCache.guruListRef = semuaDataAdminGuru;
  adminUsersDerivedCache.guruIndex = { byKode, byId };
  adminUsersDerivedCache.sortedGuruRef = null;
  return adminUsersDerivedCache.guruIndex;
}

function getAdminSiswaIndex() {
  if (adminUsersDerivedCache.siswaListRef === semuaDataAdminSiswa && adminUsersDerivedCache.siswaIndex) {
    return adminUsersDerivedCache.siswaIndex;
  }
  const byNipd = new Map();
  const byId = new Map();
  semuaDataAdminSiswa.forEach(siswa => {
    const nipd = String(siswa.nipd || "").trim();
    const id = String(siswa.id || "").trim();
    if (nipd) byNipd.set(nipd, siswa);
    if (id) byId.set(id, siswa);
  });
  adminUsersDerivedCache.siswaListRef = semuaDataAdminSiswa;
  adminUsersDerivedCache.siswaIndex = { byNipd, byId };
  return adminUsersDerivedCache.siswaIndex;
}

function getAdminSortedUsers() {
  if (adminUsersDerivedCache.sortedUsersRef === semuaDataAdminUser && adminUsersDerivedCache.sortedUsers) {
    return adminUsersDerivedCache.sortedUsers;
  }
  const rows = [...semuaDataAdminUser].sort((a, b) =>
    String(a.nama || "").localeCompare(String(b.nama || ""), undefined, { sensitivity: "base" })
  );
  adminUsersDerivedCache.sortedUsersRef = semuaDataAdminUser;
  adminUsersDerivedCache.sortedUsers = rows;
  return rows;
}

function getUserByUsername(username) {
  const target = makeUserDocId(username);
  const index = getAdminUserIndex();
  return index.byAlias.get(target) || index.byDocId.get(target) || null;
}

function getUserByGuru(guru = {}) {
  if (window.AdminUsersIdentity?.getUserByGuru) {
    return window.AdminUsersIdentity.getUserByGuru(guru, semuaDataAdminUser);
  }
  const kodeGuru = String(guru?.kode_guru || "").trim();
  if (kodeGuru) {
    const byKode = getAdminUserIndex().byKodeGuru.get(kodeGuru)?.[0] || null;
    if (byKode) return byKode;
  }

  const aliases = [
    makeGuruUsername(guru),
    makeUsernameFromName(getAdminGuruName(guru)),
    makeUsernameFromName(getAdminGuruUsernameName(guru))
  ]
    .map(value => makeUserDocId(value))
    .filter(Boolean);

  const index = getAdminUserIndex();
  return aliases.map(alias => index.byAlias.get(alias) || index.byDocId.get(alias)).find(Boolean) || null;
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

  const source = kodeGuru ? (getAdminUserIndex().byKodeGuru.get(kodeGuru) || semuaDataAdminUser) : semuaDataAdminUser;
  return source.filter(item => {
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
    ? getAdminUserIndex().byDocId.get(String(userOrId).trim())
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
  return getAdminGuruIndex().byKode.get(String(kodeGuru || "")) || null;
}

function getSiswaByNipd(nipd) {
  return getAdminSiswaIndex().byNipd.get(String(nipd || "")) || null;
}

function normalizePresenceKey(value = "") {
  return String(value || "").trim().toLowerCase();
}

function getPresenceKeysFromRecord(record = {}) {
  return [record.id, record.user_id, record.username, record.kode_guru]
    .map(normalizePresenceKey)
    .filter(Boolean);
}

function getAdminPresenceIndex() {
  if (adminUsersDerivedCache.presenceListRef === semuaDataAdminPresence && adminUsersDerivedCache.presenceIndex) {
    return adminUsersDerivedCache.presenceIndex;
  }
  const byKey = new Map();
  semuaDataAdminPresence.forEach(record => {
    getPresenceKeysFromRecord(record).forEach(key => {
      if (!byKey.has(key)) byKey.set(key, record);
    });
  });
  adminUsersDerivedCache.presenceListRef = semuaDataAdminPresence;
  adminUsersDerivedCache.presenceIndex = { byKey };
  adminUsersDerivedCache.onlinePresenceRows = null;
  return adminUsersDerivedCache.presenceIndex;
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
  const index = getAdminPresenceIndex();
  return keys.map(key => index.byKey.get(key)).find(Boolean) || null;
}

function getAdminOnlinePresenceRows() {
  if (adminUsersDerivedCache.onlinePresenceRowsRef === semuaDataAdminPresence && adminUsersDerivedCache.onlinePresenceRows) {
    return adminUsersDerivedCache.onlinePresenceRows;
  }
  const rows = [...semuaDataAdminPresence]
    .filter(record => isAdminPresenceOnline(record))
    .sort((a, b) => new Date(b.last_seen_at || 0).getTime() - new Date(a.last_seen_at || 0).getTime());
  adminUsersDerivedCache.onlinePresenceRowsRef = semuaDataAdminPresence;
  adminUsersDerivedCache.onlinePresenceRows = rows;
  return rows;
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

function getAdminUserForPresenceRecord(record = {}) {
  const keys = getPresenceKeysFromRecord(record);
  for (const key of keys) {
    const user = adminUsersByIdCache.get(key) || adminUsersByKodeGuruCache.get(key);
    if (user) return user;
  }
  return null;
}

function renderAdminPresenceSummaryHtml() {
  if (adminPresenceSummaryHtmlCache) return adminPresenceSummaryHtmlCache;
  const onlineRows = getAdminOnlinePresenceRows();
  const userIndex = getAdminUserIndex();
  const chips = onlineRows.slice(0, 6).map(record => {
    const user = getPresenceKeysFromRecord(record)
      .map(key => userIndex.byAlias.get(key) || userIndex.byDocId.get(key) || userIndex.byKodeGuru.get(key)?.[0])
      .find(Boolean) || null;
    const label = user ? (getAdminGuruName(user) || user.nama || user.username || "-") : (record.nama || record.username || record.kode_guru || "-");
    const role = user ? String(user.role || "-").trim() : String(record.role || "-").trim();
    return `
      <span class="admin-presence-chip">
        <strong>${escapeAdminHtml(label)}</strong>
        <small>${escapeAdminHtml(role)} · ${escapeAdminHtml(formatAdminPresenceAge(record.last_seen_at))}</small>
      </span>
    `;
  }).join("");

  adminPresenceSummaryHtmlCache = `
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
  return adminPresenceSummaryHtmlCache;
}

function getKoordinatorDocRef() {
  return getAdminUsersDocumentsApi().collection("informasi_urusan").doc("koordinator_kelas");
}

function sortAdminGuruList(list = []) {
  if (list === semuaDataAdminGuru && adminUsersDerivedCache.sortedGuruRef === semuaDataAdminGuru && adminUsersDerivedCache.sortedGuru) {
    return adminUsersDerivedCache.sortedGuru;
  }
  const rows = [...list].sort((a, b) =>
    String(getAdminGuruName(a) || a.kode_guru || "").localeCompare(
      String(getAdminGuruName(b) || b.kode_guru || ""),
      undefined,
      { sensitivity: "base" }
    )
  );
  if (list === semuaDataAdminGuru) {
    adminUsersDerivedCache.sortedGuruRef = semuaDataAdminGuru;
    adminUsersDerivedCache.sortedGuru = rows;
  }
  return rows;
}

function getAdminUsersByRole(role) {
  if (adminUsersDerivedCache.usersByRoleRef === semuaDataAdminUser && adminUsersDerivedCache.usersByRole) {
    return adminUsersDerivedCache.usersByRole.get(role) || [];
  }
  const index = getAdminUserIndex();
  const byRole = new Map();
  USER_ROLES.forEach(item => {
    const rows = [...(index.byRole.get(item) || [])].sort((a, b) =>
      String(a.nama || "").localeCompare(String(b.nama || ""), undefined, { sensitivity: "base" })
    );
    byRole.set(item, rows);
  });
  adminUsersDerivedCache.usersByRoleRef = semuaDataAdminUser;
  adminUsersDerivedCache.usersByRole = byRole;
  return byRole.get(role) || [];
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

function normalizeAdminUserTab(tab) {
  return tab === "tambah-manual" ? "tambah-manual" : "daftar-user";
}

function syncAdminUserTabDom() {
  const tab = normalizeAdminUserTab(adminUserActiveTab);
  document.querySelectorAll("[data-admin-user-tab]").forEach(button => {
    const isActive = button.dataset.adminUserTab === tab;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", isActive ? "true" : "false");
    button.tabIndex = isActive ? 0 : -1;
  });
  document.querySelectorAll("[data-admin-user-tab-panel]").forEach(panel => {
    const isActive = panel.dataset.adminUserTabPanel === tab;
    panel.classList.toggle("is-active", isActive);
    panel.hidden = !isActive;
  });
}

function setAdminUsersTab(tab) {
  adminUserActiveTab = normalizeAdminUserTab(tab);
  syncAdminUserTabDom();
  if (adminUserActiveTab === "tambah-manual") {
    handleAdminRoleSourceChange(false);
    fillAdminUserFromSource();
    window.setTimeout(() => {
      document.getElementById("newUserName")?.focus();
    }, 0);
  }
}

function getAdminKoordinatorFormDataFromDom() {
  return KOORDINATOR_LEVELS.reduce((result, item) => {
    result[item.key] = String(document.getElementById(`koordinator-${item.key}`)?.value || "").trim();
    return result;
  }, {});
}

function requestRenderAdminUsersState(options = {}) {
  const presenceOnly = Boolean(options.presenceOnly);
  const hierarchyVisible = document.getElementById("adminHierarchySections");
  if (hierarchyVisible && isInteractingAdminHierarchyUi) {
    pendingAdminUsersRender = true;
    if (pendingAdminUsersRenderTimer) return;
    return;
  }
  pendingAdminUsersRender = false;
  if (pendingAdminUsersRenderTimer) {
    clearTimeout(pendingAdminUsersRenderTimer);
    pendingAdminUsersRenderTimer = null;
  }

  if (presenceOnly) {
    pendingAdminUsersRenderTimer = setTimeout(() => {
      pendingAdminUsersRenderTimer = null;
      renderAdminUsersState({ presenceOnly: true });
    }, ADMIN_USERS_RENDER_DEBOUNCE_MS);
    return;
  }

  renderAdminUsersState({ presenceOnly: false });
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

function normalizeAdminUserLookup(value = "") {
  return makeUsernameFromName(String(value || "").trim());
}

function resolveGuruForManualUserInput({ name = "", username = "" } = {}) {
  const normalizedName = normalizeAdminUserLookup(name);
  const normalizedUsername = normalizeAdminUserLookup(username);
  const rawUsername = String(username || "").trim();
  if (!normalizedName && !normalizedUsername && !rawUsername) return null;

  return semuaDataAdminGuru.find(guru => {
    const guruNip = String(guru?.nip || "").trim();
    const aliases = [
      guru?.kode_guru,
      guruNip,
      getAdminGuruName(guru),
      getAdminGuruUsernameName(guru),
      makeGuruUsername(guru)
    ]
      .map(item => normalizeAdminUserLookup(item))
      .filter(Boolean);

    if (guruNip && rawUsername === guruNip) return true;
    if (normalizedUsername && aliases.includes(normalizedUsername)) return true;
    if (normalizedName && aliases.includes(normalizedName)) return true;
    return false;
  }) || null;
}

function buildManualUserPayload({ role = "guru", name = "", username = "", password = DEFAULT_USER_PASSWORD } = {}) {
  const guru = resolveGuruForManualUserInput({ name, username });
  if (guru) {
    const payload = prepareGuruUser(guru, role);
    return {
      ...payload,
      nama: name || payload.nama,
      username: username || payload.username,
      password,
      role,
      sumber: "manual-guru"
    };
  }

  return {
    nama: name,
    username,
    password,
    role,
    aktif: true,
    can_generate_prompt: true,
    updated_at: new Date(),
    created_at: new Date()
  };
}

async function relinkManualUsersToGuru() {
  const candidates = semuaDataAdminUser
    .filter(user => !String(user.kode_guru || "").trim())
    .map(user => {
      const guru = resolveGuruForManualUserInput({
        name: user.nama || "",
        username: user.username || user.id || ""
      });
      if (!guru) return null;
      return { user, guru };
    })
    .filter(Boolean);

  if (!candidates.length) {
    Swal.fire("Sudah rapi", "Tidak ada user manual yang perlu disambungkan ke data guru.", "info");
    return;
  }

  const documentsApi = getAdminUsersDocumentsApi();
  const batch = documentsApi.batch();
  candidates.forEach(({ user, guru }) => {
    const userId = String(user.id || makeUserDocId(user.username)).trim();
    batch.set(documentsApi.collection("users").doc(userId), {
      kode_guru: guru.kode_guru || "",
      nip: guru.nip || "",
      sumber: user.sumber === "guru" ? user.sumber : "manual-guru",
      updated_at: new Date()
    }, { merge: true });
  });
  await batch.commit();
  Swal.fire("Selesai", `${candidates.length} user manual berhasil disambungkan ke data guru.`, "success");
}

function renderAdminUserPage() {
  if (window.AdminUsersView?.renderUserPage) {
    return window.AdminUsersView.renderUserPage({
      defaultPassword: DEFAULT_USER_PASSWORD,
      roles: USER_ROLES,
      canManageAiPrompt: isCurrentUserSuperadmin(),
      presenceSummaryHtml: renderAdminPresenceSummaryHtml(),
      activeTab: adminUserActiveTab
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

      <div class="admin-user-tabbar" role="tablist" aria-label="Menu pengguna">
        <button class="admin-user-tab ${adminUserActiveTab === "daftar-user" ? "active" : ""}" type="button" data-admin-user-tab="daftar-user" aria-selected="${adminUserActiveTab === "daftar-user" ? "true" : "false"}" onclick="setAdminUsersTab('daftar-user')">Daftar User</button>
        <button class="admin-user-tab ${adminUserActiveTab === "tambah-manual" ? "active" : ""}" type="button" data-admin-user-tab="tambah-manual" aria-selected="${adminUserActiveTab === "tambah-manual" ? "true" : "false"}" onclick="setAdminUsersTab('tambah-manual')">Tambah Manual</button>
      </div>

      <section class="admin-user-tab-panel ${adminUserActiveTab === "daftar-user" ? "is-active" : ""}" data-admin-user-tab-panel="daftar-user" ${adminUserActiveTab === "daftar-user" ? "" : "hidden"}>
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
      </section>

      <section class="admin-user-tab-panel ${adminUserActiveTab === "tambah-manual" ? "is-active" : ""}" data-admin-user-tab-panel="tambah-manual" ${adminUserActiveTab === "tambah-manual" ? "" : "hidden"}>
        <div class="kelas-bayangan-head admin-user-create-head">
          <div>
            <span class="dashboard-eyebrow">Tambah User</span>
            <h2>Tambah Manual</h2>
            <p>Pilih sumber data atau isi manual untuk menambahkan akun baru.</p>
          </div>
        </div>

        <div class="admin-user-create-grid">
          <label class="form-group">
            <span>Role</span>
            <select id="newUserRole" onchange="handleAdminRoleSourceChange(); fillAdminUserFromSource()">
              ${USER_ROLES.map(role => `<option value="${role}">${role}</option>`).join("")}
            </select>
          </label>
          <label class="form-group">
            <span>Sumber data</span>
            <select id="newUserSource" onchange="fillAdminUserFromSource()">
              <option value="">Manual</option>
            </select>
          </label>
          <label class="form-group">
            <span>Nama</span>
            <input id="newUserName" oninput="document.getElementById('newUserSource').value=''; document.getElementById('newUserUsername').value = makeUsernameFromName(this.value)">
          </label>
          <label class="form-group">
            <span>Username</span>
            <input id="newUserUsername">
          </label>
          <label class="form-group">
            <span>Password</span>
            <input id="newUserPassword" value="${DEFAULT_USER_PASSWORD}">
          </label>
        </div>

        <div class="kelas-bayangan-actions admin-user-create-actions">
          <button class="btn-primary" onclick="createUser()">Tambah User</button>
        </div>
      </section>
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
      <div class="dashboard-card-lite admin-hierarchy-note">
        Form tambah manual dipindahkan ke menu <strong>User</strong> agar menu hirarki fokus pada koordinator dan ringkasan role.
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
        rebuildAdminGuruCaches();
      },
      onUserData: rows => {
        semuaDataAdminUser = rows;
        rebuildAdminUserCaches();
      },
      onSiswaData: rows => {
        semuaDataAdminSiswa = rows;
        rebuildAdminSiswaCaches();
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
        rebuildAdminPresenceCaches();
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
        rebuildAdminPresenceCaches();
        requestRenderAdminUsersState({ presenceOnly: true });
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
    rebuildAdminGuruCaches();
    hasSyncedGuruDerivedUsernames = false;
    ensureGuruDerivedUsernames();
    requestRenderAdminUsersState();
  });

  unsubscribeAdminUser = documentsApi.collection("users").orderBy("role").onSnapshot(snapshot => {
    semuaDataAdminUser = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    rebuildAdminUserCaches();
    ensureGuruDerivedUsernames();
    requestRenderAdminUsersState();
  });

  if (includeSiswa) {
    const siswaQuery = typeof getSemesterCollectionQuery === "function"
      ? getSemesterCollectionQuery("siswa", "nama")
      : documentsApi.collection("siswa").orderBy("nama");
    unsubscribeAdminSiswa = siswaQuery.onSnapshot(snapshot => {
      semuaDataAdminSiswa = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      rebuildAdminSiswaCaches();
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
    rebuildAdminPresenceCaches();
    requestRenderAdminUsersState({ presenceOnly: true });
  });
}

function updateAdminPresenceSummaryDom() {
  const html = renderAdminPresenceSummaryHtml();
  const summaryNodes = document.querySelectorAll(".admin-presence-summary");
  if (summaryNodes.length === 0) return;
  summaryNodes.forEach(node => {
    if (node.outerHTML !== html) node.outerHTML = html;
  });
}

function renderAdminUsersState(options = {}) {
  const presenceOnly = Boolean(options.presenceOnly);
  const userBody = document.getElementById("adminUserBody");
  if (userBody) {
    const nextUserRowsHtml = renderAdminUserRows();
    if (userBody.innerHTML !== nextUserRowsHtml) userBody.innerHTML = nextUserRowsHtml;
  }

  if (document.getElementById("newUserRole")) {
    handleAdminRoleSourceChange(false);
  }

  if (presenceOnly) {
    updateAdminPresenceSummaryDom();
    return;
  }

  const hierarchy = document.getElementById("adminHierarchySections");
  if (hierarchy) {
    if (isInteractingAdminHierarchyUi) captureAdminKoordinatorDraft();
    handleAdminRoleSourceChange(false);
    const nextHierarchyHtml = [
      renderAdminKoordinatorPanel(),
      ...USER_ROLES.map(renderAdminHierarchySection)
    ].join("");
    if (hierarchy.innerHTML !== nextHierarchyHtml) hierarchy.innerHTML = nextHierarchyHtml;
  }

  updateAdminPresenceSummaryDom();
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
  const users = getAdminUsersByRole(role);
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
    const linkedGuru = String(resolved.user?.kode_guru || "").trim()
      ? null
      : resolveGuruForManualUserInput({
          name: resolved.user?.nama || "",
          username: resolved.user?.username || resolved.user?.id || ""
        });
    await getAdminUsersDocumentsApi().collection("users").doc(targetId).set({
      ...(resolved.user || {}),
      password,
      role,
      kode_guru: linkedGuru?.kode_guru || resolved.user?.kode_guru || "",
      nip: linkedGuru?.nip || resolved.user?.nip || "",
      sumber: linkedGuru ? "manual-guru" : (resolved.user?.sumber || ""),
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

  const payload = buildManualUserPayload({
    role,
    name,
    username,
    password
  });

  await getAdminUsersDocumentsApi().collection("users").doc(makeUserDocId(username)).set(payload, { merge: true });
  Swal.fire(
    "Tersimpan",
    payload.kode_guru ? "Pengguna sudah ditambahkan dan disambungkan ke data guru." : "Pengguna sudah ditambahkan.",
    "success"
  );
}

async function createUser() {
  return addHierarchyUser();
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
