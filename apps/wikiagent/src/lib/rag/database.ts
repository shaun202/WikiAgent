import { Pool, type PoolClient, type QueryResultRow } from "pg";
import { getConfig } from "./config";
import { SCHEMA_DDL } from "./schema-ddl";
import type { Provider, WikiPageRecord } from "./types";

/**
 * A tiny data layer over the `pg` pool.
 *
 * Motivation: a real RAG app owns its retrieval SQL. We hand-write the
 * schema and the vector query (HNSW index, cosine distance, page filter)
 * instead of routing them through an ORM, which keeps the query UNNESTably
 * simple, index-friendly, and unit-testable.
 */

let pool: Pool | null = null;
let schemaReady: Promise<void> | null = null;

export function getPool(): Pool {
  const { DATABASE_URL } = getConfig();
  if (!DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is not set. Start the database (see apps/wikiagent/README.md) " +
        "and add DATABASE_URL to .env.",
    );
  }
  if (!pool) {
    pool = new Pool({
      connectionString: DATABASE_URL,
      max: 10,
      connectionTimeoutMillis: 5_000,
      idleTimeoutMillis: 30_000,
    });
    // Avoid leaking a stalled pool across hot reloads in dev.
    pool.on("error", (err) => {
      console.error("[wikiagent] idle postgres client error:", err.message);
    });
  }
  return pool;
}

/** Apply the schema once per process. Safe to call repeatedly. */
export async function ensureSchema(client: Pool = getPool()): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      await client.query(SCHEMA_DDL);
    })().catch((err) => {
      schemaReady = null;
      throw new Error(`Could not initialise database schema: ${(err as Error).message}`);
    });
  }
  await schemaReady;
}

export async function healthCheck(): Promise<{ ok: boolean; detail?: string }> {
  try {
    const poolClient = getPool();
    const result = await poolClient.query<{ now: string }>("SELECT now() AS now");
    return { ok: true, detail: result.rows[0]?.now };
  } catch (err) {
    return { ok: false, detail: (err as Error).message };
  }
}

const PAGE_COLUMNS = `
  id, title, source_url, provider, summary, word_count, chunk_count, created_at
` as const;

function mapPageRow(row: QueryResultRow): WikiPageRecord {
  return {
    id: row.id,
    title: row.title,
    sourceUrl: row.source_url,
    provider: row.provider as Provider,
    summary: row.summary,
    wordCount: Number(row.word_count),
    chunkCount: Number(row.chunk_count),
    createdAt: row.created_at,
  };
}

export async function listPages(): Promise<WikiPageRecord[]> {
  const poolClient = getPool();
  await ensureSchema(poolClient);
  const result = await poolClient.query(`SELECT ${PAGE_COLUMNS} FROM wiki_pages ORDER BY created_at DESC`);
  return result.rows.map(mapPageRow);
}

export async function upsertPage(input: {
  title: string;
  sourceUrl: string;
  provider: Provider;
  summary: string;
  wordCount: number;
}): Promise<WikiPageRecord> {
  const poolClient = getPool();
  await ensureSchema(poolClient);
  // A re-ingest of the same source URL overwrites the record but keeps its id,
  // so chunk_count starts fresh and old chunks can be dropped by page_id.
  const result = await poolClient.query(
    `
    INSERT INTO wiki_pages (title, source_url, provider, summary, word_count)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (source_url) DO UPDATE
      SET title = EXCLUDED.title,
          provider = EXCLUDED.provider,
          summary = EXCLUDED.summary,
          word_count = EXCLUDED.word_count,
          updated_at = now()
    RETURNING ${PAGE_COLUMNS}
    `,
    [input.title, input.sourceUrl, input.provider, input.summary, input.wordCount],
  );
  return mapPageRow(result.rows[0]!);
}

/** Replace every chunk for a page. Intended to run inside a transaction. */
export async function replacePageChunks(
  client: PoolClient,
  pageId: string,
  chunks: Array<{ index: number; text: string; tokenEstimate: number; metadata: Record<string, unknown>; embedding: number[] }>,
): Promise<void> {
  await client.query(`DELETE FROM wiki_chunks WHERE page_id = $1`, [pageId]);
  if (chunks.length === 0) return;

  // One batched COPY-style insert. The vector is passed as pgvector's text
  // literal and cast, which is exactly what the driver expects for this type.
  const valueClauses: string[] = [];
  const parameters: unknown[] = [];
  const vectorize = (values: number[]) => `[${values.join(",")}]`;
  chunks.forEach((chunk) => {
    const offset = parameters.length;
    valueClauses.push(
      `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}::vector)`,
    );
    parameters.push(
      pageId,
      chunk.index,
      chunk.text,
      chunk.tokenEstimate,
      JSON.stringify(chunk.metadata),
      vectorize(chunk.embedding),
    );
  });

  await client.query(
    `
    INSERT INTO wiki_chunks
      (page_id, chunk_index, content, token_estimate, metadata, embedding)
    VALUES ${valueClauses.join(", ")}
    `,
    parameters,
  );

  await client.query(`UPDATE wiki_pages SET chunk_count = $2, updated_at = now() WHERE id = $1`, [
    pageId,
    chunks.length,
  ]);
}

export async function deletePageById(pageId: string): Promise<boolean> {
  const poolClient = getPool();
  await ensureSchema(poolClient);
  const result = await poolClient.query(`DELETE FROM wiki_pages WHERE id = $1`, [pageId]);
  return (result.rowCount ?? 0) > 0;
}

export async function countChunks(): Promise<number> {
  const poolClient = getPool();
  await ensureSchema(poolClient);
  const result = await poolClient.query<{ count: string }>(`SELECT count(*)::text AS count FROM wiki_chunks`);
  return Number(result.rows[0]?.count ?? 0);
}