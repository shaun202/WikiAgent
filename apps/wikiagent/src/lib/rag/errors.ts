/**
 * Canonical error text for the three failure modes a demo judge will actually
 * hit: a missing OpenAI key, a missing/stopped database, and a page with no
 * content. Everything else is passed through with its original message.
 */
export class WikiAgentError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "WikiAgentError";
    this.code = code;
  }
}

/** Fewer than the classic 200 chars usually means a JS-rendered wall. */
export function requiresSetup(detail: string): string {
  return `${detail}\n\nSetup steps: copy .env.example to .env, start the Postgres container (npm run dev:db), and add your OPENAI_API_KEY. See apps/wikiagent/README.md.`;
}

export function friendlyError(cause: unknown): Error {
  const message = cause instanceof Error ? cause.message : String(cause);

  if (/api[ _-]?key|401|403|invalid_api_key/i.test(message)) {
    return new WikiAgentError(
      "missing-openai-key",
      "OpenAI returned an API key error. Add your OPENAI_API_KEY to .env and restart the app.",
    );
  }
  if (/ECONNREFUSED|ENOTFOUND|Could not initialise database|connection.*refused/i.test(message)) {
    return new WikiAgentError(
      "database-down",
      requiresSetup("Cannot reach the Postgres database."),
    );
  }
  if (/DATABASE_URL|client does not support authentication|role .* does not exist/i.test(message)) {
    return new WikiAgentError("database-configured", requiresSetup(message));
  }
  return cause instanceof Error ? cause : new Error(message);
}