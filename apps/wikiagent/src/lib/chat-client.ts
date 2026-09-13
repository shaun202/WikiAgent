import type { SourceHit, WikiPageRecord } from "./rag/types";

/** Response shape of GET /api/wiki/status. */
export interface StatusResponse {
  configured: { openai: boolean; database: boolean };
  database: { ok: boolean; detail?: string };
  pages: WikiPageRecord[];
  chunks: number;
}

/** Response shape of POST /api/wiki/ingest and DELETE /api/wiki/pages. */
export interface MutationResponse {
  ok: boolean;
  page?: WikiPageRecord;
  chunks?: number;
  tokens?: number;
  error?: string;
}

/** Events emitted by POST /api/chat (SSE, one JSON object per `data:` line). */
export type ChatEvent =
  | { type: "sources"; sources: SourceHit[] }
  | { type: "delta"; text: string }
  | { type: "done"; answer: string }
  | { type: "error"; message: string };

export interface ChatRequest {
  question: string;
  pageId: string | null;
}

/** Streaming SSE client for the chat endpoint. */
export async function streamChat(
  request: ChatRequest,
  onEvent: (event: ChatEvent) => void,
): Promise<void> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok || !response.body) {
    const fallback = await response.json().catch(() => null);
    throw new Error(fallback?.error ?? `Chat request failed (HTTP ${response.status}).`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const dispatch = (chunk: string) => {
    const trimmed = chunk.trim();
    if (!trimmed.startsWith("data:")) return;
    try {
      onEvent(JSON.parse(trimmed.slice(5).trim()) as ChatEvent);
    } catch {
      // Ignore a malformed line rather than killing the stream.
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let boundary = buffer.indexOf("\n\n");
    while (boundary !== -1) {
      dispatch(buffer.slice(0, boundary));
      buffer = buffer.slice(boundary + 2);
      boundary = buffer.indexOf("\n\n");
    }
  }
  if (buffer.trim()) dispatch(buffer);
}

/** Relative-time label for page cards, e.g. "3m ago". */
export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}