import { INTAKE_QUESTIONS, getNextQuestion, type IntakeQuestion } from "@/data/intakeQuestions";

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

/**
 * Given the current session profile, determine which required fields
 * are still missing and generate the next follow-up question.
 */
export function askNextQuestion(profile: Record<string, unknown>): QuestionEngineResult {
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
    return { hasMissing: false, nextQuestion: null, missingFields: [], reply: null };
  }

  return {
    hasMissing: true,
    nextQuestion,
    missingFields,
    reply: nextQuestion.promptVi,
  };
}

/**
 * Generate a friendly follow-up reply for a specific missing field.
 */
export function followUpReply(missingField: string): string {
  const question = INTAKE_QUESTIONS.find((q) => q.field === missingField);
  if (question) return question.promptVi;

  // Fallback: humanize the field name
  const humanized = missingField.replace(/_/g, " ");
  return `Bạn có thể cho biết thêm về ${humanized} không?`;
}
