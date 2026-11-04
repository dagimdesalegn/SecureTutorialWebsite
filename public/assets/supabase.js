// Public Supabase browser settings are served at runtime from Vercel environment variables.
// The anon/publishable key is designed for browser use; never expose the service-role key.
const response = await fetch("/api/public-config", { cache: "no-store" });
if (!response.ok) throw new Error("Unable to load public Supabase configuration");
const config = await response.json();
export const SUPABASE_URL = config.supabaseUrl || "";
export const SUPABASE_ANON_KEY = config.supabaseAnonKey || "";
