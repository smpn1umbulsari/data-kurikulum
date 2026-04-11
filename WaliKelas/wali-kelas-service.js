(function initWaliKelasService(global) {
  if (global.WaliKelasService) return;

  function getDefaultReadyState() {
    return {
      siswa: false,
      kelas: false,
      mapel: false,
      mengajar: false,
      guru: false,
      nilai: false,
      kehadiran: false,
      rekap: false
    };
  }

  function getDocumentsApi() {
    return global.SupabaseDocuments;
  }

  function loadRealtime(page, options = {}) {
    options.clearListeners?.();
    options.setCurrentPage?.(page || "");
    options.setReadyState?.(getDefaultReadyState());
    options.renderLoading?.();

    const documentsApi = getDocumentsApi();
    const render = () => options.renderActivePage?.(page);
    const siswaQuery = typeof global.getSemesterCollectionQuery === "function"
      ? global.getSemesterCollectionQuery("siswa", "nama")
      : documentsApi.collection("siswa").orderBy("nama");
    const kelasQuery = typeof global.getSemesterCollectionQuery === "function"
      ? global.getSemesterCollectionQuery("kelas")
      : documentsApi.collection("kelas");

    return {
      siswa: siswaQuery.onSnapshot(snapshot => {
        options.onSiswa?.(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        options.markReady?.("siswa");
        render();
      }),
      kelas: kelasQuery.onSnapshot(snapshot => {
        options.onKelas?.(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        options.markReady?.("kelas");
        render();
      }),
      mapel: documentsApi.collection("mapel_bayangan").orderBy("kode_mapel").onSnapshot(snapshot => {
        options.onMapel?.(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        options.markReady?.("mapel");
        render();
      }),
      mengajar: documentsApi.collection("mengajar_bayangan").onSnapshot(snapshot => {
        options.onMengajar?.(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        options.markReady?.("mengajar");
        render();
      }),
      guru: documentsApi.collection("guru").orderBy("kode_guru").onSnapshot(snapshot => {
        options.onGuru?.(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        options.markReady?.("guru");
        render();
      }),
      nilai: documentsApi.collection("nilai").onSnapshot(snapshot => {
        const rows = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(item => typeof global.isActiveTermDoc === "function" ? global.isActiveTermDoc(item) : true);
        options.onNilai?.(rows);
        options.markReady?.("nilai");
        render();
      }),
      kehadiran: documentsApi.collection("kehadiran_siswa").onSnapshot(snapshot => {
        const rows = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(item => typeof global.isActiveTermDoc === "function" ? global.isActiveTermDoc(item) : true);
        options.onKehadiran?.(rows);
        options.markReady?.("kehadiran");
        render();
      }),
      rekap: documentsApi.collection("kehadiran_rekap_siswa").onSnapshot(snapshot => {
        const rows = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(item => typeof global.isActiveTermDoc === "function" ? global.isActiveTermDoc(item) : true);
        options.onRekap?.(rows);
        options.markReady?.("rekap");
        render();
      }),
      source: documentsApi.collection("settings").doc("kelas_bayangan_source").onSnapshot(snapshot => {
        options.onSource?.(snapshot.exists ? snapshot.data() : {});
        render();
      })
    };
  }

  global.WaliKelasService = {
    getDefaultReadyState,
    loadRealtime
  };
})(window);
