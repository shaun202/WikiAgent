/**
 * Embedding vector sizes. The index is dimension-flexible:
 *
 * - `openai`  → `text-embedding-3-small` (1536-d) — chat via OpenAI or OpenRouter
 * - `local`   → `all-MiniLM-L6-v2` (384-d) via `@huggingface/transformers`,
 *   fully on-device and free (no API key). This is the default so the app runs
 *   off a single OpenRouter key with no OpenAI credits.
 *
 * The effective dimension is resolved in `getConfig()` and mirrored into the
 * pgvector schema (`vector(N)`), so keep both providers' values in sync here.
 */
export const EMBEDDING_DIM_OPENAI = 1536;
export const EMBEDDING_DIM_LOCAL = 384;

/** Model slugs for each embeddings provider. */
export const EMBEDDING_MODEL_OPENAI = "text-embedding-3-small";
export const EMBEDDING_MODEL_LOCAL = "Xenova/all-MiniLM-L6-v2";

/**
 * The effective pgvector dimension used by the schema. Local ONNX embeddings
 * (384-d) are the default so the app runs off a single OpenRouter key. When
 * using the `openai` provider set WIKIAGENT_EMBEDDING_DIM to 1536.
 */
export const EMBEDDING_DIMENSIONS = EMBEDDING_DIM_LOCAL;

/** How embeddings are produced. `local` runs on-device and needs no API key. */
export type EmbeddingsProvider = "local" | "openai";

export type Provider = "wikipedia" | "html";

/** A record in the `wiki_pages` table. */
export interface WikiPageRecord {
  id: string;
  title: string;
  sourceUrl: string;
  provider: Provider;
  summary: string;
  wordCount: number;
  chunkCount: number;
  createdAt: string;
}

/** One retrieved row from the vector index. */
export interface ChunkHit {
  id: string;
  pageId: string;
  chunkIndex: number;
  content: string;
  tokenEstimate: number;
  title: string;
  sourceUrl: string;
  provider: Provider;
  /**
   * Cosine similarity in `[0, 1]` as computed by `1 - distance`.
   * Higher is closer to the query.
   */
  similarity: number;
}

/** A source handed to the LLM and rendered in the UI, numbered by rank. */
export interface SourceHit {
  pageId: string;
  chunkIndex: number;
  title: string;
  sourceUrl: string;
  provider: Provider;
  content: string;
  similarity: number;
  /** 1-based position in the retrieval result. */
  rank: number;
}

/** Raw, queued chunk before embeddings are computed and rows are written. */
export interface PendingChunk {
  text: string;
  index: number;
  tokenEstimate: number;
}

export interface IngestResult {
  page: WikiPageRecord;
  chunks: number;
  tokens: number;
}

/** What the ingestion pipeline pulled out of a URL before chunking. */
export interface ExtractedPage {
  title: string;
  sourceUrl: string;
  provider: Provider;
  summary: string;
  text: string;
}