import StatusChip from '../ui/StatusChip.jsx';
import Button from '../ui/Button.jsx';
import { formatCurrency } from '../../utils/formatters.js';

const STATUSES = ['Proposed', 'Accepted', 'Implemented'];

/** One recommendation. All savings are ESTIMATES and labelled as such. */
export default function RecommendationCard({ rec, currency, canDelete, onEdit, onDelete, onStatusChange }) {
  return (
    <article className="panel rec-card" aria-label={rec.title}>
      <div className="row between">
        <h3>{rec.title}</h3>
        <span className="row"><StatusChip kind="estimate">Estimate</StatusChip><StatusChip kind="status" value={rec.status} /></span>
      </div>
      <div className="metrics">
        <div><span className="muted small">Estimated cost</span><b>{formatCurrency(rec.estimatedCost, currency)}</b></div>
        <div><span className="muted small">Est. annual saving</span><b>{formatCurrency(rec.estimatedAnnualSaving, currency)}</b></div>
        <div><span className="muted small">Simple payback</span><b>{rec.payback.label}</b></div>
      </div>
      <div className="row">
        <label className="small" htmlFor={`status-${rec.id}`}>Status</label>
        <select id={`status-${rec.id}`} value={rec.status} onChange={(e) => onStatusChange(rec, e.target.value)}>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <Button variant="secondary" size="small" onClick={() => onEdit(rec)}>Edit</Button>
        {canDelete && <Button variant="danger secondary" size="small" onClick={() => onDelete(rec)}>Delete</Button>}
      </div>
    </article>
  );
}
