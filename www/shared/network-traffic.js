(function initNetworkTrafficTracker(global) {
  if (global.NetworkTrafficTracker) return;

  const STORAGE_KEY = "appNetworkTrafficSession";
  const EMPTY_BUCKETS = () => ({
    supabase: { requests: 0, ingressBytes: 0, egressBytes: 0 },
    function: { requests: 0, ingressBytes: 0, egressBytes: 0 },
    storage: { requests: 0, ingressBytes: 0, egressBytes: 0 },
    app: { requests: 0, ingressBytes: 0, egressBytes: 0 },
    other: { requests: 0, ingressBytes: 0, egressBytes: 0 }
  });

  function cloneBuckets(buckets = EMPTY_BUCKETS()) {
    return Object.fromEntries(
      Object.entries(buckets).map(([key, value]) => [
        key,
        {
          requests: Number(value?.requests || 0),
          ingressBytes: Number(value?.ingressBytes || 0),
          egressBytes: Number(value?.egressBytes || 0)
        }
      ])
    );
  }

  function buildInitialState() {
    return {
      startedAt: new Date().toISOString(),
      updatedAt: "",
      totals: {
        requests: 0,
        ingressBytes: 0,
        egressBytes: 0
      },
      buckets: EMPTY_BUCKETS()
    };
  }

  function loadState() {
    try {
      const parsed = JSON.parse(global.sessionStorage.getItem(STORAGE_KEY) || "null");
      if (!parsed || typeof parsed !== "object") return buildInitialState();
      return {
        startedAt: parsed.startedAt || new Date().toISOString(),
        updatedAt: parsed.updatedAt || "",
        totals: {
          requests: Number(parsed.totals?.requests || 0),
          ingressBytes: Number(parsed.totals?.ingressBytes || 0),
          egressBytes: Number(parsed.totals?.egressBytes || 0)
        },
        buckets: cloneBuckets(parsed.buckets)
      };
    } catch {
      return buildInitialState();
    }
  }

  let state = loadState();

  function persistState() {
    state.updatedAt = new Date().toISOString();
    try {
      global.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // noop
    }
  }

  function normalizeUrl(input) {
    try {
      return new URL(String(input || ""), global.location.href);
    } catch {
      return null;
    }
  }

  function classifyUrl(urlValue) {
    const url = normalizeUrl(urlValue);
    if (!url) return "other";
    const href = url.href.toLowerCase();
    if (href.includes("/functions/v1/")) return "function";
    if (href.includes("/storage/v1/")) return "storage";
    if (href.includes(".supabase.co")) return "supabase";
    if (url.origin === global.location.origin) return "app";
    return "other";
  }

  function estimateBytes(value) {
    if (value === null || value === undefined) return 0;
    if (typeof value === "string") return new TextEncoder().encode(value).length;
    if (value instanceof ArrayBuffer) return value.byteLength;
    if (ArrayBuffer.isView(value)) return value.byteLength;
    if (typeof Blob !== "undefined" && value instanceof Blob) return value.size;
    if (typeof FormData !== "undefined" && value instanceof FormData) {
      let total = 0;
      for (const [key, item] of value.entries()) {
        total += estimateBytes(key);
        total += typeof item === "string" ? estimateBytes(item) : (item?.size || 0);
      }
      return total;
    }
    if (typeof URLSearchParams !== "undefined" && value instanceof URLSearchParams) {
      return estimateBytes(value.toString());
    }
    if (typeof value === "object") {
      try {
        return estimateBytes(JSON.stringify(value));
      } catch {
        return 0;
      }
    }
    return estimateBytes(String(value));
  }

  function findPerformanceSize(urlValue, startedAt) {
    if (!global.performance?.getEntriesByType) return 0;
    const entries = global.performance.getEntriesByType("resource");
    for (let index = entries.length - 1; index >= 0; index -= 1) {
      const entry = entries[index];
      if (entry.name !== urlValue) continue;
      if (typeof startedAt === "number" && entry.startTime + 5 < startedAt) continue;
      const size = Number(entry.transferSize || entry.encodedBodySize || entry.decodedBodySize || 0);
      if (Number.isFinite(size) && size > 0) return size;
    }
    return 0;
  }

  function recordRequest({ url, ingressBytes = 0, egressBytes = 0, count = 1 }) {
    const bucketName = classifyUrl(url);
    const bucket = state.buckets[bucketName] || (state.buckets[bucketName] = { requests: 0, ingressBytes: 0, egressBytes: 0 });
    bucket.requests += Number(count || 0);
    bucket.ingressBytes += Number(ingressBytes || 0);
    bucket.egressBytes += Number(egressBytes || 0);
    state.totals.requests += Number(count || 0);
    state.totals.ingressBytes += Number(ingressBytes || 0);
    state.totals.egressBytes += Number(egressBytes || 0);
    persistState();
  }

  function getSummary() {
    return {
      startedAt: state.startedAt,
      updatedAt: state.updatedAt,
      totals: { ...state.totals },
      buckets: cloneBuckets(state.buckets)
    };
  }

  function reset() {
    state = buildInitialState();
    persistState();
    return getSummary();
  }

  async function instrumentFetch() {
    if (!global.fetch || global.fetch.__networkTrafficWrapped) return;
    const originalFetch = global.fetch.bind(global);
    const wrappedFetch = async function wrappedFetch(input, init) {
      const requestUrl = typeof input === "string" ? input : (input?.url || "");
      const startedAt = global.performance?.now?.() || 0;
      const initBody = init?.body;
      const inputBody = !initBody && input && typeof Request !== "undefined" && input instanceof Request ? input.clone().body : null;
      const ingressBytes = estimateBytes(initBody) || estimateBytes(inputBody);
      const response = await originalFetch(input, init);
      let egressBytes = Number(response.headers.get("content-length") || 0);
      if (!Number.isFinite(egressBytes) || egressBytes <= 0) {
        egressBytes = findPerformanceSize(response.url || requestUrl, startedAt);
      }
      recordRequest({
        url: response.url || requestUrl,
        ingressBytes,
        egressBytes
      });
      return response;
    };
    wrappedFetch.__networkTrafficWrapped = true;
    global.fetch = wrappedFetch;
  }

  function instrumentXhr() {
    if (!global.XMLHttpRequest || global.XMLHttpRequest.prototype.__networkTrafficWrapped) return;
    const originalOpen = global.XMLHttpRequest.prototype.open;
    const originalSend = global.XMLHttpRequest.prototype.send;

    global.XMLHttpRequest.prototype.open = function patchedOpen(method, url, ...args) {
      this.__networkTrafficMethod = method;
      this.__networkTrafficUrl = url;
      this.__networkTrafficStartedAt = global.performance?.now?.() || 0;
      return originalOpen.call(this, method, url, ...args);
    };

    global.XMLHttpRequest.prototype.send = function patchedSend(body) {
      const ingressBytes = estimateBytes(body);
      this.addEventListener("loadend", () => {
        const responseUrl = this.responseURL || this.__networkTrafficUrl || "";
        let egressBytes = Number(this.getResponseHeader("content-length") || 0);
        if (!Number.isFinite(egressBytes) || egressBytes <= 0) {
          egressBytes = findPerformanceSize(responseUrl, this.__networkTrafficStartedAt);
        }
        recordRequest({
          url: responseUrl,
          ingressBytes,
          egressBytes
        });
      }, { once: true });
      return originalSend.call(this, body);
    };

    global.XMLHttpRequest.prototype.__networkTrafficWrapped = true;
  }

  const api = {
    getSummary,
    reset,
    recordRequest
  };

  global.NetworkTrafficTracker = api;
  instrumentFetch();
  instrumentXhr();
  persistState();
})(window);
