(function initDashboardHomeData(global) {
  if (global.DashboardHomeData) return;

  const DEFAULT_CACHE_TTL_MS = 15000;
  const COLLECTION_CACHE_TTL_MS = {
    guru: 60000,
    kelas: 30000,
    siswa: 30000,
    mapel: 60000,
    mapel_bayangan: 60000,
    mengajar: 30000,
    mengajar_bayangan: 30000,
    nilai: 10000,
    tugas_tambahan: 60000
  };
  const cache = new Map();
  const inflight = new Map();

  function getDocumentsApi() {
    return global.SupabaseDocuments;
  }

  function getActiveSemesterCacheSuffix() {
    try {
      const semester = JSON.parse(global.localStorage?.getItem("appSemester") || "{}");
      return String(semester?.id || semester?.active_id || semester?.label || "default").trim() || "default";
    } catch {
      return "default";
    }
  }

  function cloneRows(rows = []) {
    return rows.map(row => ({ ...row }));
  }

  function getCachedRows(cacheKey) {
    const entry = cache.get(cacheKey);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      cache.delete(cacheKey);
      return null;
    }
    return cloneRows(entry.rows);
  }

  function setCachedRows(cacheKey, rows, ttlMs) {
    cache.set(cacheKey, {
      rows: cloneRows(rows),
      expiresAt: Date.now() + Math.max(250, Number(ttlMs) || DEFAULT_CACHE_TTL_MS)
    });
    return cloneRows(rows);
  }

  async function withCache(cacheKey, loader, options = {}) {
    const useCache = options.useCache !== false;
    if (useCache) {
      const cached = getCachedRows(cacheKey);
      if (cached) return cached;
      const existing = inflight.get(cacheKey);
      if (existing) return cloneRows(await existing);
    }

    const task = Promise.resolve().then(loader);
    if (useCache) inflight.set(cacheKey, task);

    try {
      const rows = await task;
      return useCache ? setCachedRows(cacheKey, rows, options.ttlMs) : cloneRows(rows);
    } finally {
      if (useCache) inflight.delete(cacheKey);
    }
  }

  async function loadCollectionRows(collectionName, options = {}) {
    const query = typeof options.getCollectionQuery === "function"
      ? options.getCollectionQuery(collectionName)
      : getDocumentsApi()?.collection?.(collectionName);
    const ttlMs = options.ttlMs ?? COLLECTION_CACHE_TTL_MS[collectionName] ?? DEFAULT_CACHE_TTL_MS;
    const cacheSuffix = options.cacheSuffix ?? (["siswa", "kelas"].includes(collectionName) ? getActiveSemesterCacheSuffix() : "");
    const cacheKey = cacheSuffix ? `collection:${collectionName}:${cacheSuffix}` : `collection:${collectionName}`;

    return withCache(cacheKey, async () => {
      const snapshot = await query.get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }, {
      useCache: options.useCache,
      ttlMs
    });
  }

  async function loadPresenceRows(limit = 25, options = {}) {
    const documentsApi = getDocumentsApi();
    return withCache(`presence:${limit}`, async () => {
      if (documentsApi?.client?.from && documentsApi.table) {
        const { data, error } = await documentsApi.client
          .from(documentsApi.table)
          .select("id,data,updated_at")
          .eq("collection_path", "user_presence")
          .order("updated_at", { ascending: false })
          .limit(limit);

        if (!error) return (data || []).map(row => ({ id: row.id, ...(row.data || {}) }));
      }

      const snapshot = await documentsApi.collection("user_presence").orderBy("last_seen_at", "desc").limit(limit).get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }, {
      useCache: options.useCache,
      ttlMs: options.ttlMs ?? 5000
    });
  }

  async function loadHomeCollections(options = {}) {
    const getCollectionQuery = options.getCollectionQuery;
    const loaders = {
      guru: () => loadCollectionRows("guru", { getCollectionQuery }),
      siswa: () => loadCollectionRows("siswa", { getCollectionQuery }),
      kelas: () => loadCollectionRows("kelas", { getCollectionQuery }),
      mapelAsli: () => loadCollectionRows("mapel"),
      mengajarAsli: () => loadCollectionRows("mengajar"),
      mapelBayangan: () => loadCollectionRows("mapel_bayangan"),
      mengajarBayangan: () => loadCollectionRows("mengajar_bayangan"),
      nilai: () => loadCollectionRows("nilai"),
      tugas: () => loadCollectionRows("tugas_tambahan"),
      presenceRows: () => loadPresenceRows(25)
    };

    const entries = await Promise.all(
      Object.entries(loaders).map(async ([key, loader]) => [key, await loader()])
    );
    return Object.fromEntries(entries);
  }

  function invalidate(keyPrefix = "") {
    const normalized = String(keyPrefix || "").trim();
    if (!normalized) {
      cache.clear();
      inflight.clear();
      return;
    }

    [...cache.keys()].forEach(key => {
      if (key.startsWith(normalized)) cache.delete(key);
    });
    [...inflight.keys()].forEach(key => {
      if (key.startsWith(normalized)) inflight.delete(key);
    });
  }

  global.DashboardHomeData = {
    loadCollectionRows,
    loadPresenceRows,
    loadHomeCollections,
    invalidate
  };
})(window);
