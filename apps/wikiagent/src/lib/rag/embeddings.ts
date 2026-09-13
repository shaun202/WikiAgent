import { OpenAIEmbeddings } from "@langchain/openai";
import { getConfig } from "./config";

/**
 * Shared embeddings instance. Embeddings are the only truly OpenAI-bound
 * primitive in the pipeline; every chunk stores its vector.
 */
let embeddings: OpenAIEmbeddings | null = null;

export function getEmbeddings(): OpenAIEmbeddings {
  const cfg = getConfig();
  if (!embeddings) {
    embeddings = new OpenAIEmbeddings({
      model: cfg.WIKIAGENT_EMBEDDING_MODEL,
      dimensions: cfg.WIKIAGENT_EMBEDDING_DIM,
      apiKey: cfg.OPENAI_API_KEY,
      maxRetries: 2,
    });
  }
  return embeddings;
}