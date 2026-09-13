import { test } from "node:test";
import assert from "node:assert/strict";
import { chunkText, estimateTokens, normalizeWhitespace } from "./chunking";

test("estimateTokens: ~4 chars per token", () => {
  assert.equal(estimateTokens("hello"), 2);
  assert.equal(estimateTokens("  hello world  "), 3);
  assert.equal(estimateTokens(""), 0);
});

test("normalizeWhitespace: collapses spacing", () => {
  assert.equal(normalizeWhitespace("  a\n\n  b\t c "), "a b c");
});

test("chunkText: splits long text into overlapping chunks", async () => {
  const longText = "Paragraph one. ".repeat(50) + "\n\n" + "Paragraph two. ".repeat(50);
  const chunks = await chunkText(longText, { chunkSize: 200, chunkOverlap: 40 });

  assert.ok(chunks.length > 1, "long text should be split");
  assert.ok(chunks.every((c) => c.text.length > 0));
  assert.equal(chunks[0]!.index, 0);
  assert.ok(chunks.every((c) => c.tokenEstimate > 0));
});

test("chunkText: keeps a short text as a single chunk", async () => {
  const chunks = await chunkText("Just a line.", { chunkSize: 200, chunkOverlap: 40 });
  assert.equal(chunks.length, 1);
  assert.equal(chunks[0]!.text, "Just a line.");
});