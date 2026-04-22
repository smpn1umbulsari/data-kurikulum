(function initDashboardModuleLoader(global) {
  if (global.DashboardModuleLoader) return;

  const loadedScripts = new Set();
  const scriptPromises = new Map();

  function normalizePath(path) {
    return String(path || "").trim();
  }

  function hasScript(path) {
    const normalized = normalizePath(path);
    if (!normalized) return true;
    if (loadedScripts.has(normalized)) return true;
    return Array.from(global.document?.scripts || []).some(script => {
      const src = String(script?.getAttribute?.("src") || script?.src || "");
      return src.includes(normalized);
    });
  }

  function loadScript(path) {
    const normalized = normalizePath(path);
    if (!normalized || hasScript(normalized)) {
      loadedScripts.add(normalized);
      return Promise.resolve(normalized);
    }
    if (scriptPromises.has(normalized)) return scriptPromises.get(normalized);

    const promise = new Promise((resolve, reject) => {
      const script = global.document.createElement("script");
      script.src = normalized;
      script.async = false;
      script.onload = () => {
        loadedScripts.add(normalized);
        resolve(normalized);
      };
      script.onerror = () => {
        scriptPromises.delete(normalized);
        reject(new Error(`Gagal memuat script ${normalized}`));
      };
      global.document.body.appendChild(script);
    });

    scriptPromises.set(normalized, promise);
    return promise;
  }

  async function loadMany(paths = []) {
    const list = Array.isArray(paths) ? paths.map(normalizePath).filter(Boolean) : [];
    for (const path of list) {
      await loadScript(path);
    }
    return list;
  }

  global.DashboardModuleLoader = {
    hasScript,
    loadScript,
    loadMany
  };
})(window);
