import { NextRequest } from "next/server";
import { getLLMProvider, type PolicyChunkContext } from "@/lib/ai/provider";
import {
  OFFER_HISTORY_MAX_MESSAGES,
  type OfferDiscussionContext,
  type AffordabilityInputs,
  type AffordabilityVerdict,
  type OfferPricing,
  type ConversationTurn,
} from "@/lib/ai/offerContext";
import { calcMonthlyPayment } from "@/lib/engine/calcMonthlyPayment";
import { calcDTI, DTI_CAP } from "@/lib/engine/calcDTI";
import { scoreRisk } from "@/lib/engine/scoreRisk";
import {
  extractAndClassify,
  mergeProfile,
  isPricingQuestion,
  sanitizeExtraction,
} from "@/lib/ai/intent";
import { followUpReply } from "@/lib/ai/questionEngine";
import type { ConversationContext } from "@/lib/ai/prompts/conversationalAdvisor";
import {
  validateProfile,
  type RejectionCode,
} from "@/lib/validation/profileSchema";
import { runCalculation } from "@/lib/engine/pipeline";
import { getAllChunks } from "@/lib/ai/rag/store";
import { retrieveTopK } from "@/lib/ai/rag/retrieve";
import { embedText } from "@/lib/ai/rag/embed";
import {
  apiT,
  parseLang,
  type ApiLang,
  type ApiMessageKey,
} from "@/lib/i18n/apiMessages";
import { checkRateLimit } from "@/lib/security/rateLimit";
import { detectInjection, sanitizeMessage } from "@/lib/security/inputGuard";

/* ================================================================
   Session state — in-memory (demo-grade; swap for Redis before prod)
   ================================================================ */

interface ChatSession {
  profile: Record<string, unknown>;
  turns: number;
  /** Multi-turn history for offer-discussion mode (separate from the wizard profile flow). */
  offerHistory?: ConversationTurn[];
  /** Recent wizard-mode transcript — gives the conversational advisor dialogue context. */
  wizardHistory?: ConversationTurn[];
  /** Last engine-computed affordability verdict; injected into later turns. */
  offerVerdict?: AffordabilityVerdict;
  /** Asset class offered as collateral whose value is still unknown — the advisor asks for it. */
  pendingCollateralLoai?: string;
}

const sessions = new Map<string, ChatSession>();

const MAX_FOLLOWUP_TURNS = 3;
/** Cap on retained wizard transcript messages so long chats don't blow the context window. */
const WIZARD_HISTORY_MAX_MESSAGES = 20;
const MANUAL_FORM_STAGE = "fallback_to_manual_form";
/** Sanity ceiling for borrower-supplied income/debt (VND) — above this is garbage or abuse. */
const AFFORDABILITY_MAX_VALUE = 1e12;

/**
 * Translate a validation rejection code (domain fact from the validation layer)
 * into its localized message key — the API layer owns turning codes into text
 * the borrower sees, so no raw schema messages or enum values ever leak.
 */
const REJECTION_MESSAGE_KEY: Record<RejectionCode, ApiMessageKey> = {
  invalid_purpose: "reject_invalid_purpose",
  invalid_amount: "reject_invalid_amount",
  amount_too_large: "reject_amount_too_large",
  income_too_large: "reject_income_too_large",
  invalid_term: "reject_invalid_term",
  invalid_collateral: "reject_invalid_collateral",
  invalid_input: "reject_invalid_input",
};

/* ================================================================
   Anti-spam rate limiting (per client IP)
   ================================================================ */

/** Max chat requests allowed per client within the sliding window. */
const RATE_LIMIT_MAX = 10;
/** Sliding window length for the rate limit (ms). */
const RATE_LIMIT_WINDOW_MS = 30_000;

/** Resolve the client IP for rate limiting (Vercel sets x-forwarded-for). */
function clientIpOf(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    ""
  );
}

/* ================================================================
   SSE helper
   ================================================================ */

