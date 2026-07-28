import {
  INTAKE_QUESTIONS,
  getNextQuestion,
  type IntakeQuestion,
} from "@/data/intakeQuestions";
import { apiT, type ApiLang } from "@/lib/i18n/apiMessages";

/* ================================================================
   Adaptive question engine
   Picks the next unanswered required question based on filled fields.
   ================================================================ */

export interface QuestionEngineResult {
  hasMissing: boolean;
  nextQuestion: IntakeQuestion | null;
  missingFields: string[];
  reply: string | null;
}

/** Resolve the localized prompt from an IntakeQuestion for the given lang. */
function promptFor(q: IntakeQuestion, lang: ApiLang): string {
  if (lang === "en") return q.promptEn;
  if (lang === "zh") return q.promptZh;
  return q.promptVi;
}

/**
 * Given the current session profile, determine which required fields
 * are still missing and generate the next follow-up question.
 */
export function askNextQuestion(
  profile: Record<string, unknown>,
  lang: ApiLang = "vi",
): QuestionEngineResult {
  const filledFields = new Set<string>();

  for (const [key, value] of Object.entries(profile)) {
    if (value !== null && value !== undefined && value !== "") {
      filledFields.add(key);
    }
  }

  const missingFields = INTAKE_QUESTIONS.filter(
    (q) => q.required && !filledFields.has(q.field),
  ).map((q) => q.field);

  const nextQuestion = getNextQuestion(filledFields);

  if (!nextQuestion) {
    return {
      hasMissing: false,
      nextQuestion: null,
      missingFields: [],
      reply: null,
    };
  }

  return {
    hasMissing: true,
    nextQuestion,
    missingFields,
    reply: promptFor(nextQuestion, lang),
  };
}

/**
 * Generate a friendly follow-up reply for a specific missing field.
 */
export function followUpReply(
  missingField: string,
  lang: ApiLang = "vi",
): string {
  const question = INTAKE_QUESTIONS.find((q) => q.field === missingField);
  if (question) return promptFor(question, lang);

  // Fallback: humanize the field name with localized template
  const humanized = missingField.replace(/_/g, " ");
  return apiT("followup_fallback", lang).replace("{field}", humanized);
}
