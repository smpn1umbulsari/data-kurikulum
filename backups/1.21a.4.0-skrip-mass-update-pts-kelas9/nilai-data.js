(function initNilaiData(global) {
  if (global.NilaiData) return;

  const state = {
    siswa: [],
    mapel: [],
    mengajar: [],
    kelas: [],
    nilai: [],
    accessMode: "guru",
    renderFrameId: 0,
    rekapRenderFrameId: 0,
    revisions: {
      siswa: 0,
      mapel: 0,
      mengajar: 0,
      kelas: 0,
      nilai: 0
    }
  };

  const unsubscribers = {
    siswa: null,
    mapel: null,
    mengajar: null,
    kelas: null,
    nilai: null
  };

  function getDocumentsApi() {
    return global.SupabaseDocuments;
  }

  function setRows(key, rows) {
    state[key] = Array.isArray(rows) ? rows : [];
    if (Object.prototype.hasOwnProperty.call(state.revisions, key)) {
      state.revisions[key] += 1;
    }
    return state[key];
  }

  function getRows(key) {
    return Array.isArray(state[key]) ? state[key] : [];
  }

  function closeAll() {
    Object.keys(unsubscribers).forEach(key => {
      if (typeof unsubscribers[key] === "function") unsubscribers[key]();
      unsubscribers[key] = null;
    });
  }

  function scheduleRender(frameKey, callback) {
    if (state[frameKey]) return;
    const raf = typeof global.requestAnimationFrame === "function"
      ? global.requestAnimationFrame.bind(global)
      : handler => global.setTimeout(handler, 0);
    state[frameKey] = raf(() => {
      state[frameKey] = 0;
      callback?.();
    });
  }

  function getSemesterQuery(collectionName, orderField = "") {
    if (typeof global.getSemesterCollectionQuery === "function") {
      return global.getSemesterCollectionQuery(collectionName, orderField);
    }
    const collection = getDocumentsApi().collection(collectionName);
    return orderField ? collection.orderBy(orderField) : collection;
  }

  function subscribeRealtime(renderMode = "input") {
    closeAll();
    const render = renderMode === "rekap"
      ? () => scheduleRender("rekapRenderFrameId", () => global.renderRekapNilaiState?.())
      : () => scheduleRender("renderFrameId", () => global.renderNilaiPageState?.());
    const documentsApi = getDocumentsApi();

    unsubscribers.siswa = getSemesterQuery("siswa", "nama").onSnapshot(snapshot => {
      setRows("siswa", snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      render();
    });
    unsubscribers.mapel = documentsApi.collection("mapel_bayangan").orderBy("kode_mapel").onSnapshot(snapshot => {
      setRows("mapel", snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      render();
    });
    unsubscribers.mengajar = documentsApi.collection("mengajar_bayangan").onSnapshot(snapshot => {
      setRows("mengajar", snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      render();
    });
    unsubscribers.kelas = getSemesterQuery("kelas").onSnapshot(snapshot => {
      setRows("kelas", snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      render();
    });
    unsubscribers.nilai = documentsApi.collection("nilai").onSnapshot(snapshot => {
      const rows = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(item => typeof global.isActiveTermDoc === "function" ? global.isActiveTermDoc(item) : true);
      if (typeof global.setSemuaDataNilai === "function") global.setSemuaDataNilai(rows);
      else setRows("nilai", rows);
      render();
    });
  }

  global.NilaiData = {
    state,
    unsubscribers,
    getDocumentsApi,
    setRows,
    getRows,
    closeAll,
    scheduleRender,
    subscribeRealtime
  };
})(window);
