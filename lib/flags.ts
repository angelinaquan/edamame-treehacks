export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export function isSupabaseMemoryEnabled(): boolean {
  return process.env.USE_SUPABASE_MEMORY === "true" && isSupabaseConfigured();
}
