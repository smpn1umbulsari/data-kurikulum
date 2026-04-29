(function initAppLifecycle(global) {
  if (global.AppLifecycle) return;

  const unsubscribeKeys = [
    "unsubscribe",
    "unsubscribeGuru",
    "unsubscribeGuruMapelOptions",
    "unsubscribeMapel",
    "unsubscribeKelas",
    "unsubscribeKelasGuru",
    "unsubscribeKelasMengajar",
    "unsubscribeKelasSiswa",
    "unsubscribeSiswaKelasOptions",
    "unsubscribeMengajar",
    "unsubscribeMengajarMapel",
    "unsubscribeMengajarKelas",
    "unsubscribeMengajarGuru",
    "unsubscribeMengajarSiswa",
    "unsubscribeMengajarGuruTugasTambahan",
    "unsubscribeTugasTambahan",
    "unsubscribeTugasTambahanGuru",
    "unsubscribeTugasTambahanAssignments",
    "unsubscribeTugasTambahanMengajar",
    "unsubscribeTugasTambahanMapel",
    "unsubscribeTugasTambahanKelas",
    "unsubscribeRekapGuru",
    "unsubscribeRekapMengajar",
    "unsubscribeRekapMapel",
    "unsubscribeRekapTugasTambahan",
    "unsubscribeRekapGuruTugasTambahan",
    "unsubscribeRekapBayanganGuru",
    "unsubscribeRekapBayanganMengajar",
    "unsubscribeRekapBayanganMengajarAsli",
    "unsubscribeRekapBayanganMapel",
    "unsubscribeAsesmenSiswa",
    "unsubscribeAdminGuru",
    "unsubscribeAdminUser",
    "unsubscribeAdminSiswa",
    "unsubscribeNilaiSiswa",
    "unsubscribeNilaiMapel",
    "unsubscribeNilaiMengajar",
    "unsubscribeNilaiData",
    "unsubscribeKelasBayanganSiswa",
    "unsubscribeKelasBayanganKelas",
    "unsubscribeMengajarBayangan",
    "unsubscribeMengajarBayanganAsli",
    "unsubscribeMengajarBayanganMapel",
    "unsubscribeMengajarBayanganGuru"
  ];

  const cleanupCallbacks = [
    "clearWaliKelasListeners",
    "clearCetakRaporListeners",
    "clearAdminRaporListeners",
    "clearAdminSemesterListeners",
    "clearSiswaLulusListeners"
  ];

  function clearNamedSubscriptions() {
    unsubscribeKeys.forEach(key => {
      if (typeof global[key] === "function") {
        global[key]();
      }
      if (key in global) global[key] = null;
    });
  }

  function runCleanupCallbacks() {
    cleanupCallbacks.forEach(name => {
      if (typeof global[name] === "function") {
        global[name]();
      }
    });
  }

  global.AppLifecycle = {
    unsubscribeKeys,
    cleanupCallbacks,
    clearPageSubscriptions() {
      clearNamedSubscriptions();
      runCleanupCallbacks();
    }
  };
})(window);
