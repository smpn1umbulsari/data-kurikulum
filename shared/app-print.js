(function initAppPrint(global) {
  if (global.AppPrint) return;

  function defaultPopupWarning(title, message) {
    if (global.Swal?.fire) global.Swal.fire(title, message, "warning");
  }

  function schedulePrint(printWindow, options = {}) {
    if (options.autoPrint === false || !printWindow) return;

    let hasPrinted = false;
    const printDelayMs = Number(options.printDelayMs) || 400;
    const fallbackDelayMs = Number(options.fallbackDelayMs) || 900;

    const triggerPrint = () => {
      if (hasPrinted) return;
      hasPrinted = true;
      try {
        printWindow.focus();
      } catch {}
      global.setTimeout(() => {
        try {
          printWindow.print();
        } catch {}
      }, printDelayMs);
    };

    try {
      if (typeof printWindow.addEventListener === "function") {
        printWindow.addEventListener("load", triggerPrint, { once: true });
      }
    } catch {}

    global.setTimeout(triggerPrint, fallbackDelayMs);
  }

  global.AppPrint = {
    openHtml(html, options = {}) {
      const printWindow = global.open("", "_blank");
      if (!printWindow) {
        defaultPopupWarning(
          options.popupBlockedTitle || "Popup diblokir",
          options.popupBlockedMessage || "Izinkan popup browser untuk export PDF."
        );
        return null;
      }

      if (options.documentTitle) {
        try {
          printWindow.document.title = options.documentTitle;
        } catch {}
      }

      try {
        printWindow.document.open();
        printWindow.document.write(String(html || ""));
        printWindow.document.close();
        printWindow.focus();
      } catch (error) {
        try {
          printWindow.close();
        } catch {}
        throw error;
      }

      schedulePrint(printWindow, options);
      return printWindow;
    }
  };
})(window);
