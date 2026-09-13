import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { renderToIR } from "@copilotkit/channels";
import { SourceList, WikiCard } from "./components";

const ctx = { platform: "slack" as const, signal: new AbortController().signal };

async function render(node: unknown): Promise<string> {
  return JSON.stringify(renderToIR((await node) as never));
}

describe("wiki_card", () => {
  it("renders the answer, citations, and caveat", async () => {
    const output = await render(WikiCard.render({
      answer: "Temporary access expires after seven days.",
      citations: ["access-requests"],
      caveat: "The system owner may renew it.",
    }, ctx));
    assert.match(output, /seven days/);
    assert.match(output, /access-requests/);
    assert.match(output, /renew/);
  });
});

describe("source_list", () => {
  it("renders retrieved page titles and excerpts", async () => {
    const output = await render(SourceList.render({
      sources: [{ id: "deployments", title: "Deployments and rollback", section: "Engineering handbook", excerpt: "Watch latency after release." }],
    }, ctx));
    assert.match(output, /Deployments and rollback/);
    assert.match(output, /Watch latency/);
    assert.match(output, /1 retrieved page/);
  });
});
