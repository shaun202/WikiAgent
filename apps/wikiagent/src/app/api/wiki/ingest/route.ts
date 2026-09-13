import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { friendlyError, WikiAgentError } from "@/lib/rag/errors";
import { ingestWikiPage } from "@/lib/rag/ingest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({ url: z.string().min(1, "A url is required.") });

export async function POST(request: NextRequest) {
  const raw = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
  }

  try {
    const result = await ingestWikiPage(parsed.data.url);
    return NextResponse.json({ ok: true, ...result });
  } catch (cause) {
    const error = friendlyError(cause);
    const isInfra = error instanceof WikiAgentError;
    return NextResponse.json(
      { ok: false, error: error.message, code: error instanceof WikiAgentError ? error.code : "bad-input" },
      { status: isInfra ? 503 : 400 },
    );
  }
}