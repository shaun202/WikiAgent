# WikiAgent

A **retrieval-augmented generation** assistant that answers questions from wiki pages you
index. Paste a URL (Wikipedia or any article-style page), and WikiAgent chunks, embeds, and
stores it — then answers questions with inline `[n]` citations over those exact chunks.

Built for the **AI Tinkerers · Agents, Everywhere** hackathon with the team's chosen stack:
Next.js + TypeScript, Tailwind CSS, Node, PostgreSQL, pgvector, OpenAI embeddings + GPT,
and LangChain for the retrieval pipeline primitives.

## Highlights

- **Real retrieval** — cosine ANN search over an HNSW pgvector index (`1 - distance`), not a
  keyword mock.
- **Grounding you can verify** — every answer is limited to retrieved chunks, must cite
  `[n]`, and must say "I don't know" when the index does not contain the answer.
- **Page scope** — filters the search to one page, so the surrounding context genuinely
  changes what the agent can answer.
- **Wikipedia-first extractor** — uses the MediaWiki `TextExtracts` API for clean plain text;
  generic sites fall back to a readability-style HTML stripper.
- **Re-indexing is safe** — the same URL re-ingests transactionally (old chunks are replaced).
- **Works offline** — every decision function has a unit test; no live provider calls needed.
- **Failures are friendly** — missing key / stopped database / empty pages produce actionable
  messages instead of stack traces.

## Stack

| Layer | Choice |
| --- | --- |
| Frontend | Next.js 15 (App Router) + React 19 + TypeScript |
| Styling | Tailwind CSS v4 |
| Backend | Next.js Route Handlers (Node runtime) |
| Database | PostgreSQL 16 + pgvector |
| Embeddings | `all-MiniLM-L6-v2` (384-d) **local ONNX** via `@huggingface/transformers` — no API key |
| LLM | OpenAI chat model (provider-switchable to OpenRouter) |
| RAG glue | LangChain (`@langchain/openai`, `@langchain/textsplitters`) + hand-written retrieval SQL |

## Get started

Requires Node 22+ and Docker (for Postgres). From the repository root:

```bash
# 1. Start the database (pgvector image)
docker compose -f apps/wikiagent/docker-compose.yml up -d

# 2. Configure environment
cp .env.example .env
# edit .env: set OPENROUTER_API_KEY (chat) and keep DATABASE_URL as in the example
# embeddings run locally by default — no OpenAI key needed

# 3. Run the app
npm run dev:wikiagent
```

Open **http://127.0.0.1:3200**. The schema is created automatically on first request
(`npm run migrate --workspace wikiagent` applies it out-of-band if you prefer).

### First demo flow

1. In the left panel, click a sample URL (or paste any Wikipedia article).
2. Watch the index card appear with its chunk count.
3. In the chat, pick a page scope, then ask — e.g. *"Summarise the key ideas in five bullets."*
4. Notice the `[n]` citations, the numbered source cards below the answer, and the
   similarity scores. Ask a question the page cannot answer to see the honest "I don't know".

### CLI ingest

```bash
npm run ingest --workspace wikiagent -- "https://en.wikipedia.org/wiki/PostgreSQL"
```

## How it works

```
URL ──► MediaWiki TextExtracts API  (or HTML→text)
        │
        ▼
Normalise ──► title, source_url, summary, plain text
        │
        ▼
Chunk ──► RecursiveCharacterTextSplitter (WIKIAGENT_CHUNK_SIZE/OVERLAP, token-aware)
        │
        ▼
Embed ──► all-MiniLM-L6-v2 (384-d, on-device)  →  wiki_chunks.embedding
        │
        ▼
Store ──► wiki_pages (metadata) + wiki_chunks (vector), HNSW cosine index
                        │
   question ────────────┘
        │  embed question once
        ▼
Retrieve ──► 1 - (embedding <=> $query)  ORDER BY … LIMIT topK   (+ optional page filter)
        │
        ▼
Rank ──► numbered sources  →  prompt context block  →  hints for [n] citations
        │
        ▼
Generate ──► streaming GPT answer; sources are streamed to the UI first
```

### Where things live

