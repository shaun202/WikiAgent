import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getConfig,
  hasDatabaseConfig,
  hasOpenAIConfig,
  hasOpenRouterConfig,
  resolveModelName,
} from "./config";
import { EMBEDDING_DIMENSIONS } from "./types";

test("getConfig returns safe defaults for an empty environment", () => {
  const cfg = getConfig({});
  assert.equal(cfg.OPENAI_API_KEY, "stub-replace-me");
  assert.equal(cfg.WIKIAGENT_TOP_K, 6);
  assert.equal(cfg.WIKIAGENT_CHUNK_SIZE, 1000);
  assert.equal(cfg.WIKIAGENT_CHUNK_OVERLAP, 200);
  assert.equal(cfg.WIKIAGENT_EMBEDDING_DIM, EMBEDDING_DIMENSIONS);
  assert.equal(cfg.MODEL_PROVIDER, "openai");
});

test("getConfig coerces numeric tuning knobs", () => {
  const cfg = getConfig({ WIKIAGENT_TOP_K: "4", DATABASE_URL: "postgres://localhost/w" });
  assert.equal(cfg.WIKIAGENT_TOP_K, 4);
  assert.equal(cfg.DATABASE_URL, "postgres://localhost/w");
});

test("getConfig falls back when values are garbage instead of crashing", () => {
  const cfg = getConfig({ WIKIAGENT_TOP_K: "not-a-number" });
  assert.equal(cfg.WIKIAGENT_TOP_K, 6);
});

test("resolveModelName prefers WIKIAGENT_MODEL then MODEL then a default", () => {
  assert.equal(resolveModelName({ WIKIAGENT_MODEL: "gpt-5.6-sol" }), "gpt-5.6-sol");
  assert.equal(resolveModelName({ MODEL: "gpt-4o" }), "gpt-4o");
  assert.equal(resolveModelName({}), "gpt-4o-mini");
});

test("capability guards behave offline", () => {
  assert.equal(hasOpenAIConfig({}), false);
  assert.equal(hasOpenAIConfig({ OPENAI_API_KEY: "sk-real" }), true);
  assert.equal(hasDatabaseConfig({}), false);
  assert.equal(hasDatabaseConfig({ DATABASE_URL: "postgres://" }), true);
  assert.equal(hasOpenRouterConfig({ OPENROUTER_API_KEY: "x" }), true);
});