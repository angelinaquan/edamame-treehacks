/**
 * Core — shared utilities, types, and database client.
 * NO domain logic. All layers depend on core.
 */

export { createServerSupabaseClient } from "./supabase/server";
export { supabase } from "./supabase/client";
export { chunkText, type ChunkResult } from "./chunker";
export { cn } from "./utils";

// Re-export all types
export * from "./types";
