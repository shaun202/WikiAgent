import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildMediaWikiExtractUrl,
  extractFromApiResponse,
  parseWikiUrl,
  summarize,
} from "./wikipedia";

test("parseWikiUrl: canonical English article", () => {
  const target = parseWikiUrl("https://en.wikipedia.org/wiki/Retrieval-augmented_generation");
  assert.ok(target, "should be recognised as wikipedia");
  assert.equal(target!.locale, "en");
  assert.equal(target!.title, "Retrieval-augmented generation");
  assert.equal(
    target!.sourceUrl,
    "https://en.wikipedia.org/wiki/Retrieval-augmented_generation",
  );
});

test("parseWikiUrl: non-English locale", () => {
  const target = parseWikiUrl("https://de.wikipedia.org/wiki/OpenAI");
  assert.ok(target);
  assert.equal(target!.locale, "de");
  assert.equal(target!.title, "OpenAI");
});

test("parseWikiUrl: mobile and www hosts normalise to the locale", () => {
  const mobile = parseWikiUrl("https://en.m.wikipedia.org/wiki/Postgres");
  assert.ok(mobile);
  assert.equal(mobile!.locale, "en");

  const www = parseWikiUrl("https://www.wikipedia.org/wiki/Test");
  assert.equal(www!.locale, "en");
});

test("parseWikiUrl: percent-encoded titles are decoded", () => {
  const target = parseWikiUrl("https://en.wikipedia.org/wiki/Machine%20learning");
  assert.ok(target);
  assert.equal(target!.title, "Machine learning");
});

test("parseWikiUrl: non-wiki and malformed URLs are rejected", () => {
  assert.equal(parseWikiUrl("https://example.com/wiki/foo"), null);
  assert.equal(parseWikiUrl("https://en.wikipedia.org/not-a-wiki"), null);
  assert.equal(parseWikiUrl("not a url at all"), null);
});

test("buildMediaWikiExtractUrl points at the plain-text extract API", () => {
  const target = parseWikiUrl("https://en.wikipedia.org/wiki/RAG")!;
  const url = buildMediaWikiExtractUrl(target);
  const parsed = new URL(url);
  assert.equal(parsed.hostname, "en.wikipedia.org");
  assert.equal(parsed.searchParams.get("action"), "query");
  assert.equal(parsed.searchParams.get("prop"), "extracts");
  assert.equal(parsed.searchParams.get("explaintext"), "1");
  assert.equal(parsed.searchParams.get("redirects"), "1");
  assert.equal(parsed.searchParams.get("titles"), "RAG");
});

test("extractFromApiResponse: extracts page text (formatversion 2)", () => {
  const json = {
    query: {
      pages: [{ pageid: 1, title: "RAG", extract: "Retrieval-augmented generation." }],
    },
  };
  const page = extractFromApiResponse(json);
  assert.ok(page);
  assert.equal(page!.title, "RAG");
  assert.equal(page!.text, "Retrieval-augmented generation.");
});

test("extractFromApiResponse: returns null for missing pages", () => {
  const json = { query: { pages: [{ title: "Nope", missing: true }] } };
  assert.equal(extractFromApiResponse(json), null);
  assert.equal(extractFromApiResponse({}), null);
});

test("summarize: short text passes through unchanged", () => {
  const text = "A short description of a page.";
  assert.equal(summarize(text), text);
});

test("summarize: long text is capped with an ellipsis", () => {
  const long = "word ".repeat(200).trim();
  const summary = summarize(long, 100);
  assert.ok(summary.length <= 110, "stays roughly inside the budget");
  assert.ok(summary.endsWith("…"), "signals truncation");
});