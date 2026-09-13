import assert from "node:assert/strict";
import { test } from "node:test";
import { searchWiki, wikiCatalog } from "./wiki";

test("searchWiki understands a natural contractor access question", () => {
  const results = searchWiki("How long can a contractor keep production permission?", 3);
  assert.equal(results[0]?.id, "access-requests");
  assert.equal(results[0]?.updated, "2026-09-04");
  assert.match(results[0]?.excerpt ?? "", /seven days/);
});

test("wikiCatalog exposes the demo library without article content", () => {
  const catalog = wikiCatalog();
  assert.equal(catalog.length, 6);
  assert.ok(catalog.some((page) => page.id === "northstar-overview"));
  assert.equal("excerpt" in catalog[0], false);
});
