(function initSupabaseDocuments(global) {
  if (global.SupabaseDocuments) return;

  const config = global.supabaseConfig || {};
  const client = global.supabaseClient || (global.supabase?.createClient && config.url && config.anonKey
    ? global.supabase.createClient(config.url, config.anonKey)
    : null);
  const TABLE = config.documentsTable || "app_documents";
  const DEFAULT_COLLECTION_CACHE_TTL_MS = 1200;
  const collectionCachePolicies = new Map();
  const PERSISTED_CACHE_PREFIX = "supabaseDocumentsCache:";
  const IDB_NAME = "guru_spenturi_offline_v1";
  const IDB_VERSION = 1;
  const IDB_COLLECTION_STORE = "collections";
  const collectionCache = new Map();
  const collectionFetches = new Map();
  let idbPromise = null;

  function makeChannelName(prefix, path) {
    const randomId = global.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    return `${prefix}:${String(path || "").replace(/[^a-zA-Z0-9_-]/g, "-")}:${randomId}`;
  }

  function cleanValue(value) {
    if (value instanceof Date) return value.toISOString();
    if (Array.isArray(value)) return value.map(cleanValue);
    if (!value || typeof value !== "object") return value;
    if (typeof value.toDate === "function") return value.toDate().toISOString();
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => [key, cleanValue(item)])
    );
  }

  function compareValue(a, b) {
    const left = a === undefined || a === null ? "" : a;
    const right = b === undefined || b === null ? "" : b;
    if (typeof left === "number" && typeof right === "number") return left - right;
    return String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: "base" });
  }

  function getCollectionCacheKey(collectionPath) {
    return String(collectionPath || "");
  }

  function getCollectionCacheTtl(collectionPath) {
    const cacheKey = getCollectionCacheKey(collectionPath);
    const configured = collectionCachePolicies.get(cacheKey);
    return Math.max(0, Number(configured?.ttlMs ?? DEFAULT_COLLECTION_CACHE_TTL_MS) || DEFAULT_COLLECTION_CACHE_TTL_MS);
  }

  function cloneCollectionRows(rows = []) {
    return rows.map(row => ({
      id: row.id,
      data: { ...(row.data || {}) }
    }));
  }

  function getPersistedCollectionKey(collectionPath) {
    return `${PERSISTED_CACHE_PREFIX}${getCollectionCacheKey(collectionPath)}`;
  }

  function canUseIndexedDb() {
    return Boolean(global.indexedDB);
  }

  function openOfflineDb() {
    if (!canUseIndexedDb()) return Promise.resolve(null);
    if (idbPromise) return idbPromise;
    idbPromise = new Promise(resolve => {
      const request = global.indexedDB.open(IDB_NAME, IDB_VERSION);
      request.onupgradeneeded = event => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(IDB_COLLECTION_STORE)) {
          db.createObjectStore(IDB_COLLECTION_STORE, { keyPath: "collectionPath" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    });
    return idbPromise;
  }

  async function readIndexedCollectionRows(collectionPath) {
    const db = await openOfflineDb();
    if (!db) return null;
    return new Promise(resolve => {
      const transaction = db.transaction(IDB_COLLECTION_STORE, "readonly");
      const store = transaction.objectStore(IDB_COLLECTION_STORE);
      const request = store.get(getCollectionCacheKey(collectionPath));
      request.onsuccess = () => {
        const record = request.result;
        resolve(record && Array.isArray(record.rows) ? cloneCollectionRows(record.rows) : null);
      };
      request.onerror = () => resolve(null);
    });
  }

  async function writeIndexedCollectionRows(collectionPath, rows) {
    const db = await openOfflineDb();
    if (!db) return false;
    return new Promise(resolve => {
      const transaction = db.transaction(IDB_COLLECTION_STORE, "readwrite");
      const store = transaction.objectStore(IDB_COLLECTION_STORE);
      const request = store.put({
        collectionPath: getCollectionCacheKey(collectionPath),
        cachedAt: new Date().toISOString(),
        rows: cloneCollectionRows(rows)
      });
      request.onsuccess = () => resolve(true);
      request.onerror = () => resolve(false);
    });
  }

  function readPersistedCollectionRows(collectionPath) {
    try {
      const parsed = JSON.parse(global.localStorage.getItem(getPersistedCollectionKey(collectionPath)) || "null");
      if (!parsed || !Array.isArray(parsed.rows)) return null;
      return cloneCollectionRows(parsed.rows);
    } catch {
      return null;
    }
  }

  function writePersistedCollectionRows(collectionPath, rows) {
    try {
      global.localStorage.setItem(getPersistedCollectionKey(collectionPath), JSON.stringify({
        cachedAt: new Date().toISOString(),
        rows: cloneCollectionRows(rows)
      }));
    } catch {
      // Storage can be full or unavailable in some WebView modes.
    }
  }

  async function readPersistedCollectionRowsAsync(collectionPath) {
    const indexedRows = await readIndexedCollectionRows(collectionPath);
    if (indexedRows) return indexedRows;
    return readPersistedCollectionRows(collectionPath);
  }

  function getCachedCollectionRows(collectionPath) {
    const cache = collectionCache.get(getCollectionCacheKey(collectionPath));
    if (!cache) return null;
    if (Date.now() - cache.fetchedAt > getCollectionCacheTtl(collectionPath)) return null;
    return cloneCollectionRows(cache.rows);
  }

  async function setCachedCollectionRows(collectionPath, rows) {
    collectionCache.set(getCollectionCacheKey(collectionPath), {
      fetchedAt: Date.now(),
      rows: cloneCollectionRows(rows)
    });
    writePersistedCollectionRows(collectionPath, rows);
    await writeIndexedCollectionRows(collectionPath, rows);
  }

  function invalidateCollectionCache(collectionPath) {
    const key = getCollectionCacheKey(collectionPath);
    collectionCache.delete(key);
    collectionFetches.delete(key);
  }

  function shouldUseOfflineCacheFirst() {
    return Boolean(global.GuruOffline?.isOnline && global.GuruOffline.isOnline() === false);
  }

  async function fetchAllCollectionRows(collectionPath, options = {}) {
    const persistedRows = await readPersistedCollectionRowsAsync(collectionPath);
    if (persistedRows && shouldUseOfflineCacheFirst()) return persistedRows;
    if (!client?.from) {
      if (persistedRows) return persistedRows;
      throw new Error("Supabase client belum siap");
    }
    const key = getCollectionCacheKey(collectionPath);
    if (options.useCache !== false) {
      const cached = getCachedCollectionRows(collectionPath);
      if (cached) return cached;
      const existingFetch = collectionFetches.get(key);
      if (existingFetch) return existingFetch;
    }

    const pageSize = 1000;
    let offset = 0;
    const rows = [];
    const fetchPromise = (async () => {
      try {
        while (true) {
          const { data, error } = await client
            .from(TABLE)
            .select("id,data")
            .eq("collection_path", collectionPath)
            .range(offset, offset + pageSize - 1);

          if (error) throw error;

          const page = data || [];
          rows.push(...page);
          if (page.length < pageSize) break;
          offset += pageSize;
        }

        await setCachedCollectionRows(collectionPath, rows);
        return cloneCollectionRows(rows);
      } catch (error) {
        global.GuruOffline?.markOffline?.();
        if (persistedRows) return persistedRows;
        throw error;
      }
    })();

    if (options.useCache !== false) {
      collectionFetches.set(key, fetchPromise);
      try {
        return await fetchPromise;
      } finally {
        collectionFetches.delete(key);
      }
    }

    return fetchPromise;
  }

  function matchesFilter(row, filter) {
    const value = row?.data?.[filter.field];
    if (filter.op === "==") return String(value ?? "") === String(filter.value ?? "");
    if (filter.op === "!=") return String(value ?? "") !== String(filter.value ?? "");
    if (filter.op === ">") return value > filter.value;
    if (filter.op === ">=") return value >= filter.value;
    if (filter.op === "<") return value < filter.value;
    if (filter.op === "<=") return value <= filter.value;
    if (filter.op === "in") return Array.isArray(filter.value) && filter.value.includes(value);
    return false;
  }

  class QuerySnapshot {
    constructor(docs) {
      this.docs = docs;
      this.empty = docs.length === 0;
      this.size = docs.length;
    }

    forEach(callback) {
      this.docs.forEach(callback);
    }
  }

  class DocumentSnapshot {
    constructor(ref, row) {
      this.ref = ref;
      this.id = ref.id;
      this.exists = Boolean(row);
      this._data = row ? { ...(row.data || {}) } : undefined;
    }

    data() {
      return this._data ? { ...this._data } : undefined;
    }
  }

  class Query {
    constructor(collectionPath, options = {}) {
      this.collectionPath = collectionPath;
      this._where = options.where || [];
      this._order = options.order || null;
      this._limit = options.limit || null;
    }

    where(field, op, value) {
      return new Query(this.collectionPath, {
        where: [...this._where, { field, op, value }],
        order: this._order,
        limit: this._limit
      });
    }

    orderBy(field, direction = "asc") {
      return new Query(this.collectionPath, {
        where: this._where,
        order: { field, direction },
        limit: this._limit
      });
    }

    limit(count) {
      return new Query(this.collectionPath, {
        where: this._where,
        order: this._order,
        limit: count
      });
    }

    async get() {
      let rows = (await fetchAllCollectionRows(this.collectionPath))
        .filter(row => this._where.every(filter => matchesFilter(row, filter)));
      if (this._order) {
        const { field, direction } = this._order;
        rows = [...rows].sort((a, b) => {
          const result = compareValue(a?.data?.[field], b?.data?.[field]);
          return String(direction).toLowerCase() === "desc" ? -result : result;
        });
      }
      if (this._limit !== null) rows = rows.slice(0, Number(this._limit) || 0);

      return new QuerySnapshot(
        rows.map(row => new DocumentSnapshot(new DocumentRef(this.collectionPath, row.id), row))
      );
    }

    onSnapshot(callback, onError) {
      let active = true;
      let refreshTimer = null;
      let refreshInFlight = false;
      let refreshQueued = false;
      const refresh = async () => {
        if (!active) return;
        if (refreshInFlight) {
          refreshQueued = true;
          return;
        }
        refreshInFlight = true;
        try {
          callback(await this.get());
        } catch (error) {
          if (onError) onError(error);
          else console.error(error);
        } finally {
          refreshInFlight = false;
          if (refreshQueued) {
            refreshQueued = false;
            refresh();
          }
        }
      };
      const scheduleRefresh = () => {
        if (!active) return;
        if (refreshTimer) global.clearTimeout(refreshTimer);
        refreshTimer = global.setTimeout(() => {
          refreshTimer = null;
          refresh();
        }, 120);
      };

      refresh();
      if (!client?.channel) return () => {
        active = false;
        if (refreshTimer) global.clearTimeout(refreshTimer);
      };
      const channel = client
        .channel(makeChannelName("app-documents-native", this.collectionPath))
        .on("postgres_changes", { event: "*", schema: "public", table: TABLE }, payload => {
          const path = payload.new?.collection_path || payload.old?.collection_path;
          if (path === this.collectionPath) scheduleRefresh();
        })
        .subscribe();

      return () => {
        active = false;
        if (refreshTimer) global.clearTimeout(refreshTimer);
        client.removeChannel(channel);
      };
    }
  }

  class DocumentRef {
    constructor(collectionPath, id) {
      this.collectionPath = collectionPath;
      this.id = String(id || "");
      this.path = `${collectionPath}/${this.id}`;
    }

    collection(name) {
      return new CollectionRef(`${this.collectionPath}/${this.id}/${name}`);
    }

    async get() {
      const cachedRows = getCachedCollectionRows(this.collectionPath);
      const cachedRow = cachedRows?.find(row => row.id === this.id);
      if (cachedRow) return new DocumentSnapshot(this, cachedRow);
      const persistedRows = await readPersistedCollectionRowsAsync(this.collectionPath);
      if (global.GuruOffline?.isOnline?.() === false) {
        const persistedRow = persistedRows?.find(row => row.id === this.id);
        return new DocumentSnapshot(this, persistedRow || null);
      }
      if (!client?.from) {
        const persistedRow = persistedRows?.find(row => row.id === this.id);
        return new DocumentSnapshot(this, persistedRow || null);
      }

      try {
        const { data, error } = await client
          .from(TABLE)
          .select("id,data")
          .eq("collection_path", this.collectionPath)
          .eq("id", this.id)
          .maybeSingle();

        if (error) throw error;
        return new DocumentSnapshot(this, data);
      } catch (error) {
        global.GuruOffline?.markOffline?.();
        const persistedRow = persistedRows?.find(row => row.id === this.id);
        if (persistedRow) return new DocumentSnapshot(this, persistedRow);
        throw error;
      }
    }

    async set(data, options = {}) {
      if (!client?.from) throw new Error("Supabase client belum siap");
      const payloadData = cleanValue(data || {});
      let nextData = payloadData;

      if (options?.merge) {
        const existing = await this.get();
        nextData = { ...(existing.data() || {}), ...payloadData };
      }

      const { error } = await client
        .from(TABLE)
        .upsert({
          collection_path: this.collectionPath,
          id: this.id,
          data: nextData,
          updated_at: new Date().toISOString()
        }, { onConflict: "collection_path,id" });

      if (error) throw error;
      invalidateCollectionCache(this.collectionPath);
    }

    async update(data) {
      return this.set(data, { merge: true });
    }

    async delete() {
      if (!client?.from) throw new Error("Supabase client belum siap");
      const { error } = await client
        .from(TABLE)
        .delete()
        .eq("collection_path", this.collectionPath)
        .eq("id", this.id);

      if (error) throw error;
      invalidateCollectionCache(this.collectionPath);
    }

    onSnapshot(callback, onError) {
      let active = true;
      let refreshTimer = null;
      const refresh = async () => {
        if (!active) return;
        try {
          callback(await this.get());
        } catch (error) {
          if (onError) onError(error);
          else console.error(error);
        }
      };
      const scheduleRefresh = () => {
        if (!active) return;
        if (refreshTimer) global.clearTimeout(refreshTimer);
        refreshTimer = global.setTimeout(() => {
          refreshTimer = null;
          refresh();
        }, 120);
      };

      refresh();
      if (!client?.channel) return () => {
        active = false;
        if (refreshTimer) global.clearTimeout(refreshTimer);
      };
      const channel = client
        .channel(makeChannelName("app-document-native", this.path))
        .on("postgres_changes", { event: "*", schema: "public", table: TABLE }, payload => {
          const path = payload.new?.collection_path || payload.old?.collection_path;
          const id = payload.new?.id || payload.old?.id;
          if (path === this.collectionPath && id === this.id) scheduleRefresh();
        })
        .subscribe();

      return () => {
        active = false;
        if (refreshTimer) global.clearTimeout(refreshTimer);
        client.removeChannel(channel);
      };
    }
  }

  class CollectionRef extends Query {
    constructor(collectionPath) {
      super(collectionPath);
      this.path = collectionPath;
    }

    doc(id) {
      return new DocumentRef(this.collectionPath, id);
    }
  }

  class Batch {
    constructor() {
      this.operations = [];
    }

    set(ref, data, options) {
      this.operations.push(() => ref.set(data, options));
      return this;
    }

    update(ref, data) {
      this.operations.push(() => ref.update(data));
      return this;
    }

    delete(ref) {
      this.operations.push(() => ref.delete());
      return this;
    }

    async commit() {
      for (const operation of this.operations) {
        await operation();
      }
    }
  }

  global.SupabaseDocuments = {
    client,
    table: TABLE,
    setCollectionCachePolicy(collectionName, policy = {}) {
      const cacheKey = getCollectionCacheKey(collectionName);
      collectionCachePolicies.set(cacheKey, {
        ttlMs: Math.max(0, Number(policy.ttlMs) || DEFAULT_COLLECTION_CACHE_TTL_MS)
      });
      invalidateCollectionCache(collectionName);
      return { ...collectionCachePolicies.get(cacheKey) };
    },
    collection(name) {
      return new CollectionRef(name);
    },
    batch() {
      return new Batch();
    },
    getPersistedCollectionRows(collectionPath) {
      return readPersistedCollectionRows(collectionPath) || [];
    },
    async getPersistedCollectionRowsAsync(collectionPath) {
      return (await readPersistedCollectionRowsAsync(collectionPath)) || [];
    },
    Timestamp: {
      fromDate(date) {
        return {
          toDate() {
            return date;
          },
          toJSON() {
            return date.toISOString();
          }
        };
      }
    }
  };
})(window);
