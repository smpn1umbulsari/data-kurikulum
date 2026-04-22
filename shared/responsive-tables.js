(function initResponsiveTables(global) {
  if (global.ResponsiveTables) return;

  const TABLE_SELECTOR = ".content table, .preview-modal table";
  let observer = null;
  let scheduled = false;

  function textOf(element) {
    return String(element?.textContent || "").replace(/\s+/g, " ").trim();
  }

  function getHeaderLabels(table) {
    const headerCells = Array.from(table.querySelectorAll("thead tr:last-child th"));
    if (headerCells.length) return headerCells.map((cell, index) => textOf(cell) || `Kolom ${index + 1}`);

    const firstRowCells = Array.from(table.querySelectorAll("tr:first-child th, tr:first-child td"));
    return firstRowCells.map((cell, index) => textOf(cell) || `Kolom ${index + 1}`);
  }

  function enhanceTable(table) {
    if (!table || table.dataset.responsiveReady === "true") return;
    if (table.classList.contains("nilai-table")) {
      table.classList.add("nilai-grid-table");
      table.dataset.responsiveReady = "true";
      return;
    }
    table.classList.add("plain-mobile-table");
    table.dataset.responsiveReady = "true";
  }

  function enhanceAll() {
    scheduled = false;
    global.document?.querySelectorAll(TABLE_SELECTOR).forEach(enhanceTable);
  }

  function scheduleEnhance() {
    if (scheduled) return;
    scheduled = true;
    global.requestAnimationFrame?.(enhanceAll) || global.setTimeout(enhanceAll, 0);
  }

  function init() {
    scheduleEnhance();
    if (observer) observer.disconnect();
    observer = new MutationObserver(scheduleEnhance);
    const target = global.document?.getElementById("content") || global.document?.body;
    if (target) observer.observe(target, { childList: true, subtree: true });
  }

  global.ResponsiveTables = {
    enhanceAll,
    init
  };

  if (global.document?.readyState === "loading") {
    global.document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})(window);
