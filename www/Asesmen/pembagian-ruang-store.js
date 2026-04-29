(function initAsesmenRuangStore(global) {
  if (global.AsesmenRuangStore) return;

  function createLevelSettings(mode = "setengah") {
    return {
      enabled: true,
      mode,
      order: "az",
      roomRanges: [{ start: "", end: "" }, { start: "", end: "" }],
      manualCounts: []
    };
  }

  function cloneLevelSettings(settings = createLevelSettings()) {
    return {
      enabled: settings.enabled !== false,
      mode: settings.mode,
      order: settings.order,
      roomRanges: Array.isArray(settings.roomRanges) ? settings.roomRanges.map(range => ({ ...range })) : [{ start: "", end: "" }, { start: "", end: "" }],
      manualCounts: Array.isArray(settings.manualCounts) ? [...settings.manualCounts] : []
    };
  }

  function syncManualCountLength(settings, jumlahRuangUjian) {
    const safeCount = Math.min(Math.max(Number(jumlahRuangUjian) || 1, 1), 99);
    while (settings.manualCounts.length < safeCount) settings.manualCounts.push("");
    if (settings.manualCounts.length > safeCount) settings.manualCounts.length = safeCount;
    return settings;
  }

  function sanitizeLevelSettings(settings = {}, options = {}) {
    const fallbackMode = ["manual", "20siswa", "setengah"].includes(options.fallbackMode) ? options.fallbackMode : "setengah";
    const roomRanges = Array.isArray(settings.roomRanges) ? settings.roomRanges : [];
    const sanitized = {
      enabled: settings.enabled !== false,
      mode: ["manual", "20siswa", "setengah"].includes(settings.mode) ? settings.mode : fallbackMode,
      order: settings.order === "za" ? "za" : "az",
      roomRanges: [0, 1].map(index => {
        const range = roomRanges[index] || {};
        return {
          start: String(range.start ?? "").trim(),
          end: String(range.end ?? "").trim()
        };
      }),
      manualCounts: Array.isArray(settings.manualCounts)
        ? settings.manualCounts.map(value => String(value ?? "").trim())
        : []
    };
    return syncManualCountLength(sanitized, options.jumlahRuangUjian);
  }

  function load(storageKey, defaults = {}) {
    try {
      const raw = global.localStorage.getItem(storageKey);
      if (!raw) return null;
      const saved = JSON.parse(raw);
      const jumlahRuangUjian = Math.min(Math.max(Number(saved?.jumlahRuangUjian) || defaults.jumlahRuangUjian || 1, 1), 99);
      const pembagianKelasAsesmen = ["manual", "20siswa", "setengah"].includes(saved?.pembagianKelasAsesmen)
        ? saved.pembagianKelasAsesmen
        : (defaults.pembagianKelasAsesmen || "setengah");
      const draftPembagianKelasAsesmen = ["manual", "20siswa", "setengah"].includes(saved?.draftPembagianKelasAsesmen)
        ? saved.draftPembagianKelasAsesmen
        : pembagianKelasAsesmen;

      const levelSettings = {};
      const draftLevelSettings = {};
      [7, 8, 9].forEach(level => {
        const fallbackLevel = defaults.asesmenLevelSettings?.[level] || createLevelSettings(pembagianKelasAsesmen);
        levelSettings[level] = sanitizeLevelSettings(
          saved?.asesmenLevelSettings?.[level] || saved?.asesmenLevelSettings?.[String(level)] || fallbackLevel,
          { fallbackMode: pembagianKelasAsesmen, jumlahRuangUjian }
        );
        draftLevelSettings[level] = sanitizeLevelSettings(
          saved?.draftAsesmenLevelSettings?.[level] || saved?.draftAsesmenLevelSettings?.[String(level)] || levelSettings[level],
          { fallbackMode: draftPembagianKelasAsesmen, jumlahRuangUjian }
        );
      });

      const appliedLevels = Array.isArray(saved?.appliedLevels)
        ? saved.appliedLevels.map(level => String(level || "").trim()).filter(level => ["7", "8", "9"].includes(level))
        : [];

      return {
        jumlahRuangUjian,
        draftJumlahRuangUjian: Math.min(Math.max(Number(saved?.draftJumlahRuangUjian) || jumlahRuangUjian, 1), 99),
        pembagianKelasAsesmen,
        draftPembagianKelasAsesmen,
        asesmenLevelSettings: levelSettings,
        draftAsesmenLevelSettings: draftLevelSettings,
        appliedLevels
      };
    } catch (error) {
      console.error("Gagal memuat pengaturan pembagian ruang asesmen", error);
      return null;
    }
  }

  function save(storageKey, state = {}) {
    const payload = {
      jumlahRuangUjian: Math.min(Math.max(Number(state.jumlahRuangUjian) || 1, 1), 99),
      draftJumlahRuangUjian: Math.min(Math.max(Number(state.draftJumlahRuangUjian) || state.jumlahRuangUjian || 1, 1), 99),
      pembagianKelasAsesmen: ["manual", "20siswa", "setengah"].includes(state.pembagianKelasAsesmen) ? state.pembagianKelasAsesmen : "setengah",
      draftPembagianKelasAsesmen: ["manual", "20siswa", "setengah"].includes(state.draftPembagianKelasAsesmen) ? state.draftPembagianKelasAsesmen : (state.pembagianKelasAsesmen || "setengah"),
      appliedLevels: Array.isArray(state.appliedLevels) ? state.appliedLevels : [],
      asesmenLevelSettings: {},
      draftAsesmenLevelSettings: {}
    };

    [7, 8, 9].forEach(level => {
      payload.asesmenLevelSettings[level] = sanitizeLevelSettings(state.asesmenLevelSettings?.[level], {
        fallbackMode: payload.pembagianKelasAsesmen,
        jumlahRuangUjian: payload.jumlahRuangUjian
      });
      payload.draftAsesmenLevelSettings[level] = sanitizeLevelSettings(state.draftAsesmenLevelSettings?.[level], {
        fallbackMode: payload.draftPembagianKelasAsesmen,
        jumlahRuangUjian: payload.jumlahRuangUjian
      });
    });

    global.localStorage.setItem(storageKey, JSON.stringify(payload));
    return payload;
  }

  global.AsesmenRuangStore = {
    createLevelSettings,
    cloneLevelSettings,
    syncManualCountLength,
    sanitizeLevelSettings,
    load,
    save
  };
})(window);
