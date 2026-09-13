import type { PoolClient } from "pg";
import { getConfig } from "./config";
import { chunkText } from "./chunking";
import { getPool, replacePageChunks, ensureSchema, upsertPage } from "./database";
import { getEmbeddings } from "./embeddings";
import { extractPage } from "./extract";
import { friendlyError } from "./errors";
import type { IngestResult } from "./types";

/**
 * The full ingestion pipeline: fetch → extract → chunk → embed → store.
 *
 * Re-indexing the same source URL replaces that page's chunks in one
 * transaction, so the index stays an exact mirror of what was submitted.
 */
export async function ingestWikiPage(rawUrl: string): Promise<IngestResult> {
  const cfg = getConfig();
  const url = rawUrl.trim();
  if (!url) throw new Error("Enter a page URL to index.");

  let extracted;
  try {
    extracted = await extractPage(url);
  } catch (cause) {
    throw friendlyError(cause);
  }

  const pending = await chunkText(extracted.text, {
    chunkSize: cfg.WIKIAGENT_CHUNK_SIZE,
    chunkOverlap: cfg.WIKIAGENT_CHUNK_OVERLAP,
  });
  if (pending.length === 0) {
    throw new Error(`No readable content was extracted from ${url}.`);
  }
  if (pending.length > cfg.WIKIAGENT_MAX_CHUNKS) {
    throw new Error(
      `That page would index as ${pending.length} chunks, above the limit of ` +
        `${cfg.WIKIAGENT_MAX_CHUNKS}. Pick a more focused article.`,
    );
  }

  const vectors = await getEmbeddings().embedDocuments(pending.map((chunk) => chunk.text));
  if (vectors.length !== pending.length) {
    throw new Error("Embedding API returned a mismatched batch.");
  }

  const pool = getPool();
  await ensureSchema(pool);

  const wordCount = extracted.text.split(/\s+/).filter(Boolean).length;
  const page = await upsertPage({
    title: extracted.title,
    sourceUrl: extracted.sourceUrl,
    provider: extracted.provider,
    summary: extracted.summary,
    wordCount,
  });

  const client: PoolClient = await pool.connect();
  try {
    await client.query("BEGIN");
    await replacePageChunks(
      client,
      page.id,
      pending.map((chunk, i) => ({
        index: chunk.index,
        text: chunk.text,
        tokenEstimate: chunk.tokenEstimate,
        metadata: {
          page_id: page.id,
          chunk_index: chunk.index,
          title: extracted.title,
          source_url: extracted.sourceUrl,
          provider: extracted.provider,
        },
        embedding: vectors[i]!,
      })),
    );
    await client.query("COMMIT");
  } catch (cause) {
    await client.query("ROLLBACK");
    throw friendlyError(cause);
  } finally {
    client.release();
  }

  const tokens = pending.reduce((sum, chunk) => sum + chunk.tokenEstimate, 0);
  return {
    page: { ...page, chunkCount: pending.length },
    chunks: pending.length,
    tokens,
  };
}