"use client";

import type { StatusResponse } from "@/lib/chat-client";

function Dot({ ok }: { ok: boolean }) {
  return (
    <span
      className={`h-2 w-2 rounded-full ${ok ? "bg-emerald-400" : "bg-rose-400"}`}
      aria-hidden
    />
  );
}

export function StatusBar({
  status,
  loading,
}: {
  status: StatusResponse | null;
  loading: boolean;
}) {
  const embeddings = status?.configured.embeddings;
  const embeddingsOk = embeddings === "local" ? true : Boolean(status?.configured.openai);
  const chatOk = Boolean(status?.configured.openrouter || status?.configured.openai);
  const databaseConfigured = status?.configured.database;
  const databaseOk = status?.database.ok;

  return (
    <div className="border-b border-ink-800 bg-ink-900/60">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3 text-xs text-neutral-400">
        <span className="inline-flex items-center gap-2">
          <Dot ok={embeddingsOk} />
          {loading
            ? "Checking…"
            : embeddings === "local"
              ? "Embeddings: local (on-device)"
              : embeddingsOk
                ? "Embeddings: OpenAI key set"
                : "Embeddings: OpenAI key missing"}
        </span>
        <span className="inline-flex items-center gap-2">
          <Dot ok={chatOk} />
          {loading
            ? "Checking…"
            : chatOk
              ? status?.configured.openrouter
                ? "Chat: OpenRouter key set"
                : "Chat: OpenAI key set"
              : "Chat: model key missing"}
        </span>
        <span className="inline-flex items-center gap-2">
          <Dot ok={Boolean(databaseConfigured && databaseOk)} />
          {loading
            ? "Checking…"
            : !databaseConfigured
              ? "Database not configured"
              : databaseOk
                ? "Postgres connected"
                : "Postgres unreachable"}
        </span>
        <span className="hidden items-center gap-2 sm:inline-flex">
          <span className="h-2 w-2 rounded-full bg-ink-600" aria-hidden />
          {loading
            ? "Loading index…"
            : `${status?.pages.length ?? 0} page${(status?.pages.length ?? 0) === 1 ? "" : "s"} · ${status?.chunks ?? 0} chunks`}
        </span>
        {databaseConfigured && !databaseOk && status?.database.detail ? (
          <span className="min-w-0 truncate font-mono text-[0.7rem] text-rose-300/80">
            {status.database.detail}
          </span>
        ) : null}
      </div>
    </div>
  );
}