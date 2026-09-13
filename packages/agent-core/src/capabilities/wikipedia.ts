export type WikipediaPage = { title: string; extract: string; url: string };

export async function fetchWikipediaPage(title: string): Promise<WikipediaPage> {
  const normalizedTitle = title.trim();
  if (!normalizedTitle) throw new Error("A Wikipedia page title is required.");
  const parameters = new URLSearchParams({ action: "query", prop: "extracts|info", exintro: "0", explaintext: "1", exchars: "24000", inprop: "url", redirects: "1", titles: normalizedTitle, format: "json", formatversion: "2" });
  const response = await fetch(`https://en.wikipedia.org/w/api.php?${parameters.toString()}`, { headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(`Wikipedia returned HTTP ${response.status}.`);
  const data = (await response.json()) as { query?: { pages?: Array<{ title?: string; extract?: string; fullurl?: string }> } };
  const page = data.query?.pages?.[0];
  if (!page?.extract || !page.fullurl) throw new Error(`Wikipedia could not find a page titled "${normalizedTitle}".`);
  return { title: page.title ?? normalizedTitle, extract: page.extract, url: page.fullurl };
}
