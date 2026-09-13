/** Embedding vector size the schema and index are built for. */
export const EMBEDDING_DIMENSIONS = 1536;

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