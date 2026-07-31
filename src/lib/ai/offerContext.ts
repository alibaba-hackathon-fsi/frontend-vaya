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
