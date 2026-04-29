(function initAsesmenRuangService(global) {
  if (global.AsesmenRuangService) return;

  function subscribeSiswa(onData) {
    return global.listenSiswa(onData);
  }

  function loadPembagianRuang(currentUnsubscribe, handlers = {}) {
    if (typeof currentUnsubscribe === "function") currentUnsubscribe();
    return subscribeSiswa(data => {
      handlers.onData?.(data);
      handlers.onRender?.();
    });
  }

  function loadAdministrasi(currentUnsubscribe, handlers = {}) {
    if (typeof currentUnsubscribe === "function") currentUnsubscribe();
    if (typeof global.loadKepalaSekolahTtdSettings === "function") {
      global.loadKepalaSekolahTtdSettings().then(() => {
        handlers.onRender?.();
      });
    }
    return subscribeSiswa(data => {
      handlers.onData?.(data);
      handlers.onRender?.();
    });
  }

  global.AsesmenRuangService = {
    subscribeSiswa,
    loadPembagianRuang,
    loadAdministrasi
  };
})(window);
