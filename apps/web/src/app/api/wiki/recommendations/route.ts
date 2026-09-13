import { searchWikipedia } from "agent-core";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("query") ?? "";
  if (!query.trim()) return Response.json({ message: "A search topic is required." }, { status: 400 });

  const results = await searchWikipedia(query);
  if (typeof results === "string") return Response.json({ message: results }, { status: 503 });
  return Response.json({ results });
}