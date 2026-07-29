// Front-end mock of the Survival-Score finance engine. The real BE/AI pipeline
// (feature engineering → cash-flow engine → Monte-Carlo → risk scoring → LLM)
// is owned by the backend teammate; this mirrors it client-side so the UI is
// fully interactive and ready to swap for the API.
import { PKG } from "@/data/banks";
import { monthly } from "@/lib/loanEngine";

export type SurvInput = {
  /** Index into PKG when the projection is run for a specific package. */
  pkgIdx?: number | null;
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
  let rate: number;
  if (inp.pkgIdx != null && PKG[inp.pkgIdx]) {
    const sp = PKG[inp.pkgIdx];
    rate = sp.std || sp.rate;
  } else {
    const pr = pickRate(inp.purpose);
    rate = pr.std || pr.rate || 12;
  }
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

/* ============ round 13: amortisation + richer chart builders ============ */

export type Amort = { rem: number[]; cum: number[]; emi: number; interest: number };

/** Remaining-balance and cumulative-interest series for one loan. */
export function amortSeries(P: number, annual: number, n: number): Amort {
  const r = annual / 100 / 12;
  const m = monthly(P, annual, n);
  let bal = P, ci = 0;
  const rem = [P], cum = [0];
  for (let i = 1; i <= n; i++) {
    const int = bal * r;
    ci += int;
    bal = Math.max(0, bal + int - m);
    rem.push(bal);
    cum.push(ci);
  }
  return { rem, cum, emi: m, interest: ci };
}

export type Series = { name: string; color: string; vals: number[]; dash?: boolean };

/** Multi-series line chart (SVG string) with y/x axes, end dots and staggered end labels. */
export function lineMultiSvg(series: Series[], W = 660, H = 220): string {
  const pl = 54, pr = 52, pt = 14, pb = 24;
  let all: number[] = [];
  series.forEach((s) => { all = all.concat(s.vals); });
  all.push(0);
  let mn = Math.min(...all), mx = Math.max(...all);
  if (mx === mn) mx = mn + 1;
  const n = series[0].vals.length;
  const X = (i: number) => pl + (i * (W - pl - pr)) / (n - 1);
  const Y = (v: number) => pt + (1 - (v - mn) / (mx - mn)) * (H - pt - pb);
  let grid = "";
  for (let g = 0; g <= 3; g++) {
    const val = mx - ((mx - mn) * g) / 3, yy = Y(val);
    grid += `<line x1="${pl}" y1="${yy.toFixed(1)}" x2="${W - pr}" y2="${yy.toFixed(1)}" stroke="#EDF1F4"/><text x="${pl - 8}" y="${(yy + 4).toFixed(1)}" text-anchor="end" font-size="10" fill="#95A29F">${fvShort(val)}</text>`;
  }
  const marks: number[] = [];
  const step = Math.max(1, Math.round((n - 1) / 6));
  for (let i = 0; i < n; i += step) marks.push(i);
  if (marks[marks.length - 1] !== n - 1) marks.push(n - 1);
  let xl = "";
  marks.forEach((i) => { xl += `<text x="${X(i).toFixed(1)}" y="${H - 7}" text-anchor="middle" font-size="10" fill="#95A29F">${i}</text>`; });
  const ends = series.map((s, i) => ({ i, y: Y(s.vals[n - 1]) }));
  ends.sort((a, b) => a.y - b.y);
  for (let k = 1; k < ends.length; k++) if (ends[k].y - ends[k - 1].y < 12) ends[k].y = ends[k - 1].y + 12;
  const lblY: Record<number, number> = {};
  ends.forEach((e) => { lblY[e.i] = e.y; });
  let lines = "";
  series.forEach((s, si) => {
    const pts = s.vals.map((v, i) => X(i).toFixed(1) + "," + Y(v).toFixed(1)).join(" ");
    lines += `<polyline points="${pts}" fill="none" stroke="${s.color}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"${s.dash ? ' stroke-dasharray="5 4"' : ""}/>`;
    const lx = X(n - 1), ly = Y(s.vals[n - 1]);
    lines += `<circle cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="3.6" fill="${s.color}" stroke="#fff" stroke-width="1.6"/>`;
    lines += `<text x="${(lx + 7).toFixed(1)}" y="${(lblY[si] + 3.5).toFixed(1)}" font-size="10.5" font-weight="700" fill="${s.color}">${fvShort(s.vals[n - 1])}</text>`;
  });
  return `<svg viewBox="0 0 ${W} ${H}" class="survsvg">${grid}${xl}${lines}</svg>`;
}

/** Rate-trend chart with axes, dots and min/max annotations. */
export function trendChartRichSvg(arr: number[]): string {
  const W = 660, H = 190, pl = 46, pr = 16, pt = 16, pb = 24, n = arr.length;
  let mn = Math.min(...arr), mx = Math.max(...arr);
  const pad = (mx - mn) * 0.25 || 0.4;
  mn -= pad; mx += pad;
  const X = (i: number) => pl + (i * (W - pl - pr)) / (n - 1);
  const Y = (v: number) => pt + (1 - (v - mn) / (mx - mn)) * (H - pt - pb);
  let grid = "";
  for (let g = 0; g <= 3; g++) {
    const val = mx - ((mx - mn) * g) / 3, yy = Y(val);
    grid += `<line x1="${pl}" y1="${yy.toFixed(1)}" x2="${W - pr}" y2="${yy.toFixed(1)}" stroke="#EDF1F4"/><text x="${pl - 8}" y="${(yy + 4).toFixed(1)}" text-anchor="end" font-size="10" fill="#95A29F">${val.toFixed(1)}%</text>`;
  }
  const line = arr.map((v, i) => X(i).toFixed(1) + "," + Y(v).toFixed(1)).join(" ");
  const area = `<polygon points="${pl},${H - pb} ${line} ${W - pr},${H - pb}" fill="url(#dtg)"/>`;
  let dots = "";
  arr.forEach((v, i) => { dots += `<circle cx="${X(i).toFixed(1)}" cy="${Y(v).toFixed(1)}" r="2.6" fill="#fff" stroke="#0A8F55" stroke-width="1.6"/>`; });
  const lo = Math.min(...arr), hi = Math.max(...arr);
  const iMin = arr.indexOf(lo), iMax = arr.indexOf(hi);
  const ann = `<g><circle cx="${X(iMin).toFixed(1)}" cy="${Y(lo).toFixed(1)}" r="4.4" fill="#00C776" stroke="#fff" stroke-width="2"/><text x="${X(iMin).toFixed(1)}" y="${(Y(lo) + 16).toFixed(1)}" text-anchor="middle" font-size="10" font-weight="700" fill="#0A8F55">${lo.toFixed(1)}%</text></g>`
    + `<g><circle cx="${X(iMax).toFixed(1)}" cy="${Y(hi).toFixed(1)}" r="4.4" fill="#E5533B" stroke="#fff" stroke-width="2"/><text x="${X(iMax).toFixed(1)}" y="${(Y(hi) - 9).toFixed(1)}" text-anchor="middle" font-size="10" font-weight="700" fill="#E5533B">${hi.toFixed(1)}%</text></g>`;
  const MO = ["Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"];
  let xl = "";
  arr.forEach((v, i) => { if (i % 2 === 0 || i === n - 1) xl += `<text x="${X(i).toFixed(1)}" y="${H - 7}" text-anchor="middle" font-size="10" fill="#95A29F">${MO[i] ?? i}</text>`; });
  return `<svg viewBox="0 0 ${W} ${H}" class="survsvg"><defs><linearGradient id="dtg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#00C776" stop-opacity=".24"/><stop offset="1" stop-color="#00C776" stop-opacity="0"/></linearGradient></defs>${grid}${area}<polyline points="${line}" fill="none" stroke="#0A8F55" stroke-width="2.6" stroke-linejoin="round"/>${dots}${ann}${xl}</svg>`;
}

/** Distinct palette so comparison series never collide visually. */
export const PAL = ["#0A8F55", "#2F6BFF", "#E5533B", "#8180C8"];
