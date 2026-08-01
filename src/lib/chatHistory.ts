/**
 * Conversation-history index — a localStorage-backed list of archived
 * conversations (the "history of conversations"). Pure data layer with no UI
 * and no database: it stores and retrieves opaque conversation snapshots (the
 * chat component owns their shape) and exposes the metadata a history panel
 * needs to list, restore and delete entries.
 *
 * The snapshot type is generic so this layer never depends on component types;
 * the chat component instantiates it with its own persisted-snapshot type.
 */

/** Which mode an archived conversation was in. */
export type ConversationMode = "wizard" | "offer";

/** A full archived record: metadata plus the opaque snapshot needed to restore it. */
export interface ConversationRecord<S> {
  /** Stable id (the chat session id); used to upsert and to restore. */
  id: string;
  /** Auto-derived human title for the history list. */
  title: string;
  /** Epoch ms when the conversation was archived (the list is newest first). */
  archivedAt: number;
  mode: ConversationMode;
  /** The full conversation snapshot — opaque to this layer. */
  snapshot: S;
}

/** Metadata only — what a history panel needs to list entries without the payload. */
export interface ConversationSummary {
  id: string;
  title: string;
  archivedAt: number;
  mode: ConversationMode;
}

const HISTORY_LS_KEY = "vaya_chat_history";
/** Cap on archived conversations so the index doesn't grow without bound. */
const HISTORY_MAX_ENTRIES = 50;

function isConversationMode(v: unknown): v is ConversationMode {
  return v === "wizard" || v === "offer";
}

/** Shape-check a parsed record's metadata (validation first — storage is untrusted). */
function isStoredRecord(r: unknown): r is ConversationRecord<unknown> {
  if (typeof r !== "object" || r === null) return false;
  const rec = r as Record<string, unknown>;
  return (
    typeof rec.id === "string" &&
    typeof rec.title === "string" &&
    typeof rec.archivedAt === "number" &&
    isConversationMode(rec.mode) &&
    rec.snapshot !== undefined
  );
}

function readAll<S>(): ConversationRecord<S>[] {
  try {
    const raw = localStorage.getItem(HISTORY_LS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isStoredRecord) as ConversationRecord<S>[];
  } catch {
    return [];
  }
}

function writeAll<S>(records: ConversationRecord<S>[]): void {
  try {
    localStorage.setItem(HISTORY_LS_KEY, JSON.stringify(records));
  } catch {
    /* noop */
  }
}

/** List metadata for every archived conversation, newest first (for the panel). */
export function listConversations(): ConversationSummary[] {
  return readAll()
    .map(({ id, title, archivedAt, mode }) => ({ id, title, archivedAt, mode }))
    .sort((a, b) => b.archivedAt - a.archivedAt);
}

/** Load one full record (metadata + snapshot) for restore; null when absent. */
export function loadConversation<S>(id: string): ConversationRecord<S> | null {
  return readAll<S>().find((r) => r.id === id) ?? null;
}

/**
 * Archive a conversation. Upserts by id (re-archiving the same conversation
 * refreshes it instead of duplicating), keeps the list newest first, and caps it.
 */
export function archiveConversation<S>(input: {
  id: string;
  title: string;
  mode: ConversationMode;
  snapshot: S;
}): ConversationRecord<S> {
  const record: ConversationRecord<S> = {
    id: input.id,
    title: input.title,
    archivedAt: Date.now(),
    mode: input.mode,
    snapshot: input.snapshot,
  };
  const rest = readAll<S>().filter((r) => r.id !== input.id);
  writeAll([record, ...rest].slice(0, HISTORY_MAX_ENTRIES));
  return record;
}

/** Delete one archived conversation. */
export function deleteConversation(id: string): void {
  writeAll(readAll().filter((r) => r.id !== id));
}

/** Delete every archived conversation. */
export function clearHistory(): void {
  try {
    localStorage.removeItem(HISTORY_LS_KEY);
  } catch {
    /* noop */
  }
}
