import { NextRequest } from "next/server";
import { getLLMProvider } from "@/lib/ai/provider";
import { extractAndClassify, mergeProfile } from "@/lib/ai/intent";
import { followUpReply } from "@/lib/ai/questionEngine";
import { validateProfile } from "@/lib/validation/profileSchema";
import { runCalculation } from "@/lib/engine/pipeline";
import { getAllChunks } from "@/lib/ai/rag/store";
import { retrieveTopK } from "@/lib/ai/rag/retrieve";
import { embedText } from "@/lib/ai/rag/embed";
import { apiT, parseLang, type ApiLang } from "@/lib/i18n/apiMessages";
import { checkRateLimit } from "@/lib/security/rateLimit";
import { detectInjection, sanitizeMessage } from "@/lib/security/inputGuard";

/* ================================================================
   Session state — in-memory (demo-grade; swap for Redis before prod)
   ================================================================ */

interface ChatSession {
  profile: Record<string, unknown>;
  turns: number;
}

const sessions = new Map<string, ChatSession>();

const MAX_FOLLOWUP_TURNS = 3;
const MANUAL_FORM_STAGE = "fallback_to_manual_form";

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
  let body: { sessionId?: string; message?: string; lang?: string };
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

  const llm = getLLMProvider();
  const session = sessions.get(sessionId) ?? { profile: {}, turns: 0 };

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
    const reasonSuffix = result.rejectedReason
      ? ` ${apiT("reason_prefix", lang)}: ${result.rejectedReason}.`
      : "";
    return new Response(
      JSON.stringify({
        reply: `${apiT("out_of_scope", lang)}${reasonSuffix}`,
        profile: session.profile,
        missingFields: [],
        rejectedReason: result.rejectedReason,
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
