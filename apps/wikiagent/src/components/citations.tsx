import type { ReactNode } from "react";
import type { SourceHit } from "@/lib/rag/types";

/**
 * Render answer text while turning `[n]` citation markers into amber superscript
 * chips that hint at the numbered source list rendered under the message.
 */
export function renderWithCitations(text: string, sources: SourceHit[] | null): ReactNode[] {
  const parts = text.split(/(\[\d+\])/g).filter((part) => part.length > 0);
  const canCite = (n: number) => (sources?.length ?? 0) >= n && n >= 1;

  return parts.map((part, index) => {
    const match = /^\[(\d+)\]$/.exec(part);
    if (!match || !canCite(Number(match[1]))) return <span key={index}>{part}</span>;
    const number = Number(match[1]);
    const source = sources?.[number - 1];
    return (
      <a
        key={index}
        href={source?.sourceUrl ?? "#"}
        target="_blank"
        rel="noreferrer"
        title={(source?.title ?? "Source") + (source ? ` — ${source.sourceUrl}` : "")}
        className="mx-0.5 inline-flex h-4 items-center rounded bg-amber-500/15 px-1 align-baseline font-mono text-[0.7rem] leading-none text-amber-400 no-underline ring-1 ring-inset ring-amber-500/25 transition hover:bg-amber-500/25"
      >
        {number}
      </a>
    );
  });
}

export function similarityLabel(value: number): string {
  return `${Math.round(value * 1000) / 10}%`;
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}