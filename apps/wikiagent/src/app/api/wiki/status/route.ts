import { NextResponse } from "next/server";
import { hasOpenAIConfig, hasDatabaseConfig } from "@/lib/rag/config";
import { countChunks, healthCheck, listPages } from "@/lib/rag/database";
import type { WikiPageRecord } from "@/lib/rag/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Powers the UI's connection panel: which providers are configured, whether
 * Postgres is reachable, and what is currently indexed.
 */
export async function GET() {
  const database = await healthCheck();
  let pages: WikiPageRecord[] = [];
  let chunks = 0;
  if (database.ok) {
    try {
      pages = await listPages();
      chunks = await countChunks();
    } catch (cause) {
      database.ok = false;
      database.detail = (cause as Error).message;
    }
  }
  return NextResponse.json({
    configured: {
      openai: hasOpenAIConfig(),
      database: hasDatabaseConfig(),
    },
    database,
    pages,
    chunks,
  });
}