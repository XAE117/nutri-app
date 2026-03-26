import { SupabaseClient } from "@supabase/supabase-js";
import { createEmbedding } from "./embedding";

export interface MemoryEpisode {
  id: string;
  content: string;
  metadata: Record<string, unknown>;
  similarity?: number;
}

/**
 * Create a memory episode from a meal interaction.
 * Generates a ~100-token summary, embeds it, stores in pgvector.
 */
export async function createMealEpisode(
  supabase: SupabaseClient,
  userId: string,
  summary: string,
  metadata: Record<string, unknown>
): Promise<void> {
  const embedding = await createEmbedding(summary);

  await supabase.from("ai_memory_episodes").insert({
    user_id: userId,
    episode_type: "meal",
    content: summary,
    embedding: embedding ? `[${embedding.join(",")}]` : null,
    metadata,
  });
}

/**
 * Create a generic episode (weight, coaching, goal change).
 */
export async function createEpisode(
  supabase: SupabaseClient,
  userId: string,
  type: "meal" | "weight" | "coaching" | "goal_change",
  content: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  const embedding = await createEmbedding(content);

  await supabase.from("ai_memory_episodes").insert({
    user_id: userId,
    episode_type: type,
    content,
    embedding: embedding ? `[${embedding.join(",")}]` : null,
    metadata,
  });
}

/**
 * Search for relevant past episodes using cosine similarity.
 */
export async function searchEpisodes(
  supabase: SupabaseClient,
  userId: string,
  query: string,
  limit = 5
): Promise<MemoryEpisode[]> {
  const embedding = await createEmbedding(query);
  if (!embedding) return [];

  const { data, error } = await supabase.rpc("match_episodes", {
    query_embedding: `[${embedding.join(",")}]`,
    match_user_id: userId,
    match_count: limit,
    match_threshold: 0.7,
  });

  if (error) {
    console.error("Episode search error:", error);
    return [];
  }

  return (data ?? []) as MemoryEpisode[];
}

/**
 * Get recent episodes (no embedding search needed).
 */
export async function getRecentEpisodes(
  supabase: SupabaseClient,
  userId: string,
  limit = 10
): Promise<MemoryEpisode[]> {
  const { data } = await supabase
    .from("ai_memory_episodes")
    .select("id, content, metadata")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []) as MemoryEpisode[];
}

/**
 * Generate a meal summary for memory storage (~100 tokens).
 */
export function generateMealSummary(
  description: string,
  calories: number,
  protein: number,
  mealType: string,
  confidence: number
): string {
  return `${mealType} meal: ${description}. ${calories} cal, ${Math.round(protein)}g protein. Confidence: ${confidence.toFixed(2)}.`;
}
