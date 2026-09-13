import { test } from "node:test";
import assert from "node:assert/strict";
import { buildContextBlock, buildRagPrompt, SYSTEM_PROMPT } from "./prompt";
import type { SourceHit } from "./types";

const source = (overrides: Partial<SourceHit> = {}): SourceHit => ({
  pageId: "p1",
  chunkIndex: 0,
  title: "RAG",
  sourceUrl: "https://en.wikipedia.org/wiki/RAG",
  provider: "wikipedia",
  content: "Retrieval-augmented generation combines retrieval with generation.",
  similarity: 0.91,
  rank: 1,
  ...overrides,
});

test("buildContextBlock numbers sources in order", () => {
  const block = buildContextBlock([source(), source({ rank: 2, chunkIndex: 1, content: "Second chunk." })]);
  assert.match(block, /^Sources:/);
  assert.match(block, /\[1\] RAG — https:\/\/en\.wikipedia\.org\/wiki\/RAG/);
  assert.match(block, /\[2\] RAG — https:\/\/en\.wikipedia\.org\/wiki\/RAG/);
  assert.match(block, /Second chunk\.$/);
});

test("buildRagPrompt returns a system + human pair with the citation rule", () => {
  const messages = buildRagPrompt("What is RAG?", [source()]);
  const system = messages[0]!;
  const human = messages[1]!;
  assert.equal(system.constructor.name, "SystemMessage");
  assert.equal(human.constructor.name, "HumanMessage");
  const systemText = String(system.content);
  assert.match(systemText, /cite the source/i);
  assert.match(systemText, /\[1\]/);
  assert.match(systemText, /Retrieval-augmented generation combines retrieval/);
  assert.equal(String(human.content), "What is RAG?");
});

test("SYSTEM_PROMPT forbids hallucination", () => {
  assert.match(SYSTEM_PROMPT, /do not guess/);
  assert.match(SYSTEM_PROMPT, /provided sources only/);
});