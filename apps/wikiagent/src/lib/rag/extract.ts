import type { ExtractedPage } from "./types";
import { fetchWikipediaPage, parseWikiUrl } from "./wikipedia";
import { extractHtmlPage } from "./html";

/**
 * Turn a user-supplied URL into a normalised page we can chunk and index.
 * Dispatch order: recognised Wikipedia URLs go down the MediaWiki path (best
 * text quality); anything else HTTP(S) is treated as a generic page.
 */
export async function extractPage(rawUrl: string): Promise<ExtractedPage> {
  const url = rawUrl.trim();
  if (!url) throw new Error("Enter a page URL to index.");

  const wikiTarget = parseWikiUrl(url);
  if (wikiTarget) return fetchWikipediaPage(wikiTarget);

  const isHttp = /^https?:\/\//i.test(url);
  if (!isHttp) {
    throw new Error(
      "That does not look like a full URL. Try https://en.wikipedia.org/wiki/<Your topic>.",
    );
  }
  return extractHtmlPage(url);
}