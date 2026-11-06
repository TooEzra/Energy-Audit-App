import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useBuildings } from '../hooks/useBuildings.js';
import { useApi } from '../hooks/useApi.js';
import { useAuth } from '../hooks/useAuth.js';
import { useForm } from '../hooks/useForm.js';
import { listEquipment, createEquipment, updateEquipment, deleteEquipment, getReconciliation } from '../api/equipment.js';
import { validateEquipment } from '../utils/validators.js';
import Spinner from '../components/ui/Spinner.jsx';
import Alert from '../components/ui/Alert.jsx';
import Button from '../components/ui/Button.jsx';
import DataTable from '../components/ui/DataTable.jsx';
import FormField from '../components/ui/FormField.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import ConfirmDialog from '../components/ui/ConfirmDialog.jsx';
import BuildingSelector from '../components/domain/BuildingSelector.jsx';
import ReconciliationPanel from '../components/domain/ReconciliationPanel.jsx';
import EndUseChart from '../components/charts/EndUseChart.jsx';
import { categoryLabel, formatNumber, formatPct } from '../utils/formatters.js';

const CATEGORIES = ['lighting', 'ac_ventilation', 'motors_pumps', 'ict', 'other'];

function EquipmentForm({ buildingId, editing, onSaved, onCancel }) {
  const form = useForm({
    category: editing?.category || 'lighting', name: editing?.name || '', location: editing?.location || '',
    ratingW: editing?.ratingW ?? '', qty: editing?.qty ?? '', hoursDay: editing?.hoursDay ?? '', daysYear: editing?.daysYear ?? '', condition: editing?.condition || '',
  }, validateEquipment);
  const submit = form.handleSubmit(async (v) => {
    const body = {
      category: v.category, name: v.name.trim(), location: v.location.trim() || null, condition: v.condition.trim() || null,
      ratingW: Number(v.ratingW), qty: Number(v.qty), hoursDay: Number(v.hoursDay), daysYear: Number(v.daysYear),
    };
    await (editing ? updateEquipment(buildingId, editing.id, body) : createEquipment(buildingId, body));
    form.reset({ category: v.category, name: '', location: '', ratingW: '', qty: '', hoursDay: '', daysYear: '', condition: '' });
    onSaved(editing ? 'Equipment updated' : 'Equipment added');
  });
  const f = (name, label, extra = {}) => <FormField label={label} name={name} value={form.values[name]} onChange={form.onChange} error={form.errors[name]} {...extra} />;
  return (
    <form className="panel" onSubmit={submit} noValidate aria-label={editing ? 'Edit equipment' : 'Add equipment'}>
      <h2>{editing ? 'Edit equipment' : 'Add equipment'}</h2>
      {form.formError && <Alert variant="error">{form.formError}</Alert>}
      <div className="form-grid">
        <FormField as="select" label="Category" name="category" value={form.values.category} onChange={form.onChange} error={form.errors.category}>
          {CATEGORIES.map((c) => <option key={c} value={c}>{categoryLabel(c)}</option>)}
        </FormField>
        {f('name', 'Name')}
        {f('location', 'Location')}
        {f('ratingW', 'Rating (W)', { type: 'number', min: 0, step: 'any' })}
        {f('qty', 'Quantity', { type: 'number', min: 1, step: 1 })}
        {f('hoursDay', 'Hours per day (0–24)', { type: 'number', min: 0, max: 24, step: 'any' })}
        {f('daysYear', 'Days per year (0–366)', { type: 'number', min: 0, max: 366, step: 1 })}
        {f('condition', 'Condition (optional)')}
      </div>
      <div className="form-actions">
        <Button type="submit" disabled={form.submitting}>{form.submitting ? 'Saving…' : editing ? 'Save changes' : 'Add equipment'}</Button>
        {editing && <Button variant="secondary" onClick={onCancel}>Cancel</Button>}
      </div>
    </form>
  );
}

export default function Equipment() {
  const { buildings, loading: bLoading, error: bError, selected, selectBuilding } = useBuildings();
  const { isAdmin } = useAuth();
  const bid = selected?.id;
  const inv = useApi(() => listEquipment(bid), [bid], { enabled: !!bid });
  const rec = useApi(() => getReconciliation(bid), [bid], { enabled: !!bid });
  const [editing, setEditing] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [actionError, setActionError] = useState(null);

  if (bLoading) return <Spinner />;
  if (bError) return <Alert variant="error">{bError.message}</Alert>;
  if (!buildings.length) return <EmptyState title="No buildings yet" action={<Link to="/buildings" className="btn">Add a building</Link>}>Add a building before listing its equipment.</EmptyState>;

  const reload = () => { inv.reload(); rec.reload(); };
  const saved = (msg) => { setEditing(null); setNotice(msg); reload(); };
  const confirmDelete = async () => {
    setBusy(true);
    try { await deleteEquipment(bid, toDelete.id); setNotice('Equipment deleted'); reload(); } catch (e) { setActionError(e.message); } finally { setBusy(false); setToDelete(null); }
  };
  const columns = [
    { key: 'category', header: 'Category', render: (e) => categoryLabel(e.category) },
    { key: 'name', header: 'Name' },
    { key: 'location', header: 'Location' },
    { key: 'ratingW', header: 'Rating (W)', align: 'num', render: (e) => formatNumber(e.ratingW) },
    { key: 'qty', header: 'Qty', align: 'num' },
    { key: 'hoursDay', header: 'Hours/day', align: 'num', render: (e) => formatNumber(e.hoursDay, 1) },
    { key: 'daysYear', header: 'Days/year', align: 'num' },
    { key: 'annualKwh', header: 'Annual kWh', align: 'num', render: (e) => formatNumber(e.annualKwh) },
    { key: 'sharePct', header: 'Share', align: 'num', render: (e) => formatPct(e.sharePct) },
    { key: 'actions', header: 'Actions', render: (e) => (
      <span className="row">
        <Button variant="secondary" size="small" onClick={() => setEditing(e)}>Edit</Button>
        {isAdmin && <Button variant="danger secondary" size="small" onClick={() => setToDelete(e)}>Delete</Button>}
      </span>) },
  ];

  return (
    <div className="stack">
      <div className="page-header"><h1>Equipment</h1><BuildingSelector buildings={buildings} value={bid} onChange={(v) => { selectBuilding(v); setEditing(null); }} /></div>
      {notice && <Alert variant="success" onClose={() => setNotice(null)}>{notice}</Alert>}
      {actionError && <Alert variant="error" onClose={() => setActionError(null)}>{actionError}</Alert>}
      <EquipmentForm key={editing?.id || 'new'} buildingId={bid} editing={editing} onSaved={saved} onCancel={() => setEditing(null)} />
      {inv.loading && <Spinner />}
      {inv.error && <Alert variant="error">{inv.error.message}</Alert>}
      {inv.data && (inv.data.items.length === 0
        ? <EmptyState title="No equipment yet">Add the equipment you inspected to see its annual consumption and reconciliation.</EmptyState>
        : (<>
          <p className="muted small">Annual kWh = rating (W) × quantity × hours/day × days/year ÷ 1000. Total inventory: {formatNumber(inv.data.totalKwh)} kWh/year.</p>
          <DataTable columns={columns} rows={inv.data.items} caption="Equipment inventory" />
          <section className="panel" aria-labelledby="enduse-title"><h2 id="enduse-title">End-use breakdown</h2><EndUseChart endUse={inv.data.endUse} /></section>
        </>))}
      {rec.error && <Alert variant="error">{rec.error.message}</Alert>}
      {rec.data && <ReconciliationPanel data={rec.data} />}
      <ConfirmDialog open={!!toDelete} busy={busy} title="Delete equipment?" message={toDelete && `Delete “${toDelete.name}” from the inventory?`} onConfirm={confirmDelete} onCancel={() => setToDelete(null)} />
    </div>
  );
}
