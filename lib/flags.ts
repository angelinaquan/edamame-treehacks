export type MemoryProvider = "supabase" | "mem0";

type ProcessLike = {
  env?: Record<string, string | undefined>;
};

export function readRuntimeEnv(key: string): string | undefined {
  const runtime = globalThis as { process?: ProcessLike };
  return runtime.process?.env?.[key];
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    readRuntimeEnv("NEXT_PUBLIC_SUPABASE_URL") &&
      readRuntimeEnv("SUPABASE_SERVICE_ROLE_KEY")
  );
}

export function getMemoryProvider(): MemoryProvider {
  return readRuntimeEnv("MEMORY_PROVIDER") === "mem0" ? "mem0" : "supabase";
}

export function isMem0Configured(): boolean {
  return Boolean(readRuntimeEnv("MEM0_API_KEY"));
}

export function isMem0MemoryEnabled(): boolean {
  return getMemoryProvider() === "mem0" && isMem0Configured();
}

export function isSupabaseMemoryEnabled(): boolean {
  return (
    getMemoryProvider() === "supabase" &&
    readRuntimeEnv("USE_SUPABASE_MEMORY") === "true" &&
    isSupabaseConfigured()
  );
}
