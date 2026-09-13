import type { ChunkHit, SourceHit } from "./types";

/** pgvector returns cosine similarity; clamp display to a readable 0..1. */
export function clampSimilarity(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

/**
 * Convert raw retrieval rows into ranked, deduped sources for the prompt and
 * the UI. Rows are sorted best-first by similarity, then re-indexed into
 * ranks; duplicate page/chunk keys only keep the best-scoring occurrence.
 */
export function rankAndLimitHits(hits: ChunkHit[], limit: number): SourceHit[] {
  const seen = new Set<string>();
  const ranked: SourceHit[] = [];
  for (const hit of [...hits].sort((a, b) => b.similarity - a.similarity)) {
    const key = `${hit.pageId}:${hit.chunkIndex}`;
    if (seen.has(key)) continue;
    seen.add(key);
    ranked.push({
      pageId: hit.pageId,
      chunkIndex: hit.chunkIndex,
      title: hit.title,
      sourceUrl: hit.sourceUrl,
      provider: hit.provider,
      content: hit.content,
      similarity: clampSimilarity(hit.similarity),
      rank: ranked.length + 1,
    });
    if (ranked.length >= limit) break;
  }
  return ranked;
}