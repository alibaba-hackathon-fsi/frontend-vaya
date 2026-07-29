// Front-end mock of the Survival-Score finance engine. The real BE/AI pipeline
// (feature engineering → cash-flow engine → Monte-Carlo → risk scoring → LLM)
// is owned by the backend teammate; this mirrors it client-side so the UI is
// fully interactive and ready to swap for the API.
import { PKG } from "@/data/banks";
import { monthly } from "@/lib/loanEngine";

export type SurvInput = {
  purpose: string;
  amount: number;
  term: number;
  income: number;
  expenses: number;
  debt: number;
  savings: number;
  down: number;
  dependents: number;
  employment: string;
  collateral: string;
};

export type SurvMetrics = {
  emi: number; dti: number; pti: number; ltv: number; disposable: number;
  efr: number; stab: number; score: number; depCost: number; rate: number;
};

export type MCResult = {
  months: number[]; p10: number[]; p50: number[]; p90: number[];
  ruin: number; stress: number[]; met: SurvMetrics; base: number;
};

export function pickRate(purpose: string): { rate: number; std: number } {
  const ps = PKG.filter((p) => p.purpose === purpose);
  if (!ps.length) return { rate: 12, std: 14 };
  const best = ps.reduce((a, b) => (b.rate < a.rate ? b : a));
  return { rate: best.rate, std: best.std };
}

