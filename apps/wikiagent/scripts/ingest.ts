import { ingestWikiPage } from "../src/lib/rag/ingest";

/**
 * One-off ingestion from the command line.
 *
 *   npm run ingest --workspace wikiagent -- "https://en.wikipedia.org/wiki/Retrieval-augmented generation"
 */
async function main(): Promise<void> {
  const url = process.argv[2];
  if (!url) {
    console.error(
      'Usage: npm run ingest --workspace wikiagent -- "https://en.wikipedia.org/wiki/<Your topic>"',
    );
    process.exit(1);
  }
  const startedAt = Date.now();
  const result = await ingestWikiPage(url);
  const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(
    JSON.stringify(
      {
        ok: true,
        title: result.page.title,
        sourceUrl: result.page.sourceUrl,
        chunks: result.chunks,
        tokens: result.tokens,
        tookSeconds: seconds,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error("[wikiagent] ingest failed:", (err as Error).message);
  process.exit(1);
});