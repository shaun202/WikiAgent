import * as cheerio from "cheerio";
import type { AnyNode, Element, Text } from "domhandler";
import type { ExtractedPage } from "./types";
import { normalizeWhitespace } from "./chunking";

/**
 * Generic HTML ingestion. Best effort: strips chrome (nav, footer, scripts),
 * then walks the document and strings block-level text together into readable
 * paragraphs without the boilerplate of an external pipeline.
 */

const REMOVE_SELECTOR = [
  "script",
  "style",
  "noscript",
  "template",
  "iframe",
  "svg",
  "nav",
  "footer",
  "form",
  "button",
  "[hidden]",
  "[aria-hidden='true']",
].join(",");

const BLOCK_SELECTORS = new Set([
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "li",
  "pre",
  "blockquote",
  "td",
  "th",
  "dt",
  "dd",
]);

/** Pick the most content-like container, mirroring common readability heuristics. */
function pickContainer($: cheerio.CheerioAPI): cheerio.Cheerio<AnyNode> {
  const candidates = [
    "main",
    "[role='main']",
    "article",
    "#content",
    "#main-content",
    "#wpcontent",
  ];
  for (const selector of candidates) {
    const node = $(selector).first();
    if (node.length > 0 && node.text().trim().length > 100) return node;
  }
  return $("body").first();
}

/** Recursively build readable text, adding paragraph breaks at block nodes. */
function textFromNode($: cheerio.CheerioAPI, node: AnyNode): string {
  if (node.type === "text") {
    return ((node as Text).data ?? "").replace(/\s+/g, " ").trim();
  }

  if (node.type !== "tag") return "";

  const element = node as Element;
  if (element.attribs?.hidden !== undefined) return "";
  if (element.attribs?.["aria-hidden"] === "true") return "";

  const tag = element.tagName.toLowerCase();
  const isBlock = BLOCK_SELECTORS.has(tag);

  const parts: string[] = [];
  for (const child of $(node).contents()) {
    const text = textFromNode($, child);
    if (text) parts.push(text);
  }

  if (tag === "br") return "\n";

  const joined = isBlock ? parts.join("\n") : parts.join(" ");
  const result = normalizeWhitespace(joined);
  return isBlock ? `${result}\n` : result;
}

/** Convert raw HTML to a title and reasonably clean full-page text. */
export function pageify(html: string): { title: string; text: string } {
  const $ = cheerio.load(html);
  $(REMOVE_SELECTOR).remove();

  const title =
    normalizeWhitespace($("title").first().text()) ||
    normalizeWhitespace($("h1").first().text()) ||
    "Untitled page";

  const container = pickContainer($);
  const rawText = container
    .contents()
    .toArray()
    .map((node) => textFromNode($, node))
    .join("\n");

  const paragraphs = rawText
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  return { title, text: paragraphs.join("\n\n") };
}

const USER_AGENT =
  "WikiAgent/0.1 (AI Tinkerers hackathon build; contact: team@example.com)";

export async function extractHtmlPage(url: string): Promise<ExtractedPage> {
  const response = await fetch(url, {
    headers: { Accept: "text/html", "User-Agent": USER_AGENT },
    redirect: "follow",
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    throw new Error(`Could not fetch ${url} (HTTP ${response.status}).`);
  }
  const body = await response.text();
  if (!body.trim()) throw new Error(`The page at ${url} returned an empty response.`);

  const { title, text } = pageify(body);
  if (text.length < 200) {
    throw new Error(
      "Not enough readable content was extracted from that page. " +
        "WikiAgent works best with article-style pages (use a Wikipedia-style page for the demo).",
    );
  }

  return {
    title,
    sourceUrl: url,
    provider: "html",
    summary: normalizeWhitespace(text).slice(0, 240),
    text,
  };
}