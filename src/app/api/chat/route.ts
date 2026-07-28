import { NextRequest } from "next/server";
import { getLLMProvider } from "@/lib/ai/provider";
import { extractAndClassify, mergeProfile } from "@/lib/ai/intent";
import { followUpReply } from "@/lib/ai/questionEngine";
import { validateProfile } from "@/lib/validation/profileSchema";
import { runCalculation } from "@/lib/engine/pipeline";
import { getAllChunks } from "@/lib/ai/rag/store";
import { retrieveTopK } from "@/lib/ai/rag/retrieve";
import { embedText } from "@/lib/ai/rag/embed";

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
const OUT_OF_SCOPE_DECLINE =
  "Xin lỗi, tôi chỉ có thể hỗ trợ các kịch bản vay thực tế tại Việt Nam. Vui lòng điều chỉnh thông tin trong biểu mẫu bên dưới.";

/* ================================================================
   SSE helper
   ================================================================ */

function sseEncode(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

/* ================================================================
   Policy query helper (inline RAG)
   ================================================================ */

async function queryPolicyInline(question: string) {
  try {
    const queryEmbedding = await embedText(question);
    const chunks = getAllChunks();
    const top = retrieveTopK(queryEmbedding, chunks, 5);

    if (top.length === 0) {
      return { answer: "not found in the documents", citations: [], error: false };
    }

    const llm = getLLMProvider();
    const answer = await llm.answerPolicyQuery(
      question,
      top.map((t) => ({ text: t.chunk.text, bank: t.chunk.bank, section: t.chunk.section })),
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
  let body: { sessionId?: string; message?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { sessionId, message } = body;
  if (!sessionId || !message) {
    return new Response(
      JSON.stringify({ error: "sessionId and message are required" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const llm = getLLMProvider();
  const session = sessions.get(sessionId) ?? { profile: {}, turns: 0 };

  // --- Intent extraction ---
  let intentResult;
  try {
    intentResult = await extractAndClassify(message, session.profile, session.turns, llm);
  } catch {
    // LLM call failed — graceful degradation
    return new Response(
      JSON.stringify({
        reply: "Tôi gặp khó khăn khi xử lý yêu cầu — vui lòng sử dụng biểu mẫu bên dưới.",
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
    policyResult = await queryPolicyInline(message);
  }

  if (intent === "POLICY") {
    return new Response(
      JSON.stringify({
        reply: "Đây là thông tin tôi tìm được từ chính sách:",
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
    return new Response(
      JSON.stringify({
        reply: `${OUT_OF_SCOPE_DECLINE}${result.rejectedReason ? ` Lý do: ${result.rejectedReason}.` : ""}`,
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
    let reply = followUpReply(result.missingFields[0]);
    if (intent === "MIXED" && policyResult && !policyResult.error) {
      reply = `${policyResult.answer}\n\nNgoài ra, ${reply.toLowerCase()}`;
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
    // Cap reached — fall back to manual form
    return new Response(
      JSON.stringify({
        reply: "Vui lòng điền thêm thông tin trong biểu mẫu để tôi có thể tính toán chính xác.",
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
        reply: "Đã đủ thông tin — đây là các phương án phù hợp nhất.",
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

        const explanationStream = await llm.explainResult(scoreLog);
        for await (const delta of explanationStream) {
          write("explanation", { delta });
        }
        write("done", {});
      } catch {
        // Narration failed — ranked numbers already delivered above remain authoritative
        write("explanation_error", {
          message: "Không thể tạo giải thích — vui lòng xem kết quả xếp hạng ở trên.",
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
