import type { ExtractedPage } from "./types";
import { normalizeWhitespace } from "./chunking";

/**
 * MediaWiki (Wikipedia) ingestion.
 *
 * Uses the `TextExtracts` API property so a plain-text version of the whole
 * article comes back without wikitext or HTML parsing. Redirects and title
 * normalisation are handled by the API (`redirects=1`, `titles=`).
 */

export interface WikipediaTarget {
  /** Lowest-common locale, e.g. `en` for en / en.m / www wikipedia. */
  locale: string;
  /** The raw title from the URL, URL-decoded and underscore-unescaped. */
  title: string;
  /** Canonical article URL for storage and citations. */
  sourceUrl: string;
}

export interface MediaWikiApiPage {
  title?: string;
  extract?: string;
  missing?: boolean;
  pageid?: number;
}

export interface MediaWikiQueryResponse {
  query?: { pages?: MediaWikiApiPage[] };
}

/** Parse every wikipedia.org URL shape we reasonably accept. */
export function parseWikiUrl(input: string): WikipediaTarget | null {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;

  let host = url.hostname.toLowerCase();
  const parts = host.split(".");
  const wikipediaIndex = parts.indexOf("wikipedia");
  if (wikipediaIndex === -1 || wikipediaIndex === 0) return null;

  // Locale tokens sit immediately before "wikipedia"; mobile/www shims like
  // "en.m" or "www" resolve to the same language code.
  let locale = parts[wikipediaIndex - 1];
  if (!locale || locale === "m" || locale === "www") {
    locale = parts[wikipediaIndex - 2] ?? "en";
  }

  const path = url.pathname;
  if (!path.startsWith("/wiki/")) return null;
  const raw = path.slice("/wiki/".length);
  if (!raw) return null;

  let title = raw.replace(/_/g, " ");
  try {
    title = decodeURIComponent(title);
  } catch {
    // leave a partially-broken title as-is; the API will resolve or 404 it
  }

  return {
    locale,
    title,
    sourceUrl: `https://${locale}.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`,
  };
}

/** Build the plain-text extract API URL for a target. */
export function buildMediaWikiExtractUrl(target: WikipediaTarget): string {
  const params = new URLSearchParams({
    action: "query",
    prop: "extracts",
    explaintext: "1",
    format: "json",
    formatversion: "2",
    redirects: "1",
    titles: target.title,
  });
  return `https://${target.locale}.wikipedia.org/w/api.php?${params.toString()}`;
}

/**
 * Pure extractor for the MediaWiki JSON response. Returns `null` when the
 * page does not exist. Kept free of I/O so redirect/missing behaviour is
 * testable offline.
 */
export function extractFromApiResponse(json: MediaWikiQueryResponse): { title: string; text: string } | null {
  const page = json?.query?.pages?.[0];
  if (!page || page.missing || !page.extract) return null;
  const text = page.extract.trim();
  if (!text) return null;
  return { title: page.title ?? "", text };
}

/** Fit an extract into a short card line while keeping a sentence boundary. */
export function summarize(text: string, maxLength = 240): string {
  const flat = normalizeWhitespace(text);
  if (flat.length <= maxLength) return flat;
  const cut = flat.slice(0, maxLength);
  const lastSentence = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
  return lastSentence > 60 ? cut.slice(0, lastSentence + 1) : `${cut}…`;
}

const USER_AGENT =
  "WikiAgent/0.1 (AI Tinkerers hackathon build; contact: team@example.com)";

export async function fetchWikipediaPage(target: WikipediaTarget): Promise<ExtractedPage> {
  const response = await fetch(buildMediaWikiExtractUrl(target), {
    headers: { Accept: "application/json", "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    throw new Error(`Wikipedia returned HTTP ${response.status} for "${target.title}".`);
  }
  const json = (await response.json()) as MediaWikiQueryResponse;
  const page = extractFromApiResponse(json);
  if (!page) {
    throw new Error(`No Wikipedia page found at "${target.title}". Check the spelling.`);
  }
  return {
    title: page.title,
    sourceUrl: target.sourceUrl,
    provider: "wikipedia",
    summary: summarize(page.text),
    text: page.text,
  };
}