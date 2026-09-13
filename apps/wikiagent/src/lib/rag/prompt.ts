import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { SourceHit } from "./types";

/**
 * The answerer is given source excerpts in the numbered format below and is
 * told to cite them inline as [1], [2], …  The UI renders those markers as
 * tappable chips against the numbered source list.
 */
export const SYSTEM_PROMPT = `You are WikiAgent, a grounded research assistant that answers questions from a corpus of indexed wiki pages.

Follow these rules strictly:

1. Answer the user's question using ONLY the numbered source excerpts below.
2. Cite the source for every factual claim you make by appending the source
   number in brackets, e.g. "The Rīga Metro was planned in the 1990s [1]."
3. If the sources do not contain the answer, say so plainly and do not guess.
4. If the sources give conflicting details, summarise the disagreement and
   cite each side.
5. Keep the answer concise but complete. Use short paragraphs or bullets when
   that helps readability.
6. Never mention the internal retrieval mechanism, embeddings, or "my
   training data". You answer from the provided sources only.`;

/** Serialize retrieved chunks into the numbered block injected into the prompt. */
export function buildContextBlock(sources: SourceHit[]): string {
  const lines = sources.map((source) => {
    const heading = `[${source.rank}] ${source.title} — ${source.sourceUrl}`;
    return `${heading}\n${source.content}`;
  });
  return `Sources:\n\n${lines.join("\n\n")}`;
}

/**
 * Assemble the final system/human exchange. Kept as a pure function so the
 * exact prompt presented to the model is testable offline.
 */
export function buildRagPrompt(question: string, sources: SourceHit[]): (SystemMessage | HumanMessage)[] {
  const contextBlock = buildContextBlock(sources);
  return [
    new SystemMessage(`${SYSTEM_PROMPT}\n\n${contextBlock}`),
    new HumanMessage(question),
  ];
}