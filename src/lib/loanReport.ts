"use client";

/**
 * Builds the downloadable summary of a finished advisor conversation.
 *
 * It emits ONE self-contained HTML file — no network, no fonts to fetch, charts
 * drawn as inline SVG — so it still renders years later from a Downloads folder
 * or an email attachment, and prints to a clean A4 PDF via the browser.
 *
 * All copy arrives already translated from the caller; this module only lays it
 * out, so the report speaks whatever language the chat did.
 */

export type ReportRow = {
  bank: string;
  product: string;
  /** promotional / headline rate, % per year */
  rate: number;
  /** post-promo rate, % per year (falls back to `rate` when there is no promo) */
  std: number;
  monthly: string;
  interest: number;
  interestLabel: string;
  term: string;
  best?: boolean;
};

export type ReportData = {
  brand: string;
  title: string;
  subtitle: string;
  generatedLabel: string;
  briefTitle: string;
  brief: [string, string][];
  tableTitle: string;
  headers: string[];
  rows: ReportRow[];
  chartTitle: string;
  bestLabel: string;
  stepsTitle: string;
  steps: string[];
  disclaimer: string;
  printLabel: string;
  lang: string;
};

const esc = (s: string) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const PAL = ["#00A863", "#013D3B", "#E08A1E", "#3B7FE0", "#B4519B"];

/** Horizontal bar chart of total interest, as inline SVG so it survives printing. */
function chartSvg(rows: ReportRow[]): string {
  if (!rows.length) return "";
  const W = 720;
  const rowH = 34;
  const labelW = 150;
  const valueW = 120;
  const H = rows.length * rowH + 8;
  const max = Math.max(...rows.map((r) => r.interest)) || 1;
  const barMax = W - labelW - valueW - 16;

  const bars = rows
    .map((r, i) => {
      const y = i * rowH + 4;
      const w = Math.max(2, Math.round((r.interest / max) * barMax));
      const c = PAL[i % PAL.length];
      return `
    <text x="0" y="${y + 19}" font-size="13" font-weight="600" fill="#013D3B">${esc(
      r.bank.length > 18 ? r.bank.slice(0, 17) + "…" : r.bank,
    )}</text>
    <rect x="${labelW}" y="${y + 6}" width="${barMax}" height="16" fill="#EDF1F4"/>
    <rect x="${labelW}" y="${y + 6}" width="${w}" height="16" fill="${c}"/>
    <text x="${labelW + barMax + 10}" y="${y + 19}" font-size="12.5" fill="#3C4B48">${esc(
      r.interestLabel,
    )}</text>`;
    })
    .join("");

  return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" xmlns="http://www.w3.org/2000/svg" role="img">${bars}
</svg>`;
}

function buildHtml(d: ReportData): string {
  const now = new Date();
  const stamp = now.toLocaleString(
    d.lang === "vi" ? "vi-VN" : d.lang === "zh" ? "zh-CN" : "en-GB",
    { dateStyle: "long", timeStyle: "short" },
  );

  const brief = d.brief
    .map(
      ([k, v]) =>
        `<div class="bi"><span>${esc(k)}</span><b>${esc(v)}</b></div>`,
    )
    .join("");

  const head = d.headers.map((h) => `<th>${esc(h)}</th>`).join("");
  const body = d.rows
    .map(
      (r, i) => `<tr class="${r.best ? "best" : ""}">
      <td><span class="dot" style="background:${PAL[i % PAL.length]}"></span>${esc(r.bank)}${
        r.best ? ` <span class="tag">${esc(d.bestLabel)}</span>` : ""
      }<small>${esc(r.product)}</small></td>
      <td class="n">${r.rate}%${r.std > r.rate ? ` <small>→ ${r.std}%</small>` : ""}</td>
      <td class="n">${esc(r.monthly)}</td>
      <td class="n">${esc(r.interestLabel)}</td>
      <td class="n">${esc(r.term)}</td>
    </tr>`,
    )
    .join("");

  const steps = d.steps.map((s) => `<li>${esc(s)}</li>`).join("");

  return `<!DOCTYPE html>
<html lang="${esc(d.lang)}">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${esc(d.title)} — ${esc(d.brand)}</title>
<style>
  *{box-sizing:border-box}
  body{margin:0;background:#F7F9F9;color:#013D3B;
       font:15px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif}
  .page{max-width:860px;margin:0 auto;background:#fff;padding:44px 48px 56px;
        border:1px solid #E4EAE8}
  header{display:flex;align-items:flex-start;justify-content:space-between;gap:20px;
         border-bottom:3px solid #00C776;padding-bottom:18px;margin-bottom:26px}
  .brand{font-size:24px;font-weight:800;letter-spacing:-.02em}
  .brand span{color:#00A863}
  h1{font-size:22px;margin:14px 0 4px;font-weight:800}
  .sub{color:#6C7D79;font-size:14px;margin:0}
  .stamp{font-size:12px;color:#95A29F;text-align:right;white-space:nowrap}
  h2{font-size:12px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;
     color:#0A8F55;margin:32px 0 12px}
  .brief{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}
  .bi{border:1px solid #E4EAE8;padding:10px 12px}
  .bi span{display:block;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#6C7D79}
  .bi b{font-size:16px}
  table{width:100%;border-collapse:collapse;font-size:13.5px}
  th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;
     color:#6C7D79;border-bottom:1px solid #D9E2DF;padding:8px 10px}
  th.n,td.n{text-align:right}
  td{border-bottom:1px solid #EDF1F4;padding:11px 10px;vertical-align:top}
  td small{display:block;color:#6C7D79;font-size:11.5px;font-weight:400}
  tr.best td{background:#F1FBF6}
  .dot{display:inline-block;width:9px;height:9px;margin-right:7px}
  .tag{font-size:10px;font-weight:800;color:#fff;background:#00A863;padding:2px 6px;
       letter-spacing:.04em}
  td:first-child{font-weight:700}
  ol{margin:0;padding-left:20px}
  li{margin-bottom:7px}
  .note{margin-top:34px;padding-top:16px;border-top:1px solid #E4EAE8;
        font-size:12px;line-height:1.6;color:#6C7D79}
  .print{position:fixed;top:18px;right:18px;background:#00C776;color:#013D3B;
         border:none;padding:11px 18px;font-size:14px;font-weight:700;cursor:pointer;
         font-family:inherit;box-shadow:0 6px 18px rgba(1,61,59,.18)}
  @media print{
    body{background:#fff}
    .page{border:none;max-width:none;padding:0}
    .print{display:none}
    h2{margin-top:22px}
    tr{break-inside:avoid}
    *{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  }
</style>
</head>
<body>
<button class="print" onclick="window.print()">${esc(d.printLabel)}</button>
<div class="page">
  <header>
    <div>
      <div class="brand">${esc(d.brand)}<span>.</span></div>
      <h1>${esc(d.title)}</h1>
      <p class="sub">${esc(d.subtitle)}</p>
    </div>
    <div class="stamp">${esc(d.generatedLabel)}<br/>${esc(stamp)}</div>
  </header>

  <h2>${esc(d.briefTitle)}</h2>
  <div class="brief">${brief}</div>

  <h2>${esc(d.tableTitle)}</h2>
  <table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>

  <h2>${esc(d.chartTitle)}</h2>
  ${chartSvg(d.rows)}

  <h2>${esc(d.stepsTitle)}</h2>
  <ol>${steps}</ol>

  <p class="note">${esc(d.disclaimer)}</p>
</div>
</body>
</html>`;
}

/** Build the report and hand it to the browser as a download. */
export function downloadLoanReport(d: ReportData, filename: string) {
  const blob = new Blob([buildHtml(d)], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoked on the next tick so Safari has time to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** Open the same report in a new tab, ready to print or save as PDF. */
export function openLoanReport(d: ReportData) {
  const w = window.open("", "_blank");
  if (!w) return false;
  w.document.write(buildHtml(d));
  w.document.close();
  return true;
}
