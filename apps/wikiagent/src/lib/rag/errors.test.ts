import { test } from "node:test";
import assert from "node:assert/strict";
import { friendlyError, WikiAgentError } from "./errors";

test("friendlyError maps an API key failure to a setup hint", () => {
  const err = friendlyError(new Error("Incorrect API key provided: sk-***. You can find your API key at https://platform.openai.com/account/api-keys. HTTP 401"));
  assert.ok(err instanceof WikiAgentError);
  assert.equal((err as WikiAgentError).code, "missing-openai-key");
});

test("friendlyError maps refused connections to database guidance", () => {
  const err = friendlyError(new Error("connect ECONNREFUSED 127.0.0.1:5432"));
  assert.ok(err instanceof WikiAgentError);
  assert.equal((err as WikiAgentError).code, "database-down");
});

test("friendlyError passes through ordinary errors", () => {
  const original = new Error("Something else went wrong.");
  const err = friendlyError(original);
  assert.equal(err, original);
});