-- WikiAgent schema (mirrors src/lib/rag/schema-ddl.ts).
-- The app applies this itself on boot; this file exists for out-of-band tools
-- such as a docker init script or a DBA applying migrations by hand.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS wiki_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  source_url text NOT NULL UNIQUE,
  provider text NOT NULL CHECK (provider IN ('wikipedia', 'html')),
  summary text NOT NULL DEFAULT '',
  word_count integer NOT NULL DEFAULT 0,
  chunk_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wiki_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL REFERENCES wiki_pages(id) ON DELETE CASCADE,
  chunk_index integer NOT NULL,
  content text NOT NULL,
  token_estimate integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  embedding vector(1536),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wiki_chunks_page_idx ON wiki_chunks (page_id);
CREATE INDEX IF NOT EXISTS wiki_chunks_hnsw_idx
  ON wiki_chunks
  USING hnsw (embedding vector_cosine_ops);