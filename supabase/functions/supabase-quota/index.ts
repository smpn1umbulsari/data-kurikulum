import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}

function getProjectRefFromUrl(value = "") {
  const match = String(value || "").match(/^https:\/\/([a-z0-9-]+)\.supabase\.co/i);
  return match ? match[1] : "";
}

function pickFirstNumber(value: unknown, keys: string[]) {
  if (!value || typeof value !== "object") return null;

  for (const key of keys) {
    const direct = (value as Record<string, unknown>)[key];
    if (typeof direct === "number" && Number.isFinite(direct)) return direct;
  }

  for (const nested of Object.values(value as Record<string, unknown>)) {
    if (nested && typeof nested === "object") {
      const found = pickFirstNumber(nested, keys);
      if (found !== null) return found;
    }
  }

  return null;
}

function pickAddonSummary(addonsPayload: unknown) {
  if (!addonsPayload || typeof addonsPayload !== "object") return null;
  const payload = addonsPayload as Record<string, unknown>;
  const buckets: string[] = [];

  for (const value of Object.values(payload)) {
    if (!value) continue;
    if (typeof value === "string") {
      if (value.trim()) buckets.push(value.trim());
      continue;
    }
    if (Array.isArray(value)) {
      value.forEach(item => {
        if (item && typeof item === "object") {
          const text = [
            (item as Record<string, unknown>).name,
            (item as Record<string, unknown>).type,
            (item as Record<string, unknown>).plan,
            (item as Record<string, unknown>).compute_size,
            (item as Record<string, unknown>).size
          ].find(entry => typeof entry === "string" && String(entry).trim());
          if (typeof text === "string" && text.trim()) buckets.push(text.trim());
        }
      });
    }
  }

  return buckets.length ? buckets[0] : null;
}

async function callManagementApi(path: string, accessToken: string) {
  const response = await fetch(`https://api.supabase.com${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  const text = await response.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text || null;
  }

  return {
    ok: response.ok,
    status: response.status,
    data
  };
}

serve(async request => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const accessToken = Deno.env.get("SUPABASE_MANAGEMENT_TOKEN") || Deno.env.get("SUPABASE_ACCESS_TOKEN") || "";
  if (!accessToken) {
    return jsonResponse({
      available: false,
      error: "Secret SUPABASE_MANAGEMENT_TOKEN belum disetel."
    }, 503);
  }

  const url = new URL(request.url);
  const projectRef = String(
    url.searchParams.get("project_ref")
    || Deno.env.get("SUPABASE_PROJECT_REF")
    || getProjectRefFromUrl(Deno.env.get("SUPABASE_URL") || "")
  ).trim();

  if (!projectRef) {
    return jsonResponse({
      available: false,
      error: "Project ref tidak ditemukan."
    }, 400);
  }

  const [projectResult, billingResult, diskConfigResult, diskUtilResult, apiRequestsResult, apiCountsResult] = await Promise.all([
    callManagementApi(`/v1/projects/${projectRef}`, accessToken),
    callManagementApi(`/v1/projects/${projectRef}/billing/addons`, accessToken),
    callManagementApi(`/v1/projects/${projectRef}/config/disk`, accessToken),
    callManagementApi(`/v1/projects/${projectRef}/config/disk/util`, accessToken),
    callManagementApi(`/v1/projects/${projectRef}/analytics/endpoints/usage.api-requests-count`, accessToken),
    callManagementApi(`/v1/projects/${projectRef}/analytics/endpoints/usage.api-counts`, accessToken)
  ]);

  const project = (projectResult.data && typeof projectResult.data === "object")
    ? projectResult.data as Record<string, unknown>
    : {};
  const diskConfig = (diskConfigResult.data && typeof diskConfigResult.data === "object")
    ? diskConfigResult.data as Record<string, unknown>
    : {};
  const diskAttributes = (diskConfig.attributes && typeof diskConfig.attributes === "object")
    ? diskConfig.attributes as Record<string, unknown>
    : {};
  const diskUtil = (diskUtilResult.data && typeof diskUtilResult.data === "object")
    ? diskUtilResult.data as Record<string, unknown>
    : {};
  const apiRequests = (apiRequestsResult.data && typeof apiRequestsResult.data === "object")
    ? apiRequestsResult.data as Record<string, unknown>
    : {};
  const apiCounts = (apiCountsResult.data && typeof apiCountsResult.data === "object")
    ? apiCountsResult.data as Record<string, unknown>
    : {};
  const apiCountsRows = Array.isArray(apiCounts.result) ? apiCounts.result as Array<Record<string, unknown>> : [];
  const latestApiCounts = apiCountsRows.length ? apiCountsRows[apiCountsRows.length - 1] : {};
  const requestRows = Array.isArray(apiRequests.result) ? apiRequests.result as Array<Record<string, unknown>> : [];
  const latestRequestCount = requestRows.length ? requestRows[0] : {};

  return jsonResponse({
    available: projectResult.ok,
    fetched_at: new Date().toISOString(),
    project_ref: projectRef,
    summary: {
      project_name: typeof project.name === "string" ? project.name : null,
      project_status: typeof project.status === "string" ? project.status : null,
      organization_slug: typeof project.organization_slug === "string" ? project.organization_slug : null,
      region: typeof project.region === "string" ? project.region : null,
      created_at: typeof project.created_at === "string" ? project.created_at : null,
      database_engine: typeof project.database === "object" && project.database
        ? String((project.database as Record<string, unknown>).postgres_engine || (project.database as Record<string, unknown>).version || "")
        : null,
      active_addon: pickAddonSummary(billingResult.data),
      disk_size_gb: typeof diskAttributes.size_gb === "number" ? diskAttributes.size_gb : null,
      disk_type: typeof diskAttributes.type === "string" ? diskAttributes.type : null,
      disk_iops: typeof diskAttributes.iops === "number" ? diskAttributes.iops : null,
      disk_throughput_mibps: typeof diskAttributes.throughput_mibps === "number" ? diskAttributes.throughput_mibps : null,
      disk_used_bytes: pickFirstNumber(diskUtil, ["used_bytes", "utilized_bytes", "disk_used_bytes"]),
      disk_used_gb: pickFirstNumber(diskUtil, ["used_gb", "utilized_gb", "disk_used_gb"]),
      disk_usage_percent: pickFirstNumber(diskUtil, ["utilization_percent", "used_percent", "disk_usage_percent"]),
      api_requests_count: typeof latestRequestCount.count === "number" ? latestRequestCount.count : null,
      total_auth_requests: typeof latestApiCounts.total_auth_requests === "number" ? latestApiCounts.total_auth_requests : null,
      total_realtime_requests: typeof latestApiCounts.total_realtime_requests === "number" ? latestApiCounts.total_realtime_requests : null,
      total_rest_requests: typeof latestApiCounts.total_rest_requests === "number" ? latestApiCounts.total_rest_requests : null,
      total_storage_requests: typeof latestApiCounts.total_storage_requests === "number" ? latestApiCounts.total_storage_requests : null,
      analytics_timestamp: typeof latestApiCounts.timestamp === "string" ? latestApiCounts.timestamp : null
    },
    sources: {
      project: { ok: projectResult.ok, status: projectResult.status },
      billing_addons: { ok: billingResult.ok, status: billingResult.status },
      disk: { ok: diskConfigResult.ok, status: diskConfigResult.status },
      disk_util: { ok: diskUtilResult.ok, status: diskUtilResult.status },
      api_requests_count: { ok: apiRequestsResult.ok, status: apiRequestsResult.status },
      api_counts: { ok: apiCountsResult.ok, status: apiCountsResult.status }
    }
  });
});
