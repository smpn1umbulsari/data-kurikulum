(function initAppLoading(global) {
  const activeKeys = new Set();

  function ensureOverlay() {
    let overlay = global.document.getElementById("appLoadingOverlay");
    if (overlay) return overlay;

    overlay = global.document.createElement("div");
    overlay.id = "appLoadingOverlay";
    overlay.className = "app-loading-overlay";
    overlay.innerHTML = `
      <div class="app-loading-card">
        <div class="app-loading-spinner" aria-hidden="true"></div>
        <strong>Memproses data</strong>
        <span>Mohon tunggu sebentar.</span>
      </div>
    `;
    global.document.body.appendChild(overlay);
    return overlay;
  }

  function updateOverlay(title, message) {
    const overlay = ensureOverlay();
    const titleEl = overlay.querySelector("strong");
    const messageEl = overlay.querySelector("span");
    if (titleEl) titleEl.textContent = title || "Memproses data";
    if (messageEl) messageEl.textContent = message || "Mohon tunggu sebentar.";
    const visible = activeKeys.size > 0;
    overlay.style.display = visible ? "flex" : "none";
    global.document.body?.classList.toggle("app-loading-active", visible);
  }

  global.AppLoading = {
    ensure: ensureOverlay,
    set(key, isActive, options = {}) {
      const normalizedKey = String(key || "default");
      if (isActive) activeKeys.add(normalizedKey);
      else activeKeys.delete(normalizedKey);
      updateOverlay(options.title, options.message);
    }
  };
})(window);