function sseEncode(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

/** Build a text/event-stream Response from a writer callback that emits events. */
function sseResponse(
  start: (write: (event: string, data: unknown) => void) => Promise<void>,
): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const write = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(sseEncode(event, data)));
      };
      try {
        await start(write);
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

/* ================================================================
   Offer-discussion helpers
   ================================================================ */

/** Minimal shape check for the client-supplied offer context (validation first). */
function isValidOfferContext(o: unknown): o is OfferDiscussionContext {
  if (typeof o !== "object" || o === null) return false;
  const c = o as Record<string, unknown>;
  return (
    typeof c.bank === "string" &&
    typeof c.offeredRate === "number" &&
    typeof c.listedRate === "number" &&
    typeof c.cutBelowListed === "number" &&
    typeof c.termMonths === "number" &&
    typeof c.maxAmount === "number" &&
    typeof c.expiresInH === "number" &&
    Array.isArray(c.conditions) &&
    c.conditions.every((x) => typeof x === "string") &&
    typeof c.request === "object" &&
    c.request !== null
  );
}

/**
 * Retrieve the offer bank's policy chunks to ground the discussion (best effort):
 * filter all chunks by bank name (normalized containment), retrieve top-K within
 * that subset. Falls back to all chunks when no bank match, and to an empty
 * list on any embedding/retrieval error — the discussion still works, just
 * without policy grounding.
 */
function retrieveOfferPolicyChunks(
  queryEmbedding: number[],
  bank: string,
): PolicyChunkContext[] {
  const all = getAllChunks();
  const bankNorm = bank.trim().toLowerCase();
  const bankChunks = all.filter(
    (c) =>
      c.bank.toLowerCase().includes(bankNorm) ||
      bankNorm.includes(c.bank.toLowerCase()),
  );
  const pool = bankChunks.length > 0 ? bankChunks : all;
  return retrieveTopK(queryEmbedding, pool, 5).map((t) => ({
    text: t.chunk.text,
    bank: t.chunk.bank,
    section: t.chunk.section,
  }));
}

/** Validation-first shape + range check for borrower-supplied affordability inputs. */
function isValidAffordabilityInputs(o: unknown): o is AffordabilityInputs {
  if (typeof o !== "object" || o === null) return false;
  const c = o as Record<string, unknown>;
  return (
    typeof c.income === "number" &&
    Number.isFinite(c.income) &&
    c.income > 0 &&
    c.income <= AFFORDABILITY_MAX_VALUE &&
    typeof c.debt === "number" &&
    Number.isFinite(c.debt) &&
    c.debt >= 0 &&
    c.debt <= AFFORDABILITY_MAX_VALUE
  );
}

/** Minimal shape check for client-supplied conversation history (validation first). */
function isValidHistory(h: unknown): h is ConversationTurn[] {
  if (!Array.isArray(h)) return false;
  return h.every((m) => {
    if (typeof m !== "object" || m === null) return false;
    const turn = m as Record<string, unknown>;
    return (
      (turn.role === "user" || turn.role === "assistant") &&
      typeof turn.content === "string"
    );
  });
}

/** Append a turn to the wizard transcript, capped and de-duplicated against a trailing echo. */
function appendTurn(
  history: ConversationTurn[] | undefined,
  turn: ConversationTurn,
): ConversationTurn[] {
  const h = history ?? [];
  const last = h[h.length - 1];
  if (last && last.role === turn.role && last.content === turn.content)
    return h;
  return [...h, turn].slice(-WIZARD_HISTORY_MAX_MESSAGES);
}

/**
 * Transcript to feed an LLM call: the client re-sends its rendered messages on
 * every request, which already include the current user turn — strip that
 * trailing echo so the model never sees the same message twice.
 */
function historyForCall(
  history: ConversationTurn[] | undefined,
  current: string,
): ConversationTurn[] {
  const h = history ?? [];
  const last = h[h.length - 1];
  if (last && last.role === "user" && last.content === current) {
    return h.slice(0, -1);
  }
  return h;
}

/**
 * The deal actually on the table: min(request, offer) amount and term at the
 * offered rate. Shared by the affordability verdict and the pricing-only path
 * so the "what deal do we price" rule lives in exactly one place.
 */
function pricedDealTerms(offer: OfferDiscussionContext): {
  amount: number;
  termMonths: number;
} {
  return {
    amount: Math.min(offer.request.amount, offer.maxAmount),
    termMonths: Math.min(offer.request.termMonths, offer.termMonths),
  };
}

/**
 * Compute the affordability verdict for the deal actually on the table.
 * Pure orchestration of Decision Engine functions — deterministic, no LLM.
 */
function computeOfferVerdict(
  offer: OfferDiscussionContext,
  inputs: AffordabilityInputs,
): AffordabilityVerdict {
  const { amount, termMonths } = pricedDealTerms(offer);
  const payment = calcMonthlyPayment(amount, offer.offeredRate, termMonths);
  const { dti, withinLimit } = calcDTI(
    payment.tongThangDau,
    inputs.income,
    inputs.debt,
  );
  const { level } = scoreRisk(dti, termMonths);
  return {
    amount,
    termMonths,
    rate: offer.offeredRate,
    monthlyPayment: payment.tongThangDau,
    dti,
    dtiCap: DTI_CAP,
    withinLimit,
    riskLevel: level,
    income: inputs.income,
    debt: inputs.debt,
  };
}

/**
 * Compute pricing-only facts for the deal (no income/debt needed). Lets the
 * advisor quote a concrete monthly payment for pricing questions while the
 * numbers stay the Decision Engine's — the LLM only narrates them.
 */
function computeOfferPricing(offer: OfferDiscussionContext): OfferPricing {
  const { amount, termMonths } = pricedDealTerms(offer);
  const payment = calcMonthlyPayment(amount, offer.offeredRate, termMonths);
  return {
    amount,
    termMonths,
    rate: offer.offeredRate,
    principalMonthly: payment.goc,
    firstMonthInterest: payment.laiThangDau,
    firstMonthPayment: payment.tongThangDau,
  };
}

/* ================================================================
   Policy query helper (inline RAG)
   ================================================================ */

/** Retrieve the top-K policy chunks for a question and derive their citations. */
async function retrievePolicyContext(question: string): Promise<{
  chunks: PolicyChunkContext[];
  citations: { bank: string; section: string }[];
}> {
  const queryEmbedding = await embedText(question);
  const top = retrieveTopK(queryEmbedding, getAllChunks(), 5);
  const chunks = top.map((t) => ({
    text: t.chunk.text,
    bank: t.chunk.bank,
    section: t.chunk.section,
  }));
  const citations = Array.from(
    new Set(top.map((t) => `${t.chunk.bank}|${t.chunk.section}`)),
  ).map((str) => {
    const [bank, section] = str.split("|");
    return { bank, section };
  });
  return { chunks, citations };
}

/** Shared result of a policy-context retrieval (chunks + derived citations). */
interface PolicyContextResult {
  chunks: PolicyChunkContext[];
  citations: { bank: string; section: string }[];
}

/**
 * Start policy retrieval without blocking — callers await the shared promise
 * when (and if) their path needs grounding. Best effort: any embedding or
 * retrieval failure resolves to empty context so the conversation continues.
 */
function prefetchPolicyContext(question: string): Promise<PolicyContextResult> {
  return retrievePolicyContext(question).catch(() => ({
    chunks: [],
    citations: [],
  }));
}

async function queryPolicyInline(
  question: string,
  lang: ApiLang,
  policyPrefetch: Promise<PolicyContextResult>,
) {
  const { chunks, citations } = await policyPrefetch;
  if (chunks.length === 0) {
    return {
      answer: "not found in the documents",
      citations: [],
      error: false,
    };
  }
  try {
    const answer = await getLLMProvider().answerPolicyQuery(
      question,
      chunks,
      lang,
    );
    return { answer, citations, error: false };
  } catch {
    return { answer: "not found in the documents", citations: [], error: true };
  }
}

type AdvisorStreamResult =
  | {
      error: false;
      citations: { bank: string; section: string }[];
      stream: AsyncIterable<string>;
    }
  | { error: true };

/**
 * Unified conversational advisor (streaming): resolve the pre-fetched policy
 * grounding, then start the finance-persona stream with full dialogue context
 * — general finance chat, real-life situations the wizard cannot price, and
 * natural follow-ups for missing details. The LLM only converses and advises
 * — no Decision Engine runs here. A stream-creation failure degrades to
 * { error: true } so the caller can fall back to a canned reply.
 */
async function converseInlineStream(
  policyPrefetch: Promise<PolicyContextResult>,
  message: string,
  history: ConversationTurn[],
  context: ConversationContext,
  lang: ApiLang,
): Promise<AdvisorStreamResult> {
  const { chunks, citations } = await policyPrefetch;
  try {
    const stream = await getLLMProvider().converseStream(
      message,
      chunks,
      history,
      context,
      lang,
    );
    return { error: false, citations, stream };
  } catch {
    return { error: true };
  }
}

/**
 * Emit an advisor reply as explanation deltas, substituting the canned
 * fallback when the stream is unavailable, empty, or dies before its first
 * delta. Returns the text actually shown (for transcript bookkeeping).
 */
async function writeAdvisorReply(
  write: (event: string, data: unknown) => void,
  convo: AdvisorStreamResult,
  fallback: string,
  lang: ApiLang,
): Promise<string> {
  if (convo.error) {
    write("explanation", { delta: fallback });
    return fallback;
  }
  let text = "";
  try {
    for await (const delta of convo.stream) {
      text += delta;
      write("explanation", { delta });
    }
  } catch {
    // Mid-stream failure: keep partial text if any surfaced.
    if (text) {
      write("explanation_error", { message: apiT("explanation_error", lang) });
      return text;
    }
  }
  if (!text) {
    write("explanation", { delta: fallback });
    return fallback;
  }
  return text;
}

/* ================================================================
   POST /api/chat — full advisory flow with SSE streaming
   ================================================================ */

export async function POST(request: NextRequest) {
  let body: {
    sessionId?: string;
    message?: string;
    lang?: string;
    /** Structured offer context — present only in "discuss this offer" mode. */
    offer?: OfferDiscussionContext;
    /** Borrower income/debt for the affordability check (offer mode only). */
    affordability?: AffordabilityInputs;
    /** Client-held wizard profile, re-sent each request to rehydrate after a restart. */
    profile?: Record<string, unknown>;
    /** Client-held offer-discussion transcript, re-sent each request for the same reason. */
    history?: ConversationTurn[];
    /** Client-held wizard transcript, re-sent each request for the same reason. */
    messages?: ConversationTurn[];
  };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { sessionId, message } = body;
  const lang = parseLang(body.lang);
  if (!sessionId || !message) {
    return new Response(
      JSON.stringify({ error: "sessionId and message are required" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  // --- Security guards: rate limit, then validate/sanitize the input ---
  // Key on client IP so a bot cannot dodge the limit by rotating sessionIds
  // (sessionId is client-generated). Fall back to sessionId when there is no
  // IP header (e.g. local dev).
  const clientIp = clientIpOf(request);
  const rateKey = clientIp ? `ip:${clientIp}` : `session:${sessionId}`;
  const rate = checkRateLimit(rateKey, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS);
  if (rate.limited) {
    return new Response(
      JSON.stringify({ reply: apiT("rate_limited", lang), error: true }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(Math.ceil(rate.retryAfterMs / 1000)),
        },
      },
    );
  }

  const sanitized = sanitizeMessage(message);
  if (!sanitized) {
    return new Response(JSON.stringify({ error: "Message is empty" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (detectInjection(sanitized)) {
    return new Response(
      JSON.stringify({ reply: apiT("injection_blocked", lang), error: true }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  if (body.offer !== undefined && !isValidOfferContext(body.offer)) {
    return new Response(JSON.stringify({ error: "Invalid offer context" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (
    body.affordability !== undefined &&
    !isValidAffordabilityInputs(body.affordability)
  ) {
    return new Response(
      JSON.stringify({ error: "Invalid affordability inputs" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const llm = getLLMProvider();
  // The in-memory session is a cache; the client is the durable source of truth
  // (it survives server restarts/redeploys — no database). Rehydrate from the
  // client's re-sent state only on a cache miss; within a live session the
  // server stays authoritative and ignores the re-sent state. The profile is
  // untrusted input, so it passes the same sanitizer as the LLM extraction.
  const existing = sessions.get(sessionId);
  const session: ChatSession = existing ?? {
    profile: sanitizeExtraction(body.profile ?? {}),
    turns: 0,
    offerHistory: isValidHistory(body.history)
      ? body.history.slice(-OFFER_HISTORY_MAX_MESSAGES)
      : undefined,
    wizardHistory: isValidHistory(body.messages)
      ? body.messages.slice(-WIZARD_HISTORY_MAX_MESSAGES)
      : undefined,
  };

  // --- Offer-discussion mode ---
  // Client sent a structured offer context: skip intent extraction, profile
  // merge and the Decision Engine entirely. Ground the talk in the bank's
  // policy chunks and stream a free LLM discussion (presentation only).
  if (body.offer) {
    const offer = body.offer;
    const history = session.offerHistory ?? [];

    // Affordability check requested: compute the verdict with the Decision
    // Engine and persist it so later turns stay grounded in the same numbers.
    if (body.affordability) {
      try {
        session.offerVerdict = computeOfferVerdict(offer, body.affordability);
      } catch {
        // Unpriceable offer context (e.g. non-positive amount/term): skip the
        // verdict; the discussion still works without it.
        session.offerVerdict = undefined;
      }
      sessions.set(sessionId, session);
    }
    const verdict = session.offerVerdict;

    // Pricing question with no full verdict yet: compute engine pricing so the
    // advisor can quote a concrete monthly payment (numbers stay the engine's).
    // When a verdict exists it already carries the payment, so pricing is moot.
    let pricing: OfferPricing | undefined;
    if (!verdict && isPricingQuestion(sanitized)) {
      try {
        pricing = computeOfferPricing(offer);
      } catch {
        pricing = undefined;
      }
    }

    let policyChunks: PolicyChunkContext[] = [];
    try {
      const queryEmbedding = await embedText(sanitized);
      policyChunks = retrieveOfferPolicyChunks(queryEmbedding, offer.bank);
    } catch {
      policyChunks = [];
    }

    return sseResponse(async (write) => {
      let assistantText = "";
      try {
        // Engine verdict first (authoritative numbers), LLM narration after.
        if (verdict) write("affordability", verdict);

        const discussionStream = await llm.discussOffer(
          offer,
          policyChunks,
          sanitized,
          history,
          lang,
          verdict,
          pricing,
        );
        for await (const delta of discussionStream) {
          assistantText += delta;
          write("explanation", { delta });
        }

        // Multi-turn: remember this exchange within the session.
        history.push(
          { role: "user", content: sanitized },
          { role: "assistant", content: assistantText },
        );
        session.offerHistory = history.slice(-OFFER_HISTORY_MAX_MESSAGES);
        sessions.set(sessionId, session);

        write("done", {});
      } catch {
        write("explanation_error", {
          message: apiT("explanation_error", lang),
        });
      }
    });
  }

  // --- Intent extraction ---
  // Policy retrieval depends only on the message: start it now so it overlaps
  // the extraction LLM call instead of adding serial latency later. Every
  // consumer (policy answer, advisor grounding, MIXED) awaits this one promise.
  const policyPrefetch = prefetchPolicyContext(sanitized);
  let intentResult;
  try {
    intentResult = await extractAndClassify(
      sanitized,
      session.profile,
      session.turns,
      llm,
      historyForCall(session.wizardHistory, sanitized),
    );
  } catch (err) {
    // LLM call failed — log the real cause (and whether the key is present at
    // runtime) for observability, then degrade gracefully. Never log the key.
    console.error(
      "[chat] extractAndClassify failed:",
      err instanceof Error ? err.message : err,
      "| provider=",
      process.env.LLM_PROVIDER,
      "| deepseekKeyPresent=",
      Boolean(process.env.DEEPSEEK_API_KEY),
    );
    return new Response(
      JSON.stringify({
        reply: apiT("llm_error", lang),
        profile: session.profile,
        missingFields: [],
        stage: MANUAL_FORM_STAGE,
        error: true,
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  }

  // --- Merge profile ---
  session.profile = mergeProfile(session.profile, intentResult.extracted);
  session.turns += 1;
  // Incomplete collateral is dropped from the engine profile by the sanitizer;
  // remember the offered asset class at the session level so the advisor can
  // ask for its value — strong collateral waives the income requirement.
  if (session.profile.tai_san_dam_bao) {
    session.pendingCollateralLoai = undefined;
  } else if (intentResult.collateralLoaiStated) {
    session.pendingCollateralLoai = intentResult.collateralLoaiStated;
  }
  session.wizardHistory = appendTurn(session.wizardHistory, {
    role: "user",
    content: sanitized,
  });
  sessions.set(sessionId, session);

  const { intent } = intentResult;

  // --- Policy-only intent ---
  if (intent === "POLICY") {
    const policyResult = await queryPolicyInline(sanitized, lang, policyPrefetch);
    session.wizardHistory = appendTurn(session.wizardHistory, {
      role: "assistant",
      content: `${apiT("policy_intro", lang)}\n${policyResult.answer}`,
    });
    sessions.set(sessionId, session);
    return new Response(
      JSON.stringify({
        reply: apiT("policy_intro", lang),
        stage: "policy_answer",
        explanation: policyResult?.answer,
        citations: policyResult?.citations,
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  }

  // --- Validate profile ---
  const { profile, result } = validateProfile(session.profile);

  // --- Valid loan intent, details still missing: ask, never reject ---
  // Checked before the rejection path because an unstated amount also yields a
  // null profile — the right response is a follow-up question, not out-of-scope.
  // The unified persona phrases the ask naturally from the dialogue so far; a
  // MIXED policy angle is covered by the same grounded reply. The canned
  // question survives only as a fallback when the LLM is unavailable.
  if (
    !result.valid &&
    result.missingFields.length > 0 &&
    session.turns < MAX_FOLLOWUP_TURNS
  ) {
    const convo = await converseInlineStream(
      policyPrefetch,
      sanitized,
      historyForCall(session.wizardHistory, sanitized),
      {
        knownProfile: session.profile,
        missingFields: result.missingFields,
        collateralLoai: session.pendingCollateralLoai,
      },
      lang,
    );
    // Same fallback as before, delivered as the narration when the advisor is down.
    const fallback = followUpReply(result.missingFields[0], lang);
    return sseResponse(async (write) => {
      write("turn", {
        stage: "adaptive_followup",
        profile: session.profile,
        missingFields: result.missingFields,
        pendingCollateralType: session.pendingCollateralLoai,
        citations: convo.error ? undefined : convo.citations,
      });
      const assistantText = await writeAdvisorReply(write, convo, fallback, lang);
      session.wizardHistory = appendTurn(session.wizardHistory, {
        role: "assistant",
        content: assistantText,
      });
      sessions.set(sessionId, session);
      write("done", {});
    });
  }

  if (!result.valid && result.missingFields.length > 0) {
    // Cap reached — show inline form for remaining fields
    const reply = apiT("fallback_to_form", lang);
    session.wizardHistory = appendTurn(session.wizardHistory, {
      role: "assistant",
      content: reply,
    });
    sessions.set(sessionId, session);
    return new Response(
      JSON.stringify({
        reply,
        profile: session.profile,
        missingFields: result.missingFields,
        pendingCollateralType: session.pendingCollateralLoai,
        stage: MANUAL_FORM_STAGE,
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  }

  if (!profile) {
    // Not priceable: general finance chat, a real-life situation the wizard
    // cannot price, or a stated-but-invalid value. The unified persona answers
    // with full dialogue context; a validation note is passed as a hint so it
    // can explain the problem naturally. No Decision Engine runs here.
    const rejectionHint =
      result.rejectedCode && result.rejectedCode !== "invalid_purpose"
        ? apiT(REJECTION_MESSAGE_KEY[result.rejectedCode], lang)
        : undefined;
    const convo = await converseInlineStream(
      policyPrefetch,
      sanitized,
      historyForCall(session.wizardHistory, sanitized),
      {
        knownProfile: session.profile,
        rejectionHint,
        collateralLoai: session.pendingCollateralLoai,
      },
      lang,
    );
    // Same fallback as before — the friendly localized out-of-scope reply.
    const reasonText = result.rejectedCode
      ? apiT(REJECTION_MESSAGE_KEY[result.rejectedCode], lang)
      : "";
    const reasonSuffix = reasonText
      ? ` ${apiT("reason_prefix", lang)}: ${reasonText}`
      : "";
    const fallback = `${apiT("out_of_scope", lang)}${reasonSuffix}`;
    return sseResponse(async (write) => {
      write("turn", {
        stage: "advisory_answer",
        citations: convo.error ? [] : convo.citations,
      });
      const assistantText = await writeAdvisorReply(write, convo, fallback, lang);
      session.wizardHistory = appendTurn(session.wizardHistory, {
        role: "assistant",
        content: assistantText,
      });
      sessions.set(sessionId, session);
      write("done", {});
    });
  }

  // --- Profile complete: run deterministic pipeline + SSE stream ---
  // A MIXED policy angle is answered alongside the engine results (the policy
  // answer prefixes the narration stream below).
  const policyResult =
    intent === "MIXED"
      ? await queryPolicyInline(sanitized, lang, policyPrefetch)
      : null;

  session.wizardHistory = appendTurn(session.wizardHistory, {
    role: "assistant",
    content: apiT("results_ready", lang),
  });
  sessions.set(sessionId, session);

  const scoreLog = runCalculation({
    ...profile,
    thoi_han_thang: profile.thoi_han_thang!,
    // Income may be null when strong collateral qualifies the loan on asset
    // coverage; the pipeline handles the absent-income case deterministically.
    thu_nhap_hang_thang: profile.thu_nhap_hang_thang ?? null,
  });

  return sseResponse(async (write) => {
    // 1. Authoritative results event (numbers from engine, never from LLM)
    write("results", {
      reply: apiT("results_ready", lang),
      stage: "results",
      profile,
      missingFields: [],
      ranked: scoreLog.ranked,
      rejected: scoreLog.rejected,
      recovery: scoreLog.recovery,
      citations: policyResult?.citations,
    });

    // 2. LLM narration stream (presentation-only)
    try {
      if (intent === "MIXED" && policyResult && !policyResult.error) {
        write("explanation", { delta: policyResult.answer + "\n\n---\n\n" });
      }

      const explanationStream = await llm.explainResult(scoreLog, lang);
      for await (const delta of explanationStream) {
        write("explanation", { delta });
      }
      write("done", {});
    } catch {
      // Narration failed — ranked numbers already delivered above remain authoritative
      write("explanation_error", {
        message: apiT("explanation_error", lang),
      });
    }
  });
}
