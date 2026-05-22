// Lightweight Supabase client helper (singleton)
export let supabaseClient = null;

export function createSupabaseClientFromWindowConfig() {
  const config = window.supabaseConfig || {};
  if (!window.supabase?.createClient || !config.url || !config.anonKey)
    return null;
  try {
    supabaseClient = window.supabase.createClient(config.url, config.anonKey);
    return supabaseClient;
  } catch (err) {
    console.error("Failed to create Supabase client:", err);
    return null;
  }
}

export function getSupabaseClient() {
  if (supabaseClient) return supabaseClient;
  return createSupabaseClientFromWindowConfig();
}

export default getSupabaseClient;
