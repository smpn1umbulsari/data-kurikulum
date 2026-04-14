(function initSpreadsheetLibs(global) {
  if (global.SpreadsheetLibs) return;

  const XLSX_SRC = "https://cdn.jsdelivr.net/npm/xlsx/dist/xlsx.full.min.js";
  const EXCELJS_SRC = "https://cdn.jsdelivr.net/npm/exceljs/dist/exceljs.min.js";
  let xlsxPromise = null;
  let excelJsPromise = null;

  function loadScript(src, globalKey) {
    if (global[globalKey]) return Promise.resolve(global[globalKey]);
    const existing = Array.from(global.document.scripts || []).find(script => script.src === src);
    if (existing && !existing.hasAttribute("data-spreadsheet-loading")) {
      return Promise.resolve(global[globalKey]);
    }

    const script = global.document.createElement("script");
    script.src = src;
    script.async = true;
    script.setAttribute("data-spreadsheet-loading", "true");
    return new Promise((resolve, reject) => {
      script.onload = () => resolve(global[globalKey]);
      script.onerror = () => reject(new Error(`Gagal memuat spreadsheet library: ${src}`));
      global.document.head.appendChild(script);
    });
  }

  async function ensure(options = {}) {
    if (!xlsxPromise) xlsxPromise = loadScript(XLSX_SRC, "XLSX");
    await xlsxPromise;

    if (options.needsExcelJs) {
      if (!excelJsPromise) excelJsPromise = loadScript(EXCELJS_SRC, "ExcelJS");
      await excelJsPromise;
    }

    return {
      XLSX: global.XLSX,
      ExcelJS: global.ExcelJS
    };
  }

  global.SpreadsheetLibs = { ensure };
  global.ensureSpreadsheetLibraries = ensure;
})(window);
