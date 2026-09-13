import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@langchain/openai",
    "@langchain/core",
    "@huggingface/transformers",
    "cheerio",
    "pg",
  ],
  outputFileTracingRoot: path.join(__dirname, "..", ".."),
};

export default nextConfig;