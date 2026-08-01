"use client";

/**
 * Requests the user has posted to the reverse-auction board, plus the offers
 * that came back.
 *
 * Kept in the same external-store shape as the compare basket so the board can
 * be reached from anywhere and survives a refresh — which matters here, because
 * the whole point of the mechanic is that you post once and come back later to
 * find the banks have bid.
 */
import { useSyncExternalStore } from "react";
import { BIDDERS, type MarketOffer, type MarketPost } from "@/data/marketplace";
import type { Purpose } from "@/data/banks";

const KEY = "vaya_market_posts";
const EMPTY: MarketPost[] = [];

let posts: MarketPost[] = EMPTY;
let loaded = false;
let listening = false;
const subs = new Set<() => void>();

function emit() {
  // See compareStore: no `target` in tsconfig means ES5, which cannot iterate a
  // Set with for..of.
  subs.forEach((cb) => cb());
}

function commit(next: MarketPost[]) {
  posts = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(posts));
  } catch {
    /* private mode — the board still works for this session */
  }
  emit();
}

function read(): MarketPost[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) && parsed.length
      ? (parsed as MarketPost[])
      : EMPTY;
  } catch {
    return EMPTY;
  }
}

function ensureLoaded() {
  if (!loaded) {
    loaded = true;
    const saved = read();
    if (saved !== EMPTY) posts = saved;
  }
}

function subscribe(cb: () => void) {
  ensureLoaded();
  if (!listening) {
    listening = true;
    window.addEventListener("storage", (e) => {
      if (e.key === KEY) {
        posts = read();
        emit();
      }
    });
  }
  subs.add(cb);
  return () => {
    subs.delete(cb);
  };
}

const getSnapshot = () => posts;
const getServerSnapshot = () => EMPTY;

/** Reactive list of the requests this user has posted. */
export function useMyPosts(): MarketPost[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * Imperative snapshot of the posted requests. Lazy-loads from localStorage
 * like `subscribe` does, but without React or the cross-tab listener — for
 * one-off offer resolution (e.g. the `?offer=` URL param at chat boot).
 */
export function getPosts(): MarketPost[] {
  ensureLoaded();
  return posts;
}

/** Four hex characters, so a borrower is identifiable on the board but not identified. */
function handle(): string {
  return Math.floor(Math.random() * 0xffff)
    .toString(16)
    .toUpperCase()
    .padStart(4, "0");
}

export type NewPost = {
  purpose: Purpose;
  amount: number;
  termMonths: number;
  incomeBand: string;
  collateral: boolean;
  note?: string;
};

export function addPost(p: NewPost): string {
  const id = "u" + Date.now().toString(36);
  const post: MarketPost = {
    id,
    handle: handle(),
    purpose: p.purpose,
    amount: p.amount,
    termMonths: p.termMonths,
    incomeBand: p.incomeBand,
    collateral: p.collateral,
    verified: p.collateral
      ? ["mk_v_income", "mk_v_collateral"]
      : ["mk_v_income"],
    note: p.note?.trim() || undefined,
    hoursAgo: 0,
    offers: [],
    mine: true,
  };
  commit([post, ...posts]);
  return id;
}

export function removePost(id: string) {
  commit(posts.filter((p) => p.id !== id));
}

/**
 * Stage one bank's reply. `n` selects which bidder in the purpose's list
 * answers, so repeated calls produce a race rather than duplicate quotes.
 */
export function addBid(postId: string, n: number) {
  const post = posts.find((p) => p.id === postId);
  if (!post) return;
  const pool = BIDDERS[post.purpose] || [];
  const bid = pool[n % pool.length];
  if (!bid || post.offers.some((x) => x.code === bid.code)) return;

  // Later bidders undercut slightly — they can see they are behind.
  const undercut = n * 0.08;
  const offer: MarketOffer = {
    id: postId + "o" + n,
    code: bid.code,
    rate: Number((bid.listed - bid.cut - undercut).toFixed(2)),
    listed: bid.listed,
    termMonths: post.termMonths,
    maxAmount: post.amount,
    conditions: bid.conditions,
    hoursAgo: 0,
    expiresInH: 48,
  };
  commit(
    posts.map((p) =>
      p.id === postId ? { ...p, offers: [...p.offers, offer] } : p,
    ),
  );
}

export function clearPosts() {
  if (posts.length) commit(EMPTY);
}
