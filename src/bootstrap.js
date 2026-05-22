import getSupabaseClient, {
  getSupabaseClient as getClient,
} from "./supabase-client.js";

// Initialize Supabase client from window config and expose for legacy modules.
const client = getClient();
if (client) {
  // Keep backward compatibility for existing code that reads from window
  window.supabaseClient = client;
}

// Export for other ES modules
export { client as supabaseClient, getClient as getSupabaseClient };

// Optional: provide a small legacy adapter for gradual migration
export function exposeLegacyGlobals() {
  if (window.SupabaseDocuments) {
    // already provided by shared/supabase-documents.js
    return;
  }
  // No-op: consumers should migrate to using exported client.
}

// Run simple startup tasks
exposeLegacyGlobals();
