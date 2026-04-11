(function initSupabaseDocuments(global) {
  if (global.SupabaseDocuments) return;

  const config = global.supabaseConfig || {};
  const client = global.supabaseClient || (global.supabase?.createClient && config.url && config.anonKey
    ? global.supabase.createClient(config.url, config.anonKey)
    : null);
  const TABLE = config.documentsTable || "app_documents";

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

  async function fetchAllCollectionRows(collectionPath) {
    if (!client?.from) throw new Error("Supabase client belum siap");
    const pageSize = 1000;
    let offset = 0;
    const rows = [];

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

    return rows;
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
      if (!client?.channel) throw new Error("Supabase realtime belum siap");
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
      if (!client?.from) throw new Error("Supabase client belum siap");
      const { data, error } = await client
        .from(TABLE)
        .select("id,data")
        .eq("collection_path", this.collectionPath)
        .eq("id", this.id)
        .maybeSingle();

      if (error) throw error;
      return new DocumentSnapshot(this, data);
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
    }

    onSnapshot(callback, onError) {
      if (!client?.channel) throw new Error("Supabase realtime belum siap");
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
    collection(name) {
      return new CollectionRef(name);
    },
    batch() {
      return new Batch();
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
