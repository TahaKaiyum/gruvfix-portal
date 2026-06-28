// Expose the global Supabase client instance to React modules
export const supabaseClient = (window as any).supabaseClient || null;

if (!supabaseClient) {
  console.warn("React Supabase service initialized, but window.supabaseClient was not found yet.");
}
