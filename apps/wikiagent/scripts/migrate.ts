import { countChunks, ensureSchema, getPool } from "../src/lib/rag/database";

/**
 * Apply (and self-heal) the schema before the app serves traffic.
 * Idempotent, so safe to run any number of times.
 *
 *   npm run migrate --workspace wikiagent
 */
async function main(): Promise<void> {
  const pool = getPool();
  await ensureSchema(pool);
  const chunkCount = await countChunks();
  console.log("[wikiagent] schema ready; indexed chunks:", chunkCount);
  process.exitCode = 0;
}

main().catch((err) => {
  console.error("[wikiagent] migration failed:", (err as Error).message);
  process.exitCode = 1;
});