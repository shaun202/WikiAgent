import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import type { PendingChunk } from "./types";

/** Rough token estimate: ~4 characters per token for English prose. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.trim().length / 4);
}

/** Collapse runs of whitespace and trim to a single stylable block. */
export function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export interface ChunkOptions {
  chunkSize: number;
  chunkOverlap: number;
}

/**
 * Split extracted page text into overlapping, roughly token-sized pieces.
 * Each chunk is tagged with its 0-based index plus a token estimate used for
 * context-budget accounting in the prompt.
 */
export async function chunkText(text: string, options: ChunkOptions): Promise<PendingChunk[]> {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: options.chunkSize,
    chunkOverlap: options.chunkOverlap,
    lengthFunction: (value: string) => estimateTokens(value),
    separators: ["\n\n", "\n", " ", ""],
  });
  const pieces = await splitter.splitText(text);
  return pieces
    .map((piece) => piece.trim())
    .filter((piece) => piece.length > 0)
    .map((piece, index) => ({
      text: piece,
      index,
      tokenEstimate: estimateTokens(piece),
    }));
}