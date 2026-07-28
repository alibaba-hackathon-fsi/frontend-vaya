import type { LoanProduct } from "@/lib/engine/types";
import { vietcombankHome } from "./vietcombank";

const products: LoanProduct[] = [vietcombankHome];

export function getAllProducts(): LoanProduct[] {
  return products;
}

export function getProduct(productId: string): LoanProduct | null {
  return products.find((product) => product.productId === productId) ?? null;
}

export function getProductsByBank(bankId: string): LoanProduct[] {
  return products.filter((product) => product.bankId === bankId);
}

export function getProductsByPurpose(purpose: LoanProduct["purpose"]): LoanProduct[] {
  return products.filter((product) => product.purpose === purpose);
}
