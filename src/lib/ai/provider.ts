import OpenAI from "openai";
import {
  EXTRACT_INTENT_SYSTEM_PROMPT,
  EXTRACT_INTENT_TOOL,
} from "./prompts/extractIntent";
import { explainResultPrompt } from "./prompts/explainResult";
import { policyAnswerPrompt } from "./prompts/policyAnswer";
import { discussOfferPrompt } from "./prompts/discussOffer";
import type {
  OfferDiscussionContext,
  AffordabilityVerdict,
  OfferPricing,
} from "./offerContext";
import type { ApiLang } from "@/lib/i18n/apiMessages";

/* ================================================================
   Provider-agnostic interfaces
   ================================================================ */

export interface ExtractIntentResult {
  profile: Record<string, unknown>;
  raw: unknown;
}

export interface PolicyChunkContext {
  text: string;
  bank: string;
  section: string;
}

export interface LLMProvider {
  extractIntent(
    message: string,
    conversationHistory?: { role: "user" | "assistant"; content: string }[],
  ): Promise<ExtractIntentResult>;

  explainResult(
    scoreLog: unknown,
    lang?: ApiLang,
  ): Promise<AsyncIterable<string>>;

  answerPolicyQuery(
    question: string,
    contextChunks: PolicyChunkContext[],
    lang?: ApiLang,
  ): Promise<string>;

  discussOffer(
    offer: OfferDiscussionContext,
    policyChunks: PolicyChunkContext[],
    message: string,
    history: { role: "user" | "assistant"; content: string }[],
    lang?: ApiLang,
    verdict?: AffordabilityVerdict,
    pricing?: OfferPricing,
  ): Promise<AsyncIterable<string>>;
}

/* ================================================================
   Client factory — switchable via LLM_PROVIDER env var
   ================================================================ */

const DASHSCOPE_BASE_URL =
  "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";
const DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1";

function getClient(): OpenAI {
  const provider = (process.env.LLM_PROVIDER ?? "qwen").toLowerCase();

  if (provider === "deepseek") {
    return new OpenAI({
      apiKey:
        process.env.DEEPSEEK_API_KEY ||
        "unset-configure-DEEPSEEK_API_KEY-in-.env",
      baseURL: process.env.DEEPSEEK_BASE_URL || DEEPSEEK_BASE_URL,
    });
  }

  // Default: Qwen via DashScope
  return new OpenAI({
    apiKey:
      process.env.DASHSCOPE_API_KEY ||
      "unset-configure-DASHSCOPE_API_KEY-in-.env",
    baseURL: process.env.DASHSCOPE_BASE_URL || DASHSCOPE_BASE_URL,
  });
}

function getModel(): string {
  const provider = (process.env.LLM_PROVIDER ?? "qwen").toLowerCase();
  if (provider === "deepseek") {
    return process.env.DEEPSEEK_MODEL ?? "deepseek-chat";
  }
  return process.env.DASHSCOPE_MODEL ?? "qwen-plus";
}

/* ================================================================
   Unified provider implementation (OpenAI-compatible)
   ================================================================ */

class OpenAICompatProvider implements LLMProvider {
  async extractIntent(
    message: string,
    history: { role: "user" | "assistant"; content: string }[] = [],
  ): Promise<ExtractIntentResult> {
    const response = await getClient().chat.completions.create({
      model: getModel(),
      messages: [
        { role: "system", content: EXTRACT_INTENT_SYSTEM_PROMPT },
        ...history,
        { role: "user", content: message },
      ],
      tools: [EXTRACT_INTENT_TOOL],
      tool_choice: {
        type: "function",
        function: { name: "extract_loan_intent" },
      },
      temperature: 0.1,
    });

    const toolCall = response.choices[0]?.message?.tool_calls?.[0];
    if (!toolCall || !("function" in toolCall))
      return { profile: {}, raw: response };

    const profile = JSON.parse(toolCall.function.arguments);
    return { profile, raw: response };
  }

  async explainResult(
    scoreLog: unknown,
    lang: ApiLang = "vi",
  ): Promise<AsyncIterable<string>> {
    const stream = await getClient().chat.completions.create({
      model: getModel(),
      messages: [
        { role: "system", content: explainResultPrompt(lang) },
        { role: "user", content: JSON.stringify(scoreLog) },
      ],
      stream: true,
      temperature: 0.3,
    });

    async function* iterate() {
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) yield delta;
      }
    }
    return iterate();
  }

  async answerPolicyQuery(
    question: string,
    contextChunks: PolicyChunkContext[],
    lang: ApiLang = "vi",
  ): Promise<string> {
    const context = contextChunks
      .map((c) => `[${c.bank} — ${c.section}]\n${c.text}`)
      .join("\n\n");

    const response = await getClient().chat.completions.create({
      model: getModel(),
      messages: [
        { role: "system", content: policyAnswerPrompt(lang) },
        {
          role: "user",
          content: `Excerpts:\n${context}\n\nQuestion: ${question}`,
        },
      ],
      temperature: 0,
    });

    return (
      response.choices[0]?.message?.content ?? "not found in the documents"
    );
  }

  async discussOffer(
    offer: OfferDiscussionContext,
    policyChunks: PolicyChunkContext[],
    message: string,
    history: { role: "user" | "assistant"; content: string }[],
    lang: ApiLang = "vi",
    verdict?: AffordabilityVerdict,
    pricing?: OfferPricing,
  ): Promise<AsyncIterable<string>> {
    // Format the bank's policy excerpts the same way answerPolicyQuery does;
    // empty string when no relevant policy documents were retrieved.
    const policyExcerpts = policyChunks
      .map((c) => `[${c.bank} — ${c.section}]\n${c.text}`)
      .join("\n\n");

    const stream = await getClient().chat.completions.create({
      model: getModel(),
      messages: [
        {
          role: "system",
          content: discussOfferPrompt(offer, policyExcerpts, lang, verdict, pricing),
        },
        ...history,
        { role: "user", content: message },
      ],
      stream: true,
      temperature: 0.4,
    });

    async function* iterate() {
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) yield delta;
      }
    }
    return iterate();
  }
}

/* ================================================================
   Singleton accessor
   ================================================================ */

let instance: LLMProvider | null = null;

export function getLLMProvider(): LLMProvider {
  if (!instance) {
    instance = new OpenAICompatProvider();
  }
  return instance;
}
