import { z } from "zod";
import {
  EMBEDDING_DIMENSIONS,
  EMBEDDING_MODEL_LOCAL,
  type EmbeddingsProvider,
} from "./types";

/**
 * WikiAgent runtime configuration.
 *
 * Key names keep the shared starter-kit vocabulary where it already fits
 * (`OPENAI_API_KEY`, `MODEL`, `MODEL_PROVIDER`, `OPENROUTER_API_KEY`) and add
 * a `WIKIAGENT_*` namespace for RAG tuning knobs. Everything has a default so
 * `npm run typecheck`, tests, and the UI status panel behave offline.
 */
const envSchema = z.object({
  OPENAI_API_KEY: z.string().min(1).optional().default("stub-replace-me"),
  DATABASE_URL: z.string().min(1).optional(),
  MODEL: z.string().min(1).optional(),
  WIKIAGENT_MODEL: z.string().min(1).optional(),
  OPENROUTER_API_KEY: z.string().min(1).optional(),
  MODEL_PROVIDER: z.enum(["openai", "openrouter"]).optional().default("openai"),
  EMBEDDINGS_PROVIDER: z.enum(["local", "openai"]).optional().default("local"),
  WIKIAGENT_TOP_K: z.coerce.number().int().min(1).max(50).optional().default(6),
  WIKIAGENT_CHUNK_SIZE: z.coerce.number().int().min(200).max(8000).optional().default(1000),
  WIKIAGENT_CHUNK_OVERLAP: z.coerce.number().int().min(0).max(2000).optional().default(200),
  WIKIAGENT_MAX_CHUNKS: z.coerce.number().int().min(1).max(2000).optional().default(200),
  WIKIAGENT_EMBEDDING_MODEL: z.string().min(1).optional().default(EMBEDDING_MODEL_LOCAL),
  WIKIAGENT_EMBEDDING_DIM: z
    .coerce
    .number()
    .int()
    .min(64)
    .max(3072)
    .optional()
    .default(EMBEDDING_DIMENSIONS),
});

export type WikiAgentConfig = z.infer<typeof envSchema>;

const FALLBACK: WikiAgentConfig = {
  OPENAI_API_KEY: "stub-replace-me",
  MODEL_PROVIDER: "openai",
  EMBEDDINGS_PROVIDER: "local",
  WIKIAGENT_TOP_K: 6,
  WIKIAGENT_CHUNK_SIZE: 1000,
  WIKIAGENT_CHUNK_OVERLAP: 200,
  WIKIAGENT_MAX_CHUNKS: 200,
  WIKIAGENT_EMBEDDING_MODEL: EMBEDDING_MODEL_LOCAL,
  WIKIAGENT_EMBEDDING_DIM: EMBEDDING_DIMENSIONS,
};

/**
 * Parse environment into a typed config, falling back to safe defaults so the
 * app, tests, and UI status panel all work offline. Cheap enough to call per
 * request; fails soft so a bad key never bricks the whole build.
 */
export function getConfig(env: Record<string, string | undefined> = process.env): WikiAgentConfig {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    console.warn("[wikiagent] invalid environment, using defaults:", parsed.error.flatten().fieldErrors);
    return { ...FALLBACK };
  }
  return parsed.data;
}

export function hasOpenAIConfig(env: Record<string, string | undefined> = process.env): boolean {
  return getConfig(env).OPENAI_API_KEY !== FALLBACK.OPENAI_API_KEY;
}

/**
 * Embeddings are fully configured when provider is `local` (on-device, no key
 * needed) or when an OpenAI API key exists for the `openai` provider.
 */
export function hasEmbeddingsConfig(env: Record<string, string | undefined> = process.env): boolean {
  const cfg = getConfig(env);
  return cfg.EMBEDDINGS_PROVIDER === "local" || hasOpenAIConfig(env);
}

export function hasDatabaseConfig(env: Record<string, string | undefined> = process.env): boolean {
  return Boolean(getConfig(env).DATABASE_URL);
}

export function hasOpenRouterConfig(env: Record<string, string | undefined> = process.env): boolean {
  return Boolean(getConfig(env).OPENROUTER_API_KEY);
}

export function embeddingsProvider(env: Record<string, string | undefined> = process.env): EmbeddingsProvider {
  return getConfig(env).EMBEDDINGS_PROVIDER;
}

/** The model slug used for chat answers. Honours WIKIAGENT_MODEL > MODEL > default. */
export function resolveModelName(env: Record<string, string | undefined> = process.env): string {
  const cfg = getConfig(env);
  return cfg.WIKIAGENT_MODEL ?? cfg.MODEL ?? "gpt-4o-mini";
}