/*
  # Enable Vector Search for Tasks

  1. Extensions
    - Enable pgvector extension for vector similarity search

  2. Updates
    - Add embedding column to tasks table
    - Create vector similarity search function
    - Add index for fast vector similarity search

  3. Important Notes
    - Embeddings will be generated using OpenAI's text-embedding model
    - Vector dimension is 384 (for gte-small model)
    - Similarity threshold of 0.8 ensures high-quality matches
*/

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS embedding vector(384);

-- Create index for vector similarity search
CREATE INDEX IF NOT EXISTS tasks_embedding_idx ON tasks 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Create function to search similar tasks
CREATE OR REPLACE FUNCTION match_tasks(
  query_embedding vector(384),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  title text,
  priority text,
  status text,
  user_id uuid,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    tasks.id,
    tasks.title,
    tasks.priority,
    tasks.status,
    tasks.user_id,
    1 - (tasks.embedding <=> query_embedding) AS similarity
  FROM tasks
  WHERE tasks.embedding IS NOT NULL
    AND 1 - (tasks.embedding <=> query_embedding) > match_threshold
  ORDER BY tasks.embedding <=> query_embedding
  LIMIT match_count;
$$;
