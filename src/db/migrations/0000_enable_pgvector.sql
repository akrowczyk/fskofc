-- Enable pgvector for handbook RAG (Ticket 9). Safe to run once on Neon.
CREATE EXTENSION IF NOT EXISTS vector;
