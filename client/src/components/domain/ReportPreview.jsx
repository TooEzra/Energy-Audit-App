import { categoryLabel, formatCurrency, formatMonth, formatNumber } from '../../utils/formatters.js';
import StatusChip from '../ui/StatusChip.jsx';

const AREAS = ['lighting', 'ac_ventilation', 'motors_pumps', 'operating_hours', 'practices'];

/** On-screen version of the report (same sections as the PDF). Also what "Print" prints. */
export default function ReportPreview({ report }) {
  const { building, analysis: a, institution, findings, recommendations, recommendationTotals } = report;
  const cur = institution.currency;
  const max = Math.max(...a.series.map((s) => s.kwh), 1);
  return (
    <article className="report" aria-label="Report preview">
      <h1>Energy Audit Report</h1>
      <p className="muted">{building.name} · {institution.name} · Generated {report.generatedAt.slice(0, 10)}</p>

      <h2>1. Building profile</h2>
      <table className="data"><tbody>
        <tr><th scope="row">Name</th><td>{building.name}</td><th scope="row">Type</th><td>{building.type}</td></tr>
        <tr><th scope="row">Floor area</th><td>{formatNumber(building.floorAreaM2)} m²</td><th scope="row">Operating hours</th><td>{formatNumber(building.operatingHours, 1)} h/day</td></tr>
      </tbody></table>

      <h2>2. Consumption and cost summary</h2>
      <div className="grid-3">
        <div className="kpi"><div className="value">{formatNumber(a.totals.kwh)} kWh</div><div className="label">{a.eui.complete ? 'Last 12 months' : `${a.monthsInPeriod} month(s) so far`}</div></div>
        <div className="kpi"><div className="value">{formatCurrency(a.totals.cost, cur)}</div><div className="label">Electricity cost</div></div>
        <div className="kpi"><div className="value">{a.totals.costPerKwh === null ? '–' : `${cur} ${formatNumber(a.totals.costPerKwh, 2)}`}</div><div className="label">Average per kWh</div></div>
      </div>

      <h2>3. Energy use intensity (EUI)</h2>
      <p>{a.eui.complete ? <strong>{formatNumber(a.eui.value, 1)} kWh/m²/year</strong> : <>EUI is <strong>{a.eui.label}</strong>.</>}</p>
      {a.series.length > 0 ? (
        <>
          <div className="report-bars" role="img" aria-label="Monthly consumption bars (amber = flagged month)">
            {a.series.map((s) => <div key={s.month} className={`bar${s.anomaly ? ' flag' : ''}`} style={{ height: `${(s.kwh / max) * 100}%` }} title={`${formatMonth(s.month)}: ${formatNumber(s.kwh)} kWh`} />)}
          </div>
          <div className="table-wrap"><table className="data">
            <caption>Monthly consumption</caption>
            <thead><tr><th scope="col">Month</th><th scope="col" className="num">kWh</th><th scope="col" className="num">Cost ({cur})</th><th scope="col">Flag</th></tr></thead>
            <tbody>{a.series.map((s) => (
              <tr key={s.month} className={s.anomaly ? 'flagged' : undefined}>
                <td>{formatMonth(s.month)}</td><td className="num">{formatNumber(s.kwh)}</td><td className="num">{formatNumber(s.cost)}</td>
                <td>{s.anomaly ? `High (+${formatNumber(s.pctAbove, 0)}% vs other months)` : ''}</td>
              </tr>))}</tbody>
          </table></div>
        </>
      ) : <p className="muted">No monthly records yet.</p>}

      <h2>4. Audit findings</h2>
      {findings.length === 0 && <p className="muted">No findings recorded.</p>}
      {AREAS.map((area) => {
        const list = findings.filter((f) => f.area === area);
        if (!list.length) return null;
        return (
          <div key={area}>
            <h3>{categoryLabel(area)}</h3>
            <div className="table-wrap"><table className="data">
              <thead><tr><th scope="col">Problem</th><th scope="col">Location / system</th><th scope="col">Suggested improvement</th><th scope="col">Priority</th></tr></thead>
              <tbody>{list.map((f) => <tr key={f.id}><td>{f.problem}</td><td>{f.locationSystem}</td><td>{f.suggestedImprovement}</td><td><StatusChip kind="priority" value={f.priority} /></td></tr>)}</tbody>
            </table></div>
          </div>
        );
      })}

      <h2>5. Recommendations</h2>
      {recommendations.length === 0 ? <p className="muted">No recommendations recorded.</p> : (
        <>
          <div className="table-wrap"><table className="data">
            <thead><tr><th scope="col">Recommendation</th><th scope="col" className="num">Est. cost ({cur})</th><th scope="col" className="num">Est. annual saving ({cur})</th><th scope="col">Simple payback</th><th scope="col">Status</th></tr></thead>
            <tbody>
              {recommendations.map((r) => <tr key={r.id}><td>{r.title}</td><td className="num">{formatNumber(r.estimatedCost)}</td><td className="num">{formatNumber(r.estimatedAnnualSaving)}</td><td>{r.payback.label}</td><td><StatusChip kind="status" value={r.status} /></td></tr>)}
              <tr><th scope="row">Total</th><th className="num">{formatNumber(recommendationTotals.estimatedCost)}</th><th className="num">{formatNumber(recommendationTotals.estimatedAnnualSaving)}</th><th /><th /></tr>
            </tbody>
          </table></div>
          <p className="muted small">All savings and paybacks are <strong>estimates</strong>, not verified results.</p>
        </>
      )}

      <h2>6. Conclusion</h2>
      <p style={{ whiteSpace: 'pre-wrap' }}>{report.conclusion}</p>
      <p className="muted small">Decision-support prototype. Savings figures are estimates and have not been verified by measurement.</p>
    </article>
  );
}
