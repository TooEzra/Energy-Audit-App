import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as institutionsRepo from '../repositories/institutions.repo.js';
import * as findingsRepo from '../repositories/findings.repo.js';
import * as recsRepo from '../repositories/recommendations.repo.js';
import { requireBuilding } from './buildings.service.js';
import { getAnalysis } from './energy.service.js';
import * as equipmentService from './equipment.service.js';
import { withPayback } from './recommendations.service.js';
import { AppError } from '../utils/errors.js';

const templateDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'templates');
const AREA_LABELS = { lighting: 'Lighting', ac_ventilation: 'AC & ventilation', motors_pumps: 'Motors & pumps', operating_hours: 'Operating hours', practices: 'Practices' };
export const MAX_CONCLUSION = 2000;

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = (n, d = 0) => (n === null || n === undefined ? '–' : Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }));
const monthLabel = (m) => new Date(`${m}-01T00:00:00Z`).toLocaleString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });

/** A short, editable starting conclusion built from the numbers. All savings are estimates. */
export function defaultConclusion({ building, analysis, findings, recommendations }) {
  const parts = [];
  parts.push(analysis.eui.complete
    ? `${building.name} used ${num(analysis.totals.kwh)} kWh over the last 12 months (EUI ${num(analysis.eui.value, 1)} kWh/m²/year).`
    : `${building.name} has ${analysis.monthsInPeriod} of 12 months recorded, so its EUI is incomplete.`);
  if (analysis.anomalies.length) parts.push(`${analysis.anomalies.length} month(s) were flagged as unusually high and should be investigated.`);
  const high = findings.filter((f) => f.priority === 'High').length;
  parts.push(`${findings.length} audit finding(s) were recorded${high ? `, ${high} of high priority` : ''}.`);
  const saving = recommendations.reduce((s, r) => s + r.estimatedAnnualSaving, 0);
  if (recommendations.length) parts.push(`The ${recommendations.length} recommendation(s) have an estimated annual saving of ${num(saving)} (an estimate, not a verified result).`);
  return parts.join(' ');
}

export async function getReportData(db, buildingId, conclusion) {
  const building = await requireBuilding(db, buildingId);
  const [institution, analysis, findings, recs, equipment] = await Promise.all([
    institutionsRepo.getOwn(db),
    getAnalysis(db, buildingId),
    findingsRepo.listForBuilding(db, buildingId),
    recsRepo.listForBuilding(db, buildingId),
    equipmentService.list(db, buildingId),
  ]);
  const recommendations = recs.map(withPayback);
  const base = { building, analysis, findings, recommendations };
  const text = (conclusion ?? '').trim().slice(0, MAX_CONCLUSION);
  return {
    generatedAt: new Date().toISOString(),
    institution: { name: institution.name, currency: institution.currency },
    building,
    analysis,
    equipmentSummary: { count: equipment.items.length, totalKwh: equipment.totalKwh },
    findings,
    recommendations,
    recommendationTotals: {
      estimatedCost: recommendations.reduce((s, r) => s + r.estimatedCost, 0),
      estimatedAnnualSaving: recommendations.reduce((s, r) => s + r.estimatedAnnualSaving, 0),
    },
    conclusion: text || defaultConclusion(base),
    defaultConclusion: defaultConclusion(base),
  };
}

/** Server-side SVG bar chart of monthly kWh (anomalies in amber) so the PDF needs no JavaScript. */
function monthlyChartSvg(series) {
  if (!series.length) return '';
  const w = 680, h = 220, pad = { l: 52, r: 10, t: 12, b: 34 };
  const max = Math.max(...series.map((s) => s.kwh), 1);
  const bw = (w - pad.l - pad.r) / series.length;
  const bars = series.map((s, i) => {
    const bh = ((h - pad.t - pad.b) * s.kwh) / max;
    const x = pad.l + i * bw + bw * 0.15, y = h - pad.b - bh;
    return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${(bw * 0.7).toFixed(1)}" height="${bh.toFixed(1)}" fill="${s.anomaly ? '#F2A900' : '#1F7A4D'}"/>` +
      `<text x="${(x + bw * 0.35).toFixed(1)}" y="${h - 18}" font-size="9" text-anchor="middle" fill="#5b6b63">${esc(s.month.slice(2))}</text>`;
  }).join('');
  return `<svg viewBox="0 0 ${w} ${h}" width="100%" role="img" aria-label="Monthly consumption in kWh">` +
    `<line x1="${pad.l}" y1="${h - pad.b}" x2="${w - pad.r}" y2="${h - pad.b}" stroke="#aab8b0"/>` +
    `<text x="${pad.l - 6}" y="${pad.t + 8}" font-size="9" text-anchor="end" fill="#5b6b63">${num(max)}</text>` +
    `<text x="${pad.l - 6}" y="${h - pad.b}" font-size="9" text-anchor="end" fill="#5b6b63">0</text>${bars}</svg>` +
    `<p class="est">Monthly kWh (amber = flagged as unusually high).</p>`;
}

export function renderReportHtmlBody(d) {
  const a = d.analysis, cur = d.institution.currency;
  const money = (n) => `${cur} ${num(n, 0)}`;
  const findingsByArea = Object.keys(AREA_LABELS).map((area) => {
    const list = d.findings.filter((f) => f.area === area);
    if (!list.length) return '';
    return `<h3>${AREA_LABELS[area]}</h3><table><tr><th>Problem</th><th>Location / system</th><th>Suggested improvement</th><th>Priority</th></tr>` +
      list.map((f) => `<tr><td>${esc(f.problem)}</td><td>${esc(f.locationSystem)}</td><td>${esc(f.suggestedImprovement)}</td><td><span class="chip ${esc(f.priority)}">${esc(f.priority)}</span></td></tr>`).join('') + '</table>';
  }).join('') || '<p>No findings recorded.</p>';

  return `
<h1>Energy Audit Report</h1>
<p class="sub">${esc(d.building.name)} &middot; ${esc(d.institution.name)} &middot; Generated ${esc(d.generatedAt.slice(0, 10))}</p>
<h2>1. Building profile</h2>
<table><tr><th>Name</th><td>${esc(d.building.name)}</td><th>Type</th><td>${esc(d.building.type)}</td></tr>
<tr><th>Floor area</th><td>${num(d.building.floorAreaM2)} m²</td><th>Operating hours</th><td>${num(d.building.operatingHours, 1)} h/day</td></tr></table>
<h2>2. Consumption and cost summary</h2>
<div class="kpis">
  <div class="kpi"><b>${num(a.totals.kwh)} kWh</b>${a.eui.complete ? 'last 12 months' : `${a.monthsInPeriod} month(s) so far`}</div>
  <div class="kpi"><b>${money(a.totals.cost)}</b>electricity cost</div>
  <div class="kpi"><b>${a.totals.costPerKwh === null ? '–' : `${cur} ${num(a.totals.costPerKwh, 2)}`}</b>average per kWh</div>
</div>
${a.series.length ? `<table><tr><th>Month</th><th class="num">kWh</th><th class="num">Cost (${esc(cur)})</th><th>Flag</th></tr>${a.series.map((s) =>
    `<tr><td>${esc(monthLabel(s.month))}</td><td class="num">${num(s.kwh)}</td><td class="num">${num(s.cost)}</td><td>${s.anomaly ? `High (+${num(s.pctAbove, 0)}% vs other months)` : ''}</td></tr>`).join('')}</table>` : '<p>No monthly records yet.</p>'}
<h2>3. Energy use intensity (EUI)</h2>
<div class="banner">${a.eui.complete ? `<b>${num(a.eui.value, 1)} kWh/m²/year</b>` : `EUI is <b>${esc(a.eui.label)}</b>.`}</div>
${monthlyChartSvg(a.series)}
<h2>4. Audit findings</h2>${findingsByArea}
<h2>5. Recommendations</h2>
${d.recommendations.length ? `<table><tr><th>Recommendation</th><th class="num">Est. cost (${esc(cur)})</th><th class="num">Est. annual saving (${esc(cur)})</th><th>Simple payback</th><th>Status</th></tr>${d.recommendations.map((r) =>
    `<tr><td>${esc(r.title)}</td><td class="num">${num(r.estimatedCost)}</td><td class="num">${num(r.estimatedAnnualSaving)}</td><td>${esc(r.payback.label)}</td><td>${esc(r.status)}</td></tr>`).join('')}
<tr><th>Total</th><th class="num">${num(d.recommendationTotals.estimatedCost)}</th><th class="num">${num(d.recommendationTotals.estimatedAnnualSaving)}</th><th></th><th></th></tr></table>
<p class="est">All savings and paybacks are <b>estimates</b>, not verified results.</p>` : '<p>No recommendations recorded.</p>'}
<h2>6. Conclusion</h2><p>${esc(d.conclusion).replace(/\n/g, '<br/>')}</p>
<p class="foot">Decision-support prototype. Savings figures are estimates and have not been verified by measurement.</p>`;
}

export async function renderReportHtml(d) {
  const [tpl, css] = await Promise.all([fs.readFile(path.join(templateDir, 'report.html'), 'utf8'), fs.readFile(path.join(templateDir, 'report.css'), 'utf8')]);
  return tpl.replace('{{title}}', esc(`Energy audit - ${d.building.name}`)).replace('{{{css}}}', () => css).replace('{{{content}}}', () => renderReportHtmlBody(d));
}

/** HTML -> PDF with Puppeteer. If Puppeteer/Chromium is unavailable, tell the user to use the print page instead. */
export async function renderPdf(html) {
  let puppeteer;
  try { puppeteer = (await import('puppeteer')).default; }
  catch { throw new AppError(501, 'PDF export is not available (Puppeteer is not installed). Use "Print" on the report page and choose "Save as PDF".'); }
  let browser;
  try {
    browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setJavaScriptEnabled(false); // the report is static HTML; nothing needs scripts
    await page.setContent(html, { waitUntil: 'load' });
    return Buffer.from(await page.pdf({ format: 'A4', printBackground: true, margin: { top: '16mm', bottom: '16mm', left: '14mm', right: '14mm' } }));
  } catch (err) {
    console.error('PDF generation failed', err.message);
    throw new AppError(501, 'PDF generation failed on this machine. Use "Print" on the report page and choose "Save as PDF".');
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}
