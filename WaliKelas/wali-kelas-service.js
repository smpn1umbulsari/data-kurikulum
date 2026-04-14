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
    let renderFrameId = 0;
    const scheduleRender = () => {
      if (renderFrameId) return;
      const frame = typeof global.requestAnimationFrame === "function"
        ? global.requestAnimationFrame
        : callback => global.setTimeout(callback, 0);
      renderFrameId = frame(() => {
        renderFrameId = 0;
        options.renderActivePage?.(page);
      });
    };
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
        scheduleRender();
      }),
      kelas: kelasQuery.onSnapshot(snapshot => {
        options.onKelas?.(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        options.markReady?.("kelas");
        scheduleRender();
      }),
      mapel: documentsApi.collection("mapel_bayangan").orderBy("kode_mapel").onSnapshot(snapshot => {
        options.onMapel?.(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        options.markReady?.("mapel");
        scheduleRender();
      }),
      mengajar: documentsApi.collection("mengajar_bayangan").onSnapshot(snapshot => {
        options.onMengajar?.(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        options.markReady?.("mengajar");
        scheduleRender();
      }),
      guru: documentsApi.collection("guru").orderBy("kode_guru").onSnapshot(snapshot => {
        options.onGuru?.(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        options.markReady?.("guru");
        scheduleRender();
      }),
      nilai: documentsApi.collection("nilai").onSnapshot(snapshot => {
        const rows = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(item => typeof global.isActiveTermDoc === "function" ? global.isActiveTermDoc(item) : true);
        options.onNilai?.(rows);
        options.markReady?.("nilai");
        scheduleRender();
      }),
      kehadiran: documentsApi.collection("kehadiran_siswa").onSnapshot(snapshot => {
        const rows = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(item => typeof global.isActiveTermDoc === "function" ? global.isActiveTermDoc(item) : true);
        options.onKehadiran?.(rows);
        options.markReady?.("kehadiran");
        scheduleRender();
      }),
      rekap: documentsApi.collection("kehadiran_rekap_siswa").onSnapshot(snapshot => {
        const rows = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(item => typeof global.isActiveTermDoc === "function" ? global.isActiveTermDoc(item) : true);
        options.onRekap?.(rows);
        options.markReady?.("rekap");
        scheduleRender();
      }),
      source: documentsApi.collection("settings").doc("kelas_bayangan_source").onSnapshot(snapshot => {
        options.onSource?.(snapshot.exists ? snapshot.data() : {});
        scheduleRender();
      })
    };
  }

  global.WaliKelasService = {
    getDefaultReadyState,
    loadRealtime
  };
})(window);
