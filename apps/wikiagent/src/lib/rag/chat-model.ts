import { ChatOpenAI } from "@langchain/openai";
import { getConfig, resolveModelName } from "./config";

let chatModel: ChatOpenAI | null = null;

/**
 * Chat model honouring the starter kit's provider switch. On OpenRouter the
 * invite is `OPENROUTER_API_KEY` + a `MODEL` prefixed with the provider
 * (e.g. `openai/gpt-4o-mini`). Embeddings stay on OpenAI either way.
 */
export function getChatModel(): ChatOpenAI {
  const cfg = getConfig();
  if (!chatModel) {
    const isOpenRouter = cfg.MODEL_PROVIDER === "openrouter" && Boolean(cfg.OPENROUTER_API_KEY);
    chatModel = new ChatOpenAI({
      model: resolveModelName(),
      temperature: 0,
      apiKey: isOpenRouter ? cfg.OPENROUTER_API_KEY : cfg.OPENAI_API_KEY,
      ...(isOpenRouter ? { configuration: { baseURL: "https://openrouter.ai/api/v1" } } : {}),
      maxRetries: 2,
    });
  }
  return chatModel;
}