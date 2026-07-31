/**
 * Structured context describing a single marketplace (reverse-auction) offer,
 * used to ground the AI advisor's "discuss this offer" conversation.
 *
 * This is a pure type module with no runtime code so it can be imported from
 * both the client (which builds the context, resolving i18n condition keys to
 * readable text) and the server (which feeds it to the LLM) without pulling
 * server-only dependencies into the client bundle.
 *
 * The context is presentation data for the LLM only: the model explains and
 * discusses it but never uses it to compute — numbers remain the Decision
 * Engine's job.
 */

import type { RiskLevel } from "@/lib/engine/types";

/** The borrower's posted request that this offer is bidding on. */
export interface OfferRequestContext {
  /** Human-readable loan purpose (already localized). */
  purpose: string;
  amount: number;
  termMonths: number;
  collateral: boolean;
}

export interface OfferDiscussionContext {
  bank: string;
  /** The rate the bank is offering this borrower, % per year. */
  offeredRate: number;
  /** The bank's public listed rate for this product, % per year. */
  listedRate: number;
  /** How far under the listed rate the offer sits, % per year. */
  cutBelowListed: number;
  termMonths: number;
  maxAmount: number;
  /** Hours until the quote lapses. */
  expiresInH: number;
  /** Offer conditions, already resolved to human-readable localized text. */
  conditions: string[];
  request: OfferRequestContext;
}

/** Borrower inputs for the affordability check, resolved client-side. */
export interface AffordabilityInputs {
  /** Gross monthly income, VND. */
  income: number;
  /** Existing monthly debt obligations, VND (0 when none). */
  debt: number;
}

/**
 * The outcome of an affordability check, computed by the Decision Engine
 * (calcMonthlyPayment -> calcDTI -> scoreRisk) — never by the LLM. Emitted
 * as an SSE event for deterministic rendering and injected into the
 * discussion prompt as fact so follow-up questions stay grounded.
 */
export interface AffordabilityVerdict {
  /** The priced deal: min(request, offer) amount and term at the offered rate. */
  amount: number;
  termMonths: number;
  rate: number;
  /** First-month payment (declining balance), VND. */
  monthlyPayment: number;
  /** (payment + existing debt) / income, e.g. 0.435. */
  dti: number;
  /** The safe limit the DTI was checked against, e.g. 0.6. */
  dtiCap: number;
  withinLimit: boolean;
  riskLevel: RiskLevel;
  /** The borrower inputs used — lets the narration explain and audit the verdict. */
  income: number;
  debt: number;
}
