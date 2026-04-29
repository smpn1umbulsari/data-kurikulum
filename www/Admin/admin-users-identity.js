(function initAdminUsersIdentity(global) {
  if (global.AdminUsersIdentity) return;

  function makeUsernameFromName(value = "") {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[^a-z0-9._-]/g, "");
  }

  function stripGuruTitles(value = "") {
    if (typeof global.stripGuruTitlesFromName === "function") return global.stripGuruTitlesFromName(value);
    return String(value || "")
      .replace(/\b(Drs?|Dra|Prof|Hj?|Ir)\.?(?=\s|,|$)/gi, " ")
      .replace(/\b(S|M|D)\.?\s?(Pd|Si|Ag|Kom|H|E|Ak|Ikom|Hum|Kes|Kep|Farm|T|Sc|A)\.?(?=\s|,|$)/gi, " ")
      .replace(/,\s*/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function getGuruName(guru = {}) {
    if (typeof global.formatNamaGuru === "function") return global.formatNamaGuru(guru);
    return [guru?.gelar_depan, guru?.nama, guru?.gelar_belakang].filter(Boolean).join(" ") || guru?.nama || "";
  }

  function getGuruUsernameName(guru = {}) {
    const nama = stripGuruTitles(String(guru?.nama || "").trim());
    if (nama) return nama;
    return stripGuruTitles(guru?.nama_lengkap || getGuruName(guru));
  }

  function makeGuruUsername(guru = {}) {
    const nip = String(guru?.nip || "").trim();
    const normalizedNip = nip === "-" ? "" : nip;
    return normalizedNip || makeUsernameFromName(getGuruUsernameName(guru));
  }

  function makeUserDocId(username) {
    return makeUsernameFromName(username);
  }

  function getUserByGuru(guru = {}, users = []) {
    const kodeGuru = String(guru?.kode_guru || "").trim();
    if (kodeGuru) {
      const byKode = users.find(item => String(item.kode_guru || "").trim() === kodeGuru);
      if (byKode) return byKode;
    }

    const aliases = [
      makeGuruUsername(guru),
      makeUsernameFromName(getGuruName(guru)),
      makeUsernameFromName(getGuruUsernameName(guru))
    ]
      .map(value => makeUserDocId(value))
      .filter(Boolean);

    return users.find(item => aliases.includes(makeUserDocId(item.username || item.id))) || null;
  }

  function getAllUsersForGuru(guru = {}, users = [], fallbackUser = null) {
    const kodeGuru = String(guru?.kode_guru || fallbackUser?.kode_guru || "").trim();
    const aliasIds = new Set();
    const primaryUsername = makeGuruUsername(guru);
    if (primaryUsername) aliasIds.add(makeUserDocId(primaryUsername));

    const titledUsername = makeUsernameFromName(getGuruName(guru));
    if (titledUsername) aliasIds.add(makeUserDocId(titledUsername));

    const fallbackId = makeUserDocId(fallbackUser?.username || fallbackUser?.id || "");
    if (fallbackId) aliasIds.add(fallbackId);

    return users.filter(item => {
      const itemId = String(item.id || makeUserDocId(item.username)).trim();
      if (kodeGuru && String(item.kode_guru || "").trim() === kodeGuru) return true;
      return aliasIds.has(itemId);
    });
  }

  function getGuruForAdminUser(user = {}, guruList = [], getGuruByKodeFn = null) {
    const kodeGuru = String(user?.kode_guru || "").trim();
    if (kodeGuru && typeof getGuruByKodeFn === "function") {
      const byKode = getGuruByKodeFn(kodeGuru);
      if (byKode) return byKode;
    }

    const currentId = makeUserDocId(user?.username || user?.id || "");
    const namaUser = stripGuruTitles(String(user?.nama || "").trim());
    const normalizedNamaUser = makeUsernameFromName(namaUser);
    if (!currentId && !normalizedNamaUser) return null;

    return guruList.find(guru => {
      const primaryId = makeUserDocId(makeGuruUsername(guru));
      const titledId = makeUsernameFromName(getGuruName(guru));
      const plainNameId = makeUsernameFromName(getGuruUsernameName(guru));
      return [primaryId, titledId, plainNameId].filter(Boolean).includes(currentId) ||
        (normalizedNamaUser && [primaryId, plainNameId].filter(Boolean).includes(normalizedNamaUser));
    }) || null;
  }

  global.AdminUsersIdentity = {
    makeUsernameFromName,
    stripGuruTitles,
    getGuruName,
    getGuruUsernameName,
    makeGuruUsername,
    makeUserDocId,
    getUserByGuru,
    getAllUsersForGuru,
    getGuruForAdminUser
  };
})(window);
