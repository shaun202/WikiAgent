import { getChatModel } from "./chat-model";
import { getConfig, hasDatabaseConfig, hasOpenAIConfig } from "./config";
import { friendlyError, requiresSetup } from "./errors";
import { buildRagPrompt } from "./prompt";
import { rankAndLimitHits } from "./sources";
import { searchChunks } from "./vector-search";
import type { SourceHit } from "./types";

export type AnswerEvent =
  | { type: "sources"; sources: SourceHit[] }
  | { type: "delta"; text: string }
  | { type: "done"; answer: string }
  | { type: "error"; message: string };

export interface AnswerRequest {
  question: string;
  /** Optional page filter; when set only that wiki page is searched. */
  pageId?: string | null;
}

/**
 * The retrieval-and-generation loop, exposed as an async generator so API
 * routes can stream NDJSON events straight down the wire.
 *
 *  1. embed the question, retrieve top-K chunks from the pgvector index
 *  2. emit the numbered source list first (UI renders it before the answer)
 *  3. stream model deltas, citing [n] against those sources
 */
export async function* streamRagAnswer(request: AnswerRequest): AsyncGenerator<AnswerEvent> {
  const cfg = getConfig();
  const question = request.question.trim();
  if (!question) {
    yield { type: "error", message: "Ask a question first." };
    return;
  }

  // Pre-flight the pipeline's two hard dependencies so the failure message is
  // the real blocker, not the first call that happens to 401.
  if (!hasOpenAIConfig()) {
    yield {
      type: "error",
      message:
        "OpenAI isn't configured. Add OPENAI_API_KEY to .env and restart — both " +
        "embeddings and answers need it.",
    };
    return;
  }
  if (!hasDatabaseConfig()) {
    yield { type: "error", message: requiresSetup("DATABASE_URL is not set.") };
    return;
  }

  let sources: SourceHit[] = [];
  try {
    const hits = await searchChunks({
      question,
      topK: cfg.WIKIAGENT_TOP_K,
      pageId: request.pageId ?? null,
    });
    sources = rankAndLimitHits(hits, cfg.WIKIAGENT_TOP_K);
  } catch (cause) {
    yield { type: "error", message: friendlyError(cause).message };
    return;
  }

  if (sources.length === 0) {
    yield { type: "sources", sources: [] };
    yield {
      type: "error",
      message:
        request.pageId
          ? "Nothing in that page matched your question. Try a different question or remove the page filter."
          : "Nothing in the index matched your question. Ingest a wiki page first, then ask again.",
    };
    return;
  }

  yield { type: "sources", sources };

  let answer = "";
  try {
    const stream = await getChatModel().stream(buildRagPrompt(question, sources));
    for await (const chunk of stream) {
      const delta = chunk.text ?? "";
      if (!delta) continue;
      answer += delta;
      yield { type: "delta", text: delta };
    }
  } catch (cause) {
    yield { type: "error", message: friendlyError(cause).message };
    return;
  }

  yield { type: "done", answer };
}