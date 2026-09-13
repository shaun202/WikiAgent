"use client";

import { useCallback, useEffect, useState } from "react";
import { StatusBar } from "@/components/status-bar";
import { IndexPanel } from "@/components/index-panel";
import { ChatPanel } from "@/components/chat-panel";
import type { StatusResponse } from "@/lib/chat-client";

export default function Home() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/wiki/status");
      if (response.ok) setStatus((await response.json()) as StatusResponse);
    } catch {
      // Network hiccup; keep the last known status.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 pb-5 pt-7">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f5b942" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-base font-semibold tracking-tight text-neutral-50">
              WikiAgent
            </h1>
            <p className="text-xs text-neutral-500">
              Grounded answers from your wiki · pgvector RAG
            </p>
          </div>
        </div>
        <span className="hidden rounded-full border border-ink-700 bg-ink-900 px-3 py-1 font-mono text-[0.65rem] text-neutral-500 sm:inline-block">
          AI Tinkerers · Agents, Everywhere
        </span>
      </header>

      <StatusBar status={status} loading={loading} />

      <main className="mx-auto grid w-full max-w-6xl flex-1 gap-5 px-5 py-5 lg:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="min-h-0">
          <IndexPanel
            pages={status?.pages ?? []}
            configured={status?.configured ?? null}
            databaseOk={status?.database.ok ?? null}
            onChanged={refresh}
          />
        </aside>
        <section className="min-h-0">
          <ChatPanel pages={status?.pages ?? []} />
        </section>
      </main>

      <footer className="mx-auto w-full max-w-6xl px-5 pb-6 text-center text-[0.65rem] text-neutral-600">
        WikiAgent retrieves chunks from a pgvector index and writes grounded answers with
        inline citations. Answers stay honest — if the index has no answer, it says so.
      </footer>
    </div>
  );
}