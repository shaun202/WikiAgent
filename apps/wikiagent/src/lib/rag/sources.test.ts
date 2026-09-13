import { test } from "node:test";
import assert from "node:assert/strict";
import { clampSimilarity, rankAndLimitHits } from "./sources";
import type { ChunkHit } from "./types";

const hit = (overrides: Partial<ChunkHit> = {}): ChunkHit => ({
  id: "c1",
  pageId: "p1",
  chunkIndex: 0,
  content: "Some retrieved text.",
  tokenEstimate: 12,
  title: "RAG",
  sourceUrl: "https://en.wikipedia.org/wiki/RAG",
  provider: "wikipedia",
  similarity: 0.9,
  ...overrides,
});

test("rankAndLimitHits re-ranks best-first and clamps similarity", () => {
  const ranked = rankAndLimitHits(
    [
      hit({ id: "a", similarity: 0.42 }),
      hit({ id: "b", pageId: "p2", chunkIndex: 0, similarity: 1.3 }),
      hit({ id: "c", pageId: "p3", chunkIndex: 0, similarity: 0.61 }),
    ],
    5,
  );
  assert.equal(ranked.length, 3);
  assert.deepEqual(ranked.map((s) => s.rank), [1, 2, 3]);
  assert.deepEqual(ranked.map((s) => s.similarity), [1, 0.61, 0.42]);
});

test("rankAndLimitHits dedupes the same page/chunk and honours the limit", () => {
  const ranked = rankAndLimitHits(
    [
      hit({ id: "a" }),
      hit({ id: "b", content: "duplicate of a" }),
      hit({ id: "c", pageId: "p2", chunkIndex: 2, similarity: 0.5 }),
      hit({ id: "d", pageId: "p3", chunkIndex: 0, similarity: 0.2 }),
    ],
    2,
  );
  // 'a' and 'b' are the same page+chunk, so only one survives.
  assert.equal(ranked.length, 2);
  assert.equal(ranked[0]!.pageId, "p1");
  assert.equal(ranked[1]!.pageId, "p2");
});

test("rankAndLimitHits returns an empty array for no hits", () => {
  assert.deepEqual(rankAndLimitHits([], 5), []);
});

test("clampSimilarity handles NaN and out-of-range values", () => {
  assert.equal(clampSimilarity(Number.NaN), 0);
  assert.equal(clampSimilarity(-0.4), 0);
  assert.equal(clampSimilarity(1.7), 1);
  assert.equal(clampSimilarity(0.55), 0.55);
});