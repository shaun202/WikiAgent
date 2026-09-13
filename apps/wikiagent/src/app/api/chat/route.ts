import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { streamRagAnswer } from "@/lib/rag/answer";
import { friendlyError } from "@/lib/rag/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const bodySchema = z.object({
  question: z.string().min(1, "Ask a question.").max(4000),
  pageId: z.string().uuid("Invalid page filter.").optional().nullable(),
});

type AnswerEvent =
  | { type: "sources"; sources: unknown }
  | { type: "delta"; text: string }
  | { type: "done"; answer: string }
  | { type: "error"; message: string };

/**
 * SSE endpoint. Each event is a JSON `data:` line:
 *   data: {"type":"sources","sources":[...]}
 *   data: {"type":"delta","text":"..."}
 *   data: {"type":"done","answer":"..."}
 */
export async function POST(request: NextRequest) {
  const raw = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const enqueue = (payload: AnswerEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };
      try {
        for await (const event of streamRagAnswer({
          question: parsed.data.question,
          pageId: parsed.data.pageId ?? null,
        })) {
          enqueue(event);
        }
      } catch (cause) {
        enqueue({ type: "error", message: friendlyError(cause).message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
      Connection: "keep-alive",
    },
  });
}