import type { PolicyChunk } from "./store";

const SIMILARITY_THRESHOLD = 0.5;
const DEFAULT_TOP_K = 5;

/**
 * Cosine similarity between two vectors.
 * Returns 0 if either vector has zero magnitude.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export interface RetrievalResult {
  chunk: PolicyChunk;
  similarity: number;
}

/**
 * Retrieve the top-K most similar chunks above the similarity threshold.
 * Below-threshold results are dropped entirely — the caller sees an empty array
 * and should respond "not found in the documents" rather than guessing.
 */
export function retrieveTopK(
  queryEmbedding: number[],
  chunks: PolicyChunk[],
  k: number = DEFAULT_TOP_K,
): RetrievalResult[] {
  return chunks
    .map((chunk) => ({
      chunk,
      similarity: cosineSimilarity(queryEmbedding, chunk.embedding),
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, k)
    .filter((r) => r.similarity >= SIMILARITY_THRESHOLD);
}
