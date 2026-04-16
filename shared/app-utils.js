(function initAppUtils(global) {
  const AppUtils = global.AppUtils || {};

  AppUtils.escapeHtml = function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  };

  AppUtils.parseKelas = function parseKelas(kelasValue = "") {
    const normalized = String(kelasValue || "").trim().toUpperCase().replace(/\s+/g, "");
    const match = normalized.match(/([7-9])([A-Z]+)$/);
    return {
      tingkat: match ? match[1] : "",
      rombel: match ? match[2] : "",
      kelas: match ? `${match[1]} ${match[2]}` : String(kelasValue || "").trim().toUpperCase()
    };
  };

  AppUtils.getPrimaryKelasParts = function getPrimaryKelasParts(siswa = {}) {
    const asli = AppUtils.parseKelas(siswa.kelas);
    const bayangan = AppUtils.parseKelas(siswa.kelas_bayangan);
    if (bayangan.tingkat === asli.tingkat && /^[A-H]$/.test(bayangan.rombel)) return bayangan;
    if (/^[A-H]$/.test(asli.rombel)) return asli;
    return { tingkat: asli.tingkat, rombel: "", kelas: "" };
  };

  AppUtils.compareStudentPlacement = function compareStudentPlacement(a = {}, b = {}) {
    const asliA = AppUtils.parseKelas(a.kelas);
    const asliB = AppUtils.parseKelas(b.kelas);
    const bayanganA = AppUtils.getPrimaryKelasParts(a);
    const bayanganB = AppUtils.getPrimaryKelasParts(b);

    const asliCompare = String(asliA.rombel || "").localeCompare(String(asliB.rombel || ""), undefined, { sensitivity: "base" });
    if (asliCompare !== 0) return asliCompare;

    const bayanganCompare = String(bayanganA.rombel || "").localeCompare(String(bayanganB.rombel || ""), undefined, { sensitivity: "base" });
    if (bayanganCompare !== 0) return bayanganCompare;

    return String(a.nama || "").localeCompare(String(b.nama || ""), undefined, { sensitivity: "base" });
  };

  AppUtils.setStorageJson = function setStorageJson(key, value) {
    global.localStorage.setItem(key, JSON.stringify(value));
    return value;
  };

  AppUtils.getStorageJson = function getStorageJson(key, fallback) {
    try {
      const raw = global.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  };

  AppUtils.parseDateValue = function parseDateValue(value) {
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value;
    }
    const text = String(value ?? "").trim();
    if (!text) return null;
    const isoDateOnlyMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoDateOnlyMatch) {
      const [, year, month, day] = isoDateOnlyMatch;
      const localDate = new Date(Number(year), Number(month) - 1, Number(day));
      return Number.isNaN(localDate.getTime()) ? null : localDate;
    }
    const parsed = new Date(text);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  AppUtils.formatDateId = function formatDateId(value, options = {}, fallback = "-") {
    const date = AppUtils.parseDateValue(value);
    if (!date) return fallback;
    const hasExplicitDateParts = ["weekday", "day", "month", "year"].some(key => Object.prototype.hasOwnProperty.call(options, key));
    return new Intl.DateTimeFormat("id-ID", {
      ...(hasExplicitDateParts ? {} : {
        day: "2-digit",
        month: "long",
        year: "numeric"
      }),
      ...options
    }).format(date);
  };

  AppUtils.formatDateTimeId = function formatDateTimeId(value, options = {}, fallback = "-") {
    const date = AppUtils.parseDateValue(value);
    if (!date) return fallback;
    return new Intl.DateTimeFormat("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
      ...options
    }).format(date);
  };

  global.AppUtils = AppUtils;
})(window);
