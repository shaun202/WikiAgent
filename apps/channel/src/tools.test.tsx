import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import { readThread, searchWikiTool } from "./tools";

const context = (thread: Record<string, unknown>) => ({
  thread,
  user: { id: "u1", name: "Priya" },
  actor: { id: "a1", kind: "human" },
  platform: "slack",
}) as never;

describe("read_thread", () => {
  it("returns earlier messages", async () => {
    const messages = [{ id: "1", role: "user", content: "temporary access" }];
    const result = await readThread.handler({}, context({ getMessages: mock.fn(async () => messages) }));
    assert.deepEqual(result, messages);
  });

  it("reports missing history instead of inventing context", async () => {
    const result = await readThread.handler({}, context({ getMessages: mock.fn(async () => []) }));
    assert.match(String(result), /no readable context/i);
  });
});

describe("search_wiki", () => {
  it("returns retrieved policy evidence", async () => {
    const post = mock.fn(async () => undefined);
    const result = await searchWikiTool.handler({ query: "temporary access", results: 3 }, context({ post }));
    assert.equal((result as Array<{ id: string }>)[0]?.id, "access-requests");
    assert.equal(post.mock.callCount(), 1);
    assert.match(JSON.stringify(post.mock.calls[0].arguments), /seven days/);
  });

  it("makes an empty retrieval visible", async () => {
    const post = mock.fn(async () => undefined);
    const result = await searchWikiTool.handler({ query: "quantum gardening", results: 3 }, context({ post }));
    assert.deepEqual(result, []);
    assert.match(JSON.stringify(post.mock.calls[0].arguments), /No matching wiki pages/);
  });
});