```
apps/wikiagent
├─ src/app                        # pages + API routes
│  ├─ page.tsx                    # index panel + chat shell
│  └─ api/
│     ├─ chat/route.ts            # POST · SSE events: sources, delta, done, error
│     └─ wiki/
│        ├─ status/route.ts       # GET  · config + db health + corpus summary
│        ├─ ingest/route.ts       # POST · index a page by URL
│        └─ pages/route.ts        # DELETE · remove a page (cascade chunks)
├─ src/lib/rag                    # the pipeline, kept free of UI concerns
│  ├─ wikipedia.ts                # MediaWiki URL parsing + TextExtracts client
│  ├─ html.ts                     # generic HTML→text with readability heuristics
│  ├─ chunking.ts                 # splitter + token estimation
│  ├─ vector-search.ts            # the pgvector ANN query (HNSW, optional filter)
│  ├─ prompt.ts                   # grounding prompt + numbered context block
│  ├─ answer.ts                   # retrieval→generation async generator
│  ├─ ingest.ts                   # fetch→extract→chunk→embed→store transaction
│  └─ database.ts / schema-ddl.ts # pg pool, schema, CRUD, health
├─ migrations/001_init.sql        # standalone mirror of schema-ddl.ts
├─ scripts/ingest.ts · migrate.ts # CLI entry points
└─ docker-compose.yml             # pgvector/pgvector:pg16 for local dev
```

## Configuration

| Key | Default | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | *(example)* | Postgres connection string |
| `OPENROUTER_API_KEY` | — | Chat answers via OpenRouter (the demo's model provider) |
| `OPENAI_API_KEY` | — | Only needed when `EMBEDDINGS_PROVIDER=openai` and/or `MODEL_PROVIDER=openai` |
| `EMBEDDINGS_PROVIDER` | `local` | `local` (free on-device, default) or `openai` |
| `WIKIAGENT_MODEL` / `MODEL` | `gpt-4o-mini` | Chat model |
| `WIKIAGENT_EMBEDDING_MODEL` | `Xenova/all-MiniLM-L6-v2` | Embedding model (`text-embedding-3-small` for the openai provider) |
| `WIKIAGENT_EMBEDDING_DIM` | `384` | Must match the `vector(384)` column (1536 for the openai provider) |
| `WIKIAGENT_TOP_K` | `6` | Chunks retrieved per question |
| `WIKIAGENT_CHUNK_SIZE` / `CHUNK_OVERLAP` | `1000` / `200` | Recursive character splitter |
| `WIKIAGENT_MAX_CHUNKS` | `200` | Refuse pages above this chunk count |
| `MODEL_PROVIDER` | `openai` | `openai` or `openrouter`; chat route only |

Embedding dimension is baked into the SQL schema (`vector(384)` for the default local
provider). If you switch `EMBEDDINGS_PROVIDER=openai`, set `WIKIAGENT_EMBEDDING_DIM=1536`
and change `schema-ddl.ts` and `migrations/001_init.sql` to `vector(1536)` together.

## API

| Endpoint | Body | Returns |
| --- | --- | --- |
| `POST /api/chat` | `{ question, pageId? }` | `text/event-stream`: `sources`, `delta`…, `done`/`error` |
| `POST /api/wiki/ingest` | `{ url }` | `{ ok, page, chunks, tokens }` |
| `GET /api/wiki/status` | — | `{ configured, database, pages, chunks }` |
| `DELETE /api/wiki/pages` | `{ pageId }` | `{ ok }` |

## Verify

```bash
npm run typecheck --workspace wikiagent   # strict TypeScript
npm run test --workspace wikiagent        # offline unit tests (node:test)
npm run build --workspace wikiagent       # production build
```

The root `npm run verify` also picks the app up automatically via the npm workspaces.

## Deployment notes

- **Vercel**: App Router + Node runtime; set the env keys above. The chat route uses
  `maxDuration = 60`; set the same in the dashboard if a page contains many chunks.
- **Neon / Supabase**: any Postgres URL works. Both offer pgvector — for Neon ensure the
  `vector` extension is enabled (the app creates it on first boot, but grant the role the
  needed privileges on managed Postgres, or pre-apply `migrations/001_init.sql`).
- **Limits**: embedding + generation stay server-side; keys never reach the browser.

## Hackathon notes

Built fresh on the **`jordan`** branch of the starter kit during the event. The kit's web
templates already existed; the WikiAgent app itself, the RAG pipeline, the pgvector schema
and query, the extractors, the streaming chat API, and the UI are original work created here.
Inherited building blocks: the npm workspaces layout, Node/Next versions, and the shared
`.env` conventions.