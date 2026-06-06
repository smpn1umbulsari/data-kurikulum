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

  /**
   * Render the standard 4-panel module layout (Header → Tabs → Toolbar → Content).
   *
   * @param {Object} o
   * @param {string} [o.moduleName]    – base name for auto-generated CSS classes
   * @param {string} [o.pageClass]     – override page-section class (default: `${moduleName}-page`)
   * @param {string} [o.headerClass]   – override header class (default: `${moduleName}-header`)
   * @param {string} [o.tabsClass]     – override tabs nav class (default: `${moduleName}-tabs`)
   * @param {string} [o.toolbarClass]  – override toolbar class (default: `${moduleName}-toolbar`)
   * @param {string} [o.contentClass]  – override content class (default: `${moduleName}-content`)
   * @param {string} [o.eyebrow]       – category label above the title
   * @param {string} [o.title]         – h2 title
   * @param {string} [o.subtitle]      – description paragraph
   * @param {string} [o.headerExtra]   – extra HTML inside the header (after app-page-title)
   * @param {string} [o.tabs]          – inner HTML for the tab nav panel
   * @param {string} [o.tabsLabel]     – aria-label for the tab nav
   * @param {string} [o.afterTabs]     – extra HTML between tabs and toolbar
   * @param {string} [o.toolbar]       – inner HTML for the toolbar panel
   * @param {string} [o.toolbarStyle]  – inline style for the toolbar section
   * @param {string} [o.content]       – inner HTML for the content panel
   * @param {string} [o.contentStyle]  – inline style for the content section
   * @param {string} [o.afterContent]  – extra HTML inside the page section, after the content panel
   * @param {string} [o.modal]         – HTML rendered outside the page section (modals, overlays)
   * @returns {string} complete HTML string
   */
  AppUtils.renderModuleLayout = function renderModuleLayout(o) {
    o = o || {};
    var mn = o.moduleName || "";
    var pc = o.pageClass != null ? o.pageClass : (mn ? mn + "-page" : "");
    var hc = o.headerClass != null ? o.headerClass : (mn ? mn + "-header" : "");
    var tc = o.tabsClass != null ? o.tabsClass : (mn ? mn + "-tabs" : "");
    var tkc = o.toolbarClass != null ? o.toolbarClass : (mn ? mn + "-toolbar" : "");
    var cc = o.contentClass != null ? o.contentClass : (mn ? mn + "-content" : "");

    var html = '<section class="app-page app-page--module' + (pc ? ' ' + pc : '') + '">';

    // Panel 1 – Header
    html += '<header class="app-panel app-panel--header' + (hc ? ' ' + hc : '') + '">';
    html += '<div class="app-page-title">';
    if (o.eyebrow) html += '<span class="dashboard-eyebrow">' + o.eyebrow + '</span>';
    if (o.title) html += '<h2>' + o.title + '</h2>';
    if (o.subtitle) html += '<p>' + o.subtitle + '</p>';
    html += '</div>';
    if (o.headerExtra) html += o.headerExtra;
    html += '</header>';

    // Panel 2 – Tabs
    if (o.tabs) {
      html += '<nav class="app-panel app-panel--tabs module-tabs' + (tc ? ' ' + tc : '') + '" role="tablist" aria-label="' + (o.tabsLabel || ('Navigasi ' + mn)) + '">';
      html += o.tabs;
      html += '</nav>';
    }

    if (o.afterTabs) html += o.afterTabs;

    // Panel 3 – Toolbar
    if (o.toolbar) {
      html += '<section class="app-panel app-panel--toolbar' + (tkc ? ' ' + tkc : '') + '"';
      if (o.toolbarStyle) html += ' style="' + o.toolbarStyle + '"';
      html += '>';
      html += o.toolbar;
      html += '</section>';
    }

    // Panel 4 – Content
    if (o.content) {
      html += '<section class="app-panel app-panel--content' + (cc ? ' ' + cc : '') + '"';
      if (o.contentStyle) html += ' style="' + o.contentStyle + '"';
      html += '>';
      html += o.content;
      html += '</section>';
    }

    if (o.afterContent) html += o.afterContent;

    html += '</section>';

    if (o.modal) html += o.modal;

    return html;
  };

  global.AppUtils = AppUtils;
})(window);
