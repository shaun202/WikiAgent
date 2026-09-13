import { getConfig } from "./config";
import { ensureSchema, getPool } from "./database";
import { getEmbeddings } from "./embeddings";
import type { ChunkHit, Provider } from "./types";

export interface SearchOptions {
  question: string;
  topK: number;
  /** Optional page filter; omit to search the whole corpus. */
  pageId?: string | null;
}

interface ChunkRow {
  id: string;
  page_id: string;
  chunk_index: number;
  content: string;
  token_estimate: number;
  title: string;
  source_url: string;
  provider: string;
  similarity: number;
}

const SEARCH_SQL = `
  SELECT
    c.id,
    c.page_id,
    c.chunk_index,
    c.content,
    c.token_estimate,
    c.metadata->>'title'        AS title,
    c.metadata->>'source_url'   AS source_url,
    c.metadata->>'provider'     AS provider,
    1 - (c.embedding <=> $2::vector) AS similarity
  FROM wiki_chunks c
  WHERE ($3::uuid IS NULL OR c.page_id = $3::uuid)
  ORDER BY c.embedding <=> $2::vector
  LIMIT $1
`;

/**
 * Embed the question once and run a cosine ANN scan against the HNSW index.
 * `1 - distance` yields cosine similarity in [0, 1], higher is better.
 */
export async function searchChunks(options: SearchOptions): Promise<ChunkHit[]> {
  const query = options.question.trim();
  if (!query) return [];

  const embedding = await getEmbeddings().embedQuery(query);
  const vectorLiteral = `[${embedding.join(",")}]`;

  const client = getPool();
  await ensureSchema(client);

  const result = await client.query<ChunkRow>(SEARCH_SQL, [
    options.topK,
    vectorLiteral,
    options.pageId ?? null,
  ]);

  return result.rows.map((row) => ({
    id: row.id,
    pageId: row.page_id,
    chunkIndex: row.chunk_index,
    content: row.content,
    tokenEstimate: row.token_estimate,
    title: row.title || "Untitled page",
    sourceUrl: row.source_url || options.question,
    provider: (row.provider as Provider) ?? "html",
    similarity: row.similarity,
  }));
}

/** Convenience wrapper so callers can request the config default K inline. */
export function topK(): number {
  return getConfig().WIKIAGENT_TOP_K;
}