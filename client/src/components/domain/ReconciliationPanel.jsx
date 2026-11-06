import Alert from '../ui/Alert.jsx';
import { formatKwh, formatPct } from '../../utils/formatters.js';

/** Billed kWh vs. the equipment inventory's calculated kWh. Warns when |gap| exceeds the threshold (15%). */
export default function ReconciliationPanel({ data }) {
  return (
    <section className="panel stack" aria-labelledby="recon-title">
      <h2 id="recon-title">Reconciliation</h2>
      <div className="grid-3">
        <div className="kpi"><div className="value">{formatKwh(data.billedKwh)}</div><div className="label">Billed (last 12 months)</div></div>
        <div className="kpi"><div className="value">{formatKwh(data.inventoryKwh)}</div><div className="label">Inventory ({data.equipmentCount} items)</div></div>
        <div className="kpi"><div className="value">{formatPct(data.gapPct)}</div><div className="label">Gap = (billed − inventory) ÷ billed</div></div>
      </div>
      <Alert variant={data.warning ? 'warning' : 'info'}>{data.message}</Alert>
      {!data.billedComplete && <p className="muted small">Billed consumption covers fewer than 12 months, so the gap is only indicative.</p>}
    </section>
  );
}
