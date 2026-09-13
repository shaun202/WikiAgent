"use client";

import { useEffect, useRef, useState } from "react";
import { streamChat } from "@/lib/chat-client";
import { renderWithCitations, similarityLabel } from "@/components/citations";
import type { SourceHit, WikiPageRecord } from "@/lib/rag/types";

interface Message {
  role: "user" | "assistant";
  content: string;
  sources: SourceHit[] | null;
}

interface LiveStream {
  sources: SourceHit[];
  text: string;
  error?: string;
}

export function ChatPanel({ pages }: { pages: WikiPageRecord[] }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [scope, setScope] = useState<string>("all");
  const [streaming, setStreaming] = useState(false);
  const [live, setLive] = useState<LiveStream | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // If the scoped page disappears, fall back to the whole corpus.
  useEffect(() => {
    if (scope !== "all" && !pages.some((page) => page.id === scope)) {
      setScope("all");
    }
  }, [pages, scope]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, live]);

  const firstPage = pages[0];

  async function send(question: string) {
    const clean = question.trim();
    if (!clean || streaming) return;

    setMessages((prev) => [...prev, { role: "user", content: clean, sources: null }]);
    setInput("");
    setRequestError(null);
    setStreaming(true);
    setLive({ sources: [], text: "" });

    let text = "";
    let sources: SourceHit[] = [];
    try {
      await streamChat(
        { question: clean, pageId: scope === "all" ? null : scope },
        (event) => {
          if (event.type === "sources") {
            sources = event.sources;
            setLive((current) => ({ ...(current ?? { text: "" }), sources: event.sources }));
          } else if (event.type === "delta") {
            text += event.text;
            setLive((current) => ({ sources: current?.sources ?? [], text }));
          } else if (event.type === "error") {
            setLive((current) => ({
              sources: current?.sources ?? [],
              text: current?.text ?? "",
              error: event.message,
            }));
          }
        },
      );
    } catch (cause) {
      setLive((current) => ({
        sources: current?.sources ?? [],
        text: current?.text ?? "",
        error: cause instanceof Error ? cause.message : String(cause),
      }));
    }

    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: text,
        sources: sources.length > 0 ? sources : null,
      },
    ]);
    setLive(null);
    setStreaming(false);
    inputRef.current?.focus();
  }

  const suggestions =
    messages.length === 0
      ? [
          firstPage
            ? `Summarise ${firstPage.title} in five bullets.`
            : "Index a wiki page first — then ask me anything about it.",
          "What key ideas are covered in this index?",
          "Ask me a specific question about one of the pages.",
        ]
      : [];

  return (
    <div className="flex h-full min-h-[540px] flex-col overflow-hidden rounded-2xl border border-ink-800 bg-ink-900">
      {/* Header + scope */}
      <div className="flex flex-wrap items-center gap-3 border-b border-ink-800 px-5 py-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-neutral-100">Ask WikiAgent</h2>
          <p className="mt-0.5 text-xs text-neutral-500">
            Answers are grounded in the index and cite their sources.
          </p>
        </div>
        <label className="flex items-center gap-2 text-xs text-neutral-500">
          <span className="hidden sm:inline">Look in</span>
          <select
            value={scope}
            onChange={(event) => setScope(event.target.value)}
            className="max-w-48 rounded-lg border border-ink-700 bg-ink-850 px-2.5 py-1.5 text-xs text-neutral-200 outline-none transition focus:border-amber-500/60"
          >
            <option value="all">All pages ({pages.length})</option>
            {pages.map((page) => (
              <option key={page.id} value={page.id}>
                {page.title}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
        {messages.length === 0 && !streaming ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 text-2xl">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#f5b942" strokeWidth="1.7" strokeLinecap="round">
                <path d="M12 3l1.8 4.6L18 9.4l-4.2 1.8L12 16l-1.8-4.8L6 9.4l4.2-1.8z" />
                <path d="M19 14l.9 2.3 2.1.7-2.1.7-.9 2.3-.9-2.3-2.1-.7 2.1-.7z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-200">Ready to answer from your wiki</p>
              <p className="mt-1 text-xs text-neutral-500">
                Pick a page scope, then ask a question. Citations [n] map to sources below the answer.
              </p>
            </div>
          </div>
        ) : null}

        {messages.map((message, index) => (
          <div key={index} className="space-y-2.5">
            <div
              className={
                message.role === "user"
                  ? "ml-auto w-fit max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-amber-500/15 px-4 py-2.5 text-sm leading-relaxed text-amber-100 ring-1 ring-inset ring-amber-500/25"
                  : "w-fit max-w-[95%] whitespace-pre-wrap rounded-2xl rounded-bl-md border border-ink-700 bg-ink-850 px-4 py-2.5 text-sm leading-relaxed text-neutral-200"
              }
            >
              {message.role === "assistant" && message.sources
                ? renderWithCitations(message.content, message.sources)
                : message.content}
            </div>

            {message.role === "assistant" && message.sources && message.sources.length > 0 ? (
              <SourceList sources={message.sources} />
            ) : null}
          </div>
        ))}

        {streaming && live ? (
          <div className="space-y-2.5">
            <div className="w-fit max-w-[95%] whitespace-pre-wrap rounded-2xl rounded-bl-md border border-ink-700 bg-ink-850 px-4 py-2.5 text-sm leading-relaxed text-neutral-200">
              {live.sources.length > 0 ? renderWithCitations(live.text, live.sources) : live.text}
              <span className={`${live.text ? "wa-caret" : "wa-pulse"}`}>
                {!live.text ? "Retrieving and answering…" : ""}
              </span>
            </div>
            {live.sources.length > 0 ? (
              <SourceList sources={live.sources} live />
            ) : (
              <div className="flex gap-2 px-1">
                <div className="wa-skeleton h-2.5 w-32 rounded" />
                <div className="wa-skeleton h-2.5 w-20 rounded" />
              </div>
            )}
            {live.error ? (
              <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs leading-relaxed text-rose-300">
                {live.error}
              </div>
            ) : null}
          </div>
        ) : null}

        {requestError ? (
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs leading-relaxed text-rose-300">
            {requestError}
          </div>
        ) : null}

        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {messages.length === 0 && !streaming ? (
        <div className="flex flex-wrap gap-2 border-t border-ink-800 px-5 py-3">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              disabled={!firstPage}
              onClick={() => void send(suggestion)}
              className="rounded-full border border-ink-700 bg-ink-850 px-3 py-1.5 text-xs text-neutral-400 transition hover:border-amber-500/50 hover:text-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {suggestion}
            </button>
          ))}
        </div>
      ) : null}

      {/* Input */}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void send(input);
        }}
        className="flex items-center gap-2.5 border-t border-ink-800 px-5 py-3.5"
      >
        <input
          ref={inputRef}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={
            pages.length === 0
              ? "Index a page on the left first…"
              : scope === "all"
                ? `Ask about any of ${pages.length} indexed page${pages.length === 1 ? "" : "s"}…`
                : `Ask about the selected page…`
          }
          disabled={streaming || pages.length === 0}
          className="min-w-0 flex-1 rounded-lg border border-ink-700 bg-ink-850 px-3.5 py-2.5 text-sm text-neutral-100 placeholder-neutral-600 outline-none transition focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/20 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={streaming || !input.trim() || pages.length === 0}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-ink-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Ask"
        >
          {streaming ? (
            <span className="wa-pulse inline-block h-4 w-4 rounded-full border-2 border-ink-950/60" />
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          )}
        </button>
      </form>
    </div>
  );
}

function SourceList({ sources, live }: { sources: SourceHit[]; live?: boolean }) {
  return (
    <div className="space-y-1.5 pl-1">
      <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-neutral-600">
        {live ? "Sources · retrieving…" : "Sources"}
      </p>
      <div className="grid gap-1.5">
        {sources.map((source) => (
          <a
            key={`${source.pageId}-${source.chunkIndex}`}
            href={source.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="group flex items-start gap-2.5 rounded-lg border border-ink-800 bg-ink-900 px-3 py-2 transition hover:border-amber-500/40"
          >
            <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded bg-amber-500/15 font-mono text-[0.65rem] text-amber-400">
              {source.rank}
            </span>
            <span className="min-w-0 flex-1">
              <span className="line-clamp-1 block text-xs font-medium text-neutral-200 group-hover:text-amber-300">
                {source.title}
              </span>
              <span className="line-clamp-1 block text-[0.65rem] text-neutral-500">
                {source.provider} · similarity {similarityLabel(source.similarity)}
              </span>
              <span className="mt-0.5 line-clamp-2 block text-[0.7rem] leading-relaxed text-neutral-500">
                {source.content}
              </span>
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}