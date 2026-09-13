"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { timeAgo, type MutationResponse } from "@/lib/chat-client";
import { hostOf } from "@/components/citations";
import type { WikiPageRecord } from "@/lib/rag/types";

const SAMPLE_URLS = [
  "https://en.wikipedia.org/wiki/Retrieval-augmented_generation",
  "https://en.wikipedia.org/wiki/PostgreSQL",
  "https://en.wikipedia.org/wiki/Vector_database",
];

export function IndexPanel({
  pages,
  configured,
  databaseOk,
  onChanged,
}: {
  pages: WikiPageRecord[];
  configured: { openai: boolean; database: boolean } | null;
  databaseOk: boolean | null;
  onChanged: () => Promise<void> | void;
}) {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const needsSetup = !configured?.openai || !configured.database || !databaseOk;

  async function submitIngest(event: FormEvent) {
    event.preventDefault();
    if (!url.trim() || busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/wiki/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = (await response.json()) as MutationResponse;
      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? `Indexing failed (HTTP ${response.status}).`);
      }
      setNotice(
        `Indexed “${data.page?.title ?? url}” — ${data.chunks} chunks (${(data.tokens ?? 0).toLocaleString()} tokens).`,
      );
      setUrl("");
      await onChanged();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }

  async function removePage(id: string) {
    if (!window.confirm("Remove this page and its chunks from the index?")) return;
    setDeletingId(id);
    setError(null);
    try {
      const response = await fetch("/api/wiki/pages", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId: id }),
      });
      const data = (await response.json()) as MutationResponse;
      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? `Delete failed (HTTP ${response.status}).`);
      }
      setNotice("Page removed from the index.");
      await onChanged();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex h-full flex-col gap-5">
      <section className="rounded-2xl border border-ink-800 bg-ink-900 p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-neutral-100">Index a wiki page</h2>
            <p className="mt-1 text-xs leading-relaxed text-neutral-500">
              Paste a Wikipedia article or any article-style URL. Content is chunked,
              embedded, and stored in PostgreSQL via pgvector.
            </p>
          </div>
          <span className="shrink-0 rounded-full border border-ink-700 bg-ink-800 px-2.5 py-1 font-mono text-[0.65rem] text-neutral-400">
            {pages.length} page{pages.length === 1 ? "" : "s"}
          </span>
        </div>

        <form onSubmit={submitIngest} className="flex flex-col gap-2">
          <input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://en.wikipedia.org/wiki/RAG"
            disabled={busy}
            aria-label="Wiki page URL"
            className="w-full rounded-lg border border-ink-700 bg-ink-850 px-3.5 py-2.5 text-sm text-neutral-100 placeholder-neutral-600 outline-none transition focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/20 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={busy || !url.trim() || needsSetup}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-3.5 py-2.5 text-sm font-semibold text-ink-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? (
              <>
                <span className="wa-pulse">Fetching, chunking, embedding…</span>
              </>
            ) : (
              <>Index page</>
            )}
          </button>
        </form>

        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[0.7rem] text-neutral-500">
          <span className="mr-1">Try:</span>
          {SAMPLE_URLS.map((sample) => (
            <button
              key={sample}
              type="button"
              onClick={() => {
                setUrl(sample);
                setError(null);
              }}
              className="rounded-full border border-ink-700 bg-ink-800 px-2 py-0.5 text-neutral-400 transition hover:border-amber-500/50 hover:text-amber-300"
            >
              {hostOf(sample)}
            </button>
          ))}
        </div>

        {error ? (
          <div className="wa-pulse mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs leading-relaxed text-rose-300">
            {error}
          </div>
        ) : null}
        {notice ? (
          <div className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs leading-relaxed text-emerald-300">
            {notice}
          </div>
        ) : null}

        {needsSetup ? (
          <div className="mt-4 rounded-lg border border-ink-700 bg-ink-850 p-3 text-[0.7rem] leading-relaxed text-neutral-500">
            <span className="mb-1 block font-semibold uppercase tracking-wider text-neutral-400">
              Setup needed
            </span>
            {!configured?.database || !databaseOk ? (
              <p className="mt-1">
                <code className="text-neutral-300">DATABASE_URL</code> must point at a
                Postgres database with pgvector — <code className="text-neutral-300">docker compose -f apps/wikiagent/docker-compose.yml up -d</code>.
              </p>
            ) : null}
            {!configured?.openai ? (
              <p className="mt-1">
                Add <code className="text-neutral-300">OPENAI_API_KEY</code> to <code>.env</code>.
              </p>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="min-h-0 flex-1">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-200">Indexed pages</h2>
          {pages.length > 0 ? (
            <button
              type="button"
              onClick={() => void onChanged()}
              className="text-xs text-neutral-500 transition hover:text-amber-300"
            >
              Refresh
            </button>
          ) : null}
        </div>

        {pages.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-ink-700 bg-ink-900/40 p-6 text-center text-xs leading-relaxed text-neutral-500">
            Nothing indexed yet.
            <br />
            Index a page above, then ask the assistant about it.
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {pages.map((page) => (
              <li
                key={page.id}
                className="group rounded-xl border border-ink-800 bg-ink-900 p-3.5 transition hover:border-ink-600"
              >
                <div className="flex items-start justify-between gap-2">
                  <a
                    href={page.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="min-w-0 text-sm font-medium text-neutral-100 hover:text-amber-300"
                  >
                    <span className="line-clamp-2">{page.title}</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => void removePage(page.id)}
                    disabled={deletingId === page.id}
                    aria-label={`Remove ${page.title} from the index`}
                    className="rounded-md p-1 text-neutral-600 transition hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-40"
                  >
                    {deletingId === page.id ? (
                      <span className="wa-pulse inline-block h-3 w-3 rounded-full border border-rose-400/50" />
                    ) : (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                      </svg>
                    )}
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.68rem] text-neutral-500">
                  <span className="rounded-full border border-ink-700 bg-ink-800 px-1.5 py-0.5 font-mono uppercase tracking-wide">
                    {page.provider}
                  </span>
                  <span>{page.chunkCount} chunks</span>
                  <span>{page.wordCount.toLocaleString()} words</span>
                  <span>{timeAgo(page.createdAt)}</span>
                  <span className="min-w-0 truncate text-neutral-600">{hostOf(page.sourceUrl)}</span>
                </div>
                {page.summary ? (
                  <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-neutral-500">
                    {page.summary}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}