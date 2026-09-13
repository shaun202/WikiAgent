import { OpenAIEmbeddings } from "@langchain/openai";
import { getConfig, hasEmbeddingsConfig } from "./config";
import { EMBEDDING_MODEL_LOCAL } from "./types";

/**
 * Embeddings are the only part of the pipeline that ever touched the OpenAI
 * API unconditionally, which is why the app demanded an OpenAI key even when
 * chat used OpenRouter. Now the default provider is `local` — a fully
 * on-device, free ONNX model (`all-MiniLM-L6-v2`) that needs no API key.
 * Set `EMBEDDINGS_PROVIDER=openai` only if you explicitly want to pay for
 * `text-embedding-3-small` (1536-d).
 *
 * Both providers expose the same embedQuery / embedDocuments surface, so the
 * ingest and search code paths stay provider-agnostic.
 */

interface LocalExtractor {
  (texts: string[]): Promise<{ tolist: () => number[][] }>;
}

let localExtractor: Promise<LocalExtractor> | null = null;
let remoteEmbeddings: OpenAIEmbeddings | null = null;

/**
 * Lazy singleton for the on-device ONNX extractor. The module (and its ~90MB
 * model) is fetched the first time an embed is requested, then cached for the
 * life of the process so the server stays snappy on subsequent calls.
 */
function getLocalExtractor(): Promise<LocalExtractor> {
  if (!localExtractor) {
    localExtractor = (async () => {
      const { pipeline } = await import("@huggingface/transformers");
      const runner = await pipeline("feature-extraction", EMBEDDING_MODEL_LOCAL, {
        dtype: "q8",
      });
      return (async (texts: string[]) => {
        const out = await runner(texts, { pooling: "mean", normalize: true });
        return { tolist: () => out.tolist() as number[][] };
      }) as LocalExtractor;
    })().catch((cause) => {
      localExtractor = null;
      throw cause;
    });
  }
  return localExtractor;
}

/**
 * Shared embeddings instance. Defaults to the free local provider; falls back
 * to OpenAI embeddings when EMBEDDINGS_PROVIDER=openai.
 */
export function getEmbeddings() {
  const cfg = getConfig();
  if (cfg.EMBEDDINGS_PROVIDER === "local") {
    return {
      embedDocuments: async (texts: string[]): Promise<number[][]> => {
        const extractor = await getLocalExtractor();
        return extractor(texts).then((r) => r.tolist());
      },
      embedQuery: async (text: string): Promise<number[]> => {
        const extractor = await getLocalExtractor();
        return extractor([text.trim()]).then((r) => r.tolist()[0]!);
      },
    };
  }

  if (!hasEmbeddingsConfig()) {
    throw new Error(
      "OpenAI provider selected but OPENAI_API_KEY is not set. Either add " +
        "OPENAI_API_KEY to .env or switch EMBEDDINGS_PROVIDER back to local.",
    );
  }

  if (!remoteEmbeddings) {
    remoteEmbeddings = new OpenAIEmbeddings({
      model: cfg.WIKIAGENT_EMBEDDING_MODEL,
      dimensions: cfg.WIKIAGENT_EMBEDDING_DIM,
      apiKey: cfg.OPENAI_API_KEY,
      maxRetries: 2,
    });
  }
  return remoteEmbeddings;
}