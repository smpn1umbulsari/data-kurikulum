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
    },
    async run(key, options = {}, task) {
      const normalizedKey = String(key || "default");
      this.set(normalizedKey, true, options);
      try {
        return await task?.();
      } finally {
        this.set(normalizedKey, false, options);
      }
    }
  };

  if (global.Swal && typeof global.Swal.fire === "function" && !global.Swal.__appLoadingOverlayPatched) {
    const originalFire = global.Swal.fire.bind(global.Swal);
    const originalClose = typeof global.Swal.close === "function" ? global.Swal.close.bind(global.Swal) : null;
    let currentLoadingTitle = "";

    function isSwalLoadingDialog(options = {}) {
      const didOpen = options?.didOpen;
      return typeof didOpen === "function" && String(didOpen).includes("Swal.showLoading");
    }

    function getSwalLoadingMeta(options = {}) {
      const title = String(options.title || "Memproses data").trim() || "Memproses data";
      let message = "Mohon tunggu sebentar.";
      if (typeof options.text === "string" && options.text.trim()) {
        message = options.text.trim();
      } else if (typeof options.html === "string" && options.html.trim()) {
        message = options.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() || message;
      }
      return { title, message };
    }

    global.Swal.showLoading = function showLoading() {
      const title = currentLoadingTitle || "Memproses data";
      global.AppLoading?.set("swal-loading", true, { title, message: "Mohon tunggu sebentar." });
    };

    global.Swal.fire = function fire(...args) {
      const options = typeof args[0] === "object" && args[0] ? args[0] : { title: args[0], html: args[1], icon: args[2] };
      if (isSwalLoadingDialog(options)) {
        const meta = getSwalLoadingMeta(options);
        currentLoadingTitle = meta.title;
        global.AppLoading?.set("swal-loading", true, meta);
        return Promise.resolve({ isConfirmed: true, isDismissed: false, isDenied: false });
      }

      if (currentLoadingTitle) {
        currentLoadingTitle = "";
        global.AppLoading?.set("swal-loading", false);
      }

      return originalFire(...args);
    };

    global.Swal.close = function close(...args) {
      currentLoadingTitle = "";
      global.AppLoading?.set("swal-loading", false);
      return originalClose ? originalClose(...args) : undefined;
    };

    global.Swal.__appLoadingOverlayPatched = true;
  }
})(window);
