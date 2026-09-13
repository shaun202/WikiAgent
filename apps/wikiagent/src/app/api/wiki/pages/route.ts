import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { deletePageById } from "@/lib/rag/database";
import { friendlyError } from "@/lib/rag/errors";

export const runtime = "nodejs";

const bodySchema = z.object({ pageId: z.string().uuid("A valid page id is required.") });

export async function DELETE(request: NextRequest) {
  const raw = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
  }

  try {
    const removed = await deletePageById(parsed.data.pageId);
    if (!removed) {
      return NextResponse.json({ ok: false, error: "That page is no longer indexed." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (cause) {
    return NextResponse.json({ ok: false, error: friendlyError(cause).message }, { status: 503 });
  }
}