import { NextRequest, NextResponse } from "next/server";
import { getLLMProvider } from "@/lib/ai/provider";
import { getAllChunks } from "@/lib/ai/rag/store";
import { retrieveTopK } from "@/lib/ai/rag/retrieve";
import { embedText } from "@/lib/ai/rag/embed";

export interface PolicyQueryResult {
  answer: string;
  citations: { bank: string; section: string }[];
  belowThreshold: boolean;
  error?: boolean;
}

/**
 * POST /api/policy
 * Body: { question: string }
 * RAG pipeline: embed query -> retrieve top-K -> LLM answer with citations.
 */
export async function POST(request: NextRequest) {
  let body: { question?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { question } = body;
  if (!question || typeof question !== "string") {
    return NextResponse.json({ error: "question is required" }, { status: 400 });
  }

  try {
    const queryEmbedding = await embedText(question);
    const chunks = getAllChunks();
    const top = retrieveTopK(queryEmbedding, chunks, 5);

    if (top.length === 0) {
      return NextResponse.json({
        answer: "not found in the documents",
        citations: [],
        belowThreshold: true,
      });
    }

    const llm = getLLMProvider();
    const answer = await llm.answerPolicyQuery(
      question,
      top.map((t) => ({ text: t.chunk.text, bank: t.chunk.bank, section: t.chunk.section })),
    );

    // Deduplicate citations based on bank + section
    const uniqueCitations = Array.from(
      new Set(top.map((t) => `${t.chunk.bank}|${t.chunk.section}`)),
    ).map((str) => {
      const [bank, section] = str.split("|");
      return { bank, section };
    });

    return NextResponse.json({
      answer,
      citations: uniqueCitations,
      belowThreshold: false,
    });
  } catch {
    return NextResponse.json(
      {
        answer: "not found in the documents",
        citations: [],
        belowThreshold: true,
        error: true,
      },
      { status: 503 },
    );
  }
}
