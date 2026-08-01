import { NextRequest } from "next/server";
import { getLLMProvider, type PolicyChunkContext } from "@/lib/ai/provider";
import type {
  OfferDiscussionContext,
  AffordabilityInputs,
  AffordabilityVerdict,
} from "@/lib/ai/offerContext";
import { calcMonthlyPayment } from "@/lib/engine/calcMonthlyPayment";
import { calcDTI, DTI_CAP } from "@/lib/engine/calcDTI";
import { scoreRisk } from "@/lib/engine/scoreRisk";
import { extractAndClassify, mergeProfile } from "@/lib/ai/intent";
import { followUpReply } from "@/lib/ai/questionEngine";
import { validateProfile, type RejectionCode } from "@/lib/validation/profileSchema";
import { runCalculation } from "@/lib/engine/pipeline";
import { getAllChunks } from "@/lib/ai/rag/store";
import { retrieveTopK } from "@/lib/ai/rag/retrieve";
import { embedText } from "@/lib/ai/rag/embed";
import { apiT, parseLang, type ApiLang, type ApiMessageKey } from "@/lib/i18n/apiMessages";
import { checkRateLimit } from "@/lib/security/rateLimit";
import { detectInjection, sanitizeMessage } from "@/lib/security/inputGuard";

/* ================================================================
   Session state — in-memory (demo-grade; swap for Redis before prod)
   ================================================================ */

interface ChatSession {
  profile: Record<string, unknown>;
  turns: number;
  /** Multi-turn history for offer-discussion mode (separate from the wizard profile flow). */
  offerHistory?: { role: "user" | "assistant"; content: string }[];
  /** Last engine-computed affordability verdict; injected into later turns. */
  offerVerdict?: AffordabilityVerdict;
}

const sessions = new Map<string, ChatSession>();

const MAX_FOLLOWUP_TURNS = 3;
const MANUAL_FORM_STAGE = "fallback_to_manual_form";
/** Cap on retained offer-discussion messages so long talks don't blow the context window. */
const OFFER_HISTORY_MAX_MESSAGES = 20;
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

/**
 * Compute the affordability verdict for the deal actually on the table:
 * min(request, offer) amount and term at the offered rate. Pure orchestration
 * of Decision Engine functions — deterministic, no LLM involved.
 */
function computeOfferVerdict(
  offer: OfferDiscussionContext,
  inputs: AffordabilityInputs,
): AffordabilityVerdict {
  const amount = Math.min(offer.request.amount, offer.maxAmount);
  const termMonths = Math.min(offer.request.termMonths, offer.termMonths);
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

/* ================================================================
   Policy query helper (inline RAG)
   ================================================================ */

async function queryPolicyInline(question: string, lang: ApiLang) {
  try {
    const queryEmbedding = await embedText(question);
    const chunks = getAllChunks();
    const top = retrieveTopK(queryEmbedding, chunks, 5);

    if (top.length === 0) {
      return {
        answer: "not found in the documents",
        citations: [],
        error: false,
      };
    }

    const llm = getLLMProvider();
    const answer = await llm.answerPolicyQuery(
      question,
      top.map((t) => ({
        text: t.chunk.text,
        bank: t.chunk.bank,
        section: t.chunk.section,
      })),
      lang,
    );

    const citations = Array.from(
      new Set(top.map((t) => `${t.chunk.bank}|${t.chunk.section}`)),
    ).map((str) => {
      const [bank, section] = str.split("|");
      return { bank, section };
    });

    return { answer, citations, error: false };
  } catch {
    return { answer: "not found in the documents", citations: [], error: true };
  }
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
  const session = sessions.get(sessionId) ?? { profile: {}, turns: 0 };

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

    let policyChunks: PolicyChunkContext[] = [];
    try {
      const queryEmbedding = await embedText(sanitized);
      policyChunks = retrieveOfferPolicyChunks(queryEmbedding, offer.bank);
    } catch {
      policyChunks = [];
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const write = (event: string, data: unknown) => {
          controller.enqueue(encoder.encode(sseEncode(event, data)));
        };

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

        controller.close();
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

  // --- Intent extraction ---
  let intentResult;
  try {
    intentResult = await extractAndClassify(
      sanitized,
      session.profile,
      session.turns,
      llm,
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
  sessions.set(sessionId, session);

  const { intent } = intentResult;

  // --- Policy-only intent ---
  let policyResult = null;
  if (intent === "POLICY" || intent === "MIXED") {
    policyResult = await queryPolicyInline(sanitized, lang);
  }

  if (intent === "POLICY") {
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

  if (!profile) {
    const reasonText = result.rejectedCode
      ? apiT(REJECTION_MESSAGE_KEY[result.rejectedCode], lang)
      : "";
    const reasonSuffix = reasonText
      ? ` ${apiT("reason_prefix", lang)}: ${reasonText}`
      : "";
    return new Response(
      JSON.stringify({
        reply: `${apiT("out_of_scope", lang)}${reasonSuffix}`,
        profile: session.profile,
        missingFields: [],
        rejectedReason: reasonText,
        stage: MANUAL_FORM_STAGE,
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  }

  // --- Missing fields: adaptive follow-up ---
  if (!result.valid && session.turns < MAX_FOLLOWUP_TURNS) {
    let reply = followUpReply(result.missingFields[0], lang);
    if (intent === "MIXED" && policyResult && !policyResult.error) {
      reply = `${policyResult.answer}\n\n${apiT("also_prefix", lang)}${reply.toLowerCase()}`;
    }
    return new Response(
      JSON.stringify({
        reply,
        profile: session.profile,
        missingFields: result.missingFields,
        stage: "adaptive_followup",
        citations: policyResult?.citations,
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  }

  if (!result.valid) {
    // Cap reached — show inline form for remaining fields
    return new Response(
      JSON.stringify({
        reply: apiT("fallback_to_form", lang),
        profile: session.profile,
        missingFields: result.missingFields,
        stage: MANUAL_FORM_STAGE,
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  }

  // --- Profile complete: run deterministic pipeline + SSE stream ---
  const scoreLog = runCalculation({
    ...profile,
    thoi_han_thang: profile.thoi_han_thang!,
    thu_nhap_hang_thang: profile.thu_nhap_hang_thang!,
  });

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const write = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(sseEncode(event, data)));
      };

      // 1. Authoritative results event (numbers from engine, never from LLM)
      write("results", {
        reply: apiT("results_ready", lang),
        stage: "results",
        profile,
        missingFields: [],
        ranked: scoreLog.ranked,
        rejected: scoreLog.rejected,
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

      controller.close();
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
