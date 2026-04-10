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

  function loadRealtime(page, options = {}) {
    options.clearListeners?.();
    options.setCurrentPage?.(page || "");
    options.setReadyState?.(getDefaultReadyState());
    options.renderLoading?.();

    const render = () => options.renderActivePage?.(page);
    const siswaQuery = typeof global.getSemesterCollectionQuery === "function"
      ? global.getSemesterCollectionQuery("siswa", "nama")
      : db.collection("siswa").orderBy("nama");
    const kelasQuery = typeof global.getSemesterCollectionQuery === "function"
      ? global.getSemesterCollectionQuery("kelas")
      : db.collection("kelas");

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
      mapel: db.collection("mapel_bayangan").orderBy("kode_mapel").onSnapshot(snapshot => {
        options.onMapel?.(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        options.markReady?.("mapel");
        render();
      }),
      mengajar: db.collection("mengajar_bayangan").onSnapshot(snapshot => {
        options.onMengajar?.(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        options.markReady?.("mengajar");
        render();
      }),
      guru: db.collection("guru").orderBy("kode_guru").onSnapshot(snapshot => {
        options.onGuru?.(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        options.markReady?.("guru");
        render();
      }),
      nilai: db.collection("nilai").onSnapshot(snapshot => {
        const rows = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(item => typeof global.isActiveTermDoc === "function" ? global.isActiveTermDoc(item) : true);
        options.onNilai?.(rows);
        options.markReady?.("nilai");
        render();
      }),
      kehadiran: db.collection("kehadiran_siswa").onSnapshot(snapshot => {
        const rows = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(item => typeof global.isActiveTermDoc === "function" ? global.isActiveTermDoc(item) : true);
        options.onKehadiran?.(rows);
        options.markReady?.("kehadiran");
        render();
      }),
      rekap: db.collection("kehadiran_rekap_siswa").onSnapshot(snapshot => {
        const rows = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(item => typeof global.isActiveTermDoc === "function" ? global.isActiveTermDoc(item) : true);
        options.onRekap?.(rows);
        options.markReady?.("rekap");
        render();
      })
    };
  }

  global.WaliKelasService = {
    getDefaultReadyState,
    loadRealtime
  };
})(window);
