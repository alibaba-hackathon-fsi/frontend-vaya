import fs from "node:fs";
import path from "node:path";

/* ================================================================
   Policy chunk store — flat in-memory array.
   No vector DB needed at this scale (a handful of docs).
   ================================================================ */

export interface PolicyChunk {
  id: string;
  bank: string;
  packageId?: string;
  section: string;
  text: string;
  embedding: number[];
}

const chunks: PolicyChunk[] = [];

const STORE_DIR = path.join(process.cwd(), "src", "data", "rag");
const STORE_FILE = path.join(STORE_DIR, "chunks.json");

export function addChunk(chunk: PolicyChunk): void {
  chunks.push(chunk);
}

export function getAllChunks(): PolicyChunk[] {
  return chunks;
}

export function clearStore(): void {
  chunks.length = 0;
}

/**
 * Persist the in-memory store to disk as JSON.
 * Used after ingestion to avoid re-embedding on every boot.
 */
export function saveStore(): void {
  fs.mkdirSync(STORE_DIR, { recursive: true });
  fs.writeFileSync(STORE_FILE, JSON.stringify(chunks, null, 2), "utf-8");
}

/**
 * Load pre-embedded chunks from disk if the file exists.
 * Called at module boot to hydrate the in-memory store.
 */
export function loadStore(): void {
  if (fs.existsSync(STORE_FILE)) {
    const data = fs.readFileSync(STORE_FILE, "utf-8");
    const parsed: PolicyChunk[] = JSON.parse(data);
    chunks.length = 0;
    chunks.push(...parsed);
  }
}

// Hydrate at boot — safe no-op if file doesn't exist yet.
loadStore();
