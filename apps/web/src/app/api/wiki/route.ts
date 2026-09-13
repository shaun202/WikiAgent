import { fetchWikipediaPage } from "agent-core";
export async function GET(request: Request) {
  const title = new URL(request.url).searchParams.get("title") ?? "";
  try { return Response.json(await fetchWikipediaPage(title)); }
  catch (error) { return Response.json({ message: error instanceof Error ? error.message : "Wikipedia could not be loaded." }, { status: 400 }); }
}