function rnorm(): number {
  const u = Math.random() || 1e-9;
  const v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function fvShort(v: number): string {
  const n = Math.abs(v);
  const s = v < 0 ? "-" : "";
  if (n >= 1e9) return s + "₫" + (n / 1e9).toFixed(1) + "B";
  if (n >= 1e6) return s + "₫" + Math.round(n / 1e6) + "M";
  return s + "₫" + Math.round(n);
}

export function computeMetrics(inp: SurvInput): SurvMetrics {
  const pr = pickRate(inp.purpose);
  const rate = pr.std || pr.rate || 12;
  const emi = monthly(inp.amount, rate, Math.max(1, inp.term || 1));
  const depCost = (inp.dependents || 0) * 3000000;
  const out = inp.expenses + inp.debt + emi + depCost;
  const disposable = inp.income - out;
  const dti = inp.income > 0 ? ((emi + inp.debt) / inp.income) * 100 : 999;
  const pti = inp.income > 0 ? (emi / inp.income) * 100 : 999;
  const asset = inp.amount + inp.down;
  const ltv = asset > 0 ? (inp.amount / asset) * 100 : 0;
  const efr = out > 0 ? inp.savings / out : 99;
  const stabMap: Record<string, number> = { salaried: 88, gov: 95, business: 70, self: 60, freelance: 52 };
  const stab = stabMap[inp.employment] || 70;
  let sc = 100;
  sc -= Math.max(0, dti - 35) * 1.1;
  sc -= Math.max(0, pti - 30);
  sc -= Math.max(0, ltv - 70) * 0.35;
  sc += Math.min(18, efr * 2.5);
  sc += (stab - 70) * 0.3;
  sc += disposable > 0 ? 8 : -28;
  sc -= (inp.dependents || 0) * 1.5;
  sc = Math.max(5, Math.min(97, Math.round(sc)));
  return { emi, dti, pti, ltv, disposable, efr, stab, score: sc, depCost, rate };
}

export function monteCarlo(inp: SurvInput, T: number, N: number): MCResult {
  const met = computeMetrics(inp);
  const base = inp.income - inp.expenses - inp.debt - met.emi - met.depCost;
  const months: number[] = [];
  for (let i = 0; i <= T; i++) months.push(i);
  const paths: number[][] = [];
  for (let s = 0; s < N; s++) {
    let bal = inp.savings;
    const path = [bal];
    for (let i = 1; i <= T; i++) {
      let net = base + inp.income * (rnorm() * 0.12);
      if (Math.random() < 0.02) net -= inp.income * 0.6;
      bal += net;
      path.push(bal);
    }
    paths.push(path);
  }
  const p10: number[] = [], p50: number[] = [], p90: number[] = [];
  for (let i = 0; i <= T; i++) {
    const col = paths.map((p) => p[i]).sort((a, b) => a - b);
    p10.push(col[Math.floor(N * 0.1)]);
    p50.push(col[Math.floor(N * 0.5)]);
    p90.push(col[Math.floor(N * 0.9)]);
  }
  let ruin = 0;
  for (let s = 0; s < N; s++) if (paths[s].some((v) => v < 0)) ruin++;
  ruin /= N;
  const stress: number[] = [];
  let b2 = inp.savings;
  stress.push(b2);
  for (let i = 1; i <= T; i++) {
    const net2 = base - (i >= 6 && i <= 18 ? inp.income * 0.3 : 0);
    b2 += net2;
    stress.push(b2);
  }
  return { months, p10, p50, p90, ruin, stress, met, base };
}

// Savings-balance chart as an SVG string (band + expected path + stress line).
export function survChartSvg(mc: MCResult, T: number, fv: (v: number) => string): string {
  const { p10, p50, p90, stress } = mc;
  const n = mc.months.length;
  const W = 680, H = 250, pl = 52, pr = 14, pt = 14, pb = 26;
  const all = p10.concat(p90, stress, [0]);
  let mn = Math.min(...all), mx = Math.max(...all);
  if (mx === mn) mx = mn + 1;
  const X = (i: number) => pl + (i * (W - pl - pr)) / (n - 1);
  const Y = (v: number) => pt + (1 - (v - mn) / (mx - mn)) * (H - pt - pb);
  const up = p90.map((v, i) => X(i).toFixed(1) + "," + Y(v).toFixed(1)).join(" ");
  const dn = p10.map((v, i) => X(i).toFixed(1) + "," + Y(v).toFixed(1)).reverse().join(" ");
  const band = `<polygon points="${up} ${dn}" fill="rgba(0,199,118,.15)"/>`;
  const med = `<polyline points="${p50.map((v, i) => X(i).toFixed(1) + "," + Y(v).toFixed(1)).join(" ")}" fill="none" stroke="#0A8F55" stroke-width="2.6" stroke-linejoin="round"/>`;
  const stressLine = `<polyline points="${stress.map((v, i) => X(i).toFixed(1) + "," + Y(v).toFixed(1)).join(" ")}" fill="none" stroke="#E5533B" stroke-width="1.8" stroke-dasharray="5 4"/>`;
  const zero = mn < 0 ? `<line x1="${pl}" y1="${Y(0).toFixed(1)}" x2="${W - pr}" y2="${Y(0).toFixed(1)}" stroke="#E5533B" stroke-width="1" stroke-dasharray="2 3" opacity=".55"/>` : "";
  let grid = "";
  for (let g = 0; g <= 3; g++) {
    const val = mx - ((mx - mn) * g) / 3;
    const yy = Y(val);
    grid += `<line x1="${pl}" y1="${yy.toFixed(1)}" x2="${W - pr}" y2="${yy.toFixed(1)}" stroke="#EDF1F4"/><text x="${pl - 8}" y="${(yy + 4).toFixed(1)}" text-anchor="end" font-size="10.5" fill="#95A29F">${fv(val)}</text>`;
  }
  const marks = [0, 6, 12, 18, 24, 36, 48, 60].filter((x) => x <= T);
  if (marks[marks.length - 1] !== T) marks.push(T);
  let xl = "";
  marks.forEach((mm) => {
    const xx = X(Math.min(mm, n - 1));
    xl += `<text x="${xx.toFixed(1)}" y="${H - 9}" text-anchor="middle" font-size="10.5" fill="#95A29F">${mm}</text>`;
  });
  return `<svg viewBox="0 0 ${W} ${H}" class="survsvg">${grid}${zero}${band}${stressLine}${med}${xl}</svg>`;
}
