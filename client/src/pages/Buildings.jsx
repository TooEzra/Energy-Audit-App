import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useBuildings } from '../hooks/useBuildings.js';
import { useApi } from '../hooks/useApi.js';
import { useAuth } from '../hooks/useAuth.js';
import { useForm } from '../hooks/useForm.js';
import { createBuilding, updateBuilding, deleteBuilding } from '../api/buildings.js';
import { getAnalysis } from '../api/energy.js';
import { validateBuilding } from '../utils/validators.js';
import Spinner from '../components/ui/Spinner.jsx';
import Alert from '../components/ui/Alert.jsx';
import Button from '../components/ui/Button.jsx';
import DataTable from '../components/ui/DataTable.jsx';
import FormField from '../components/ui/FormField.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import ConfirmDialog from '../components/ui/ConfirmDialog.jsx';
import { formatCurrency, formatNumber } from '../utils/formatters.js';

function BuildingForm({ initial, onSaved, onCancel }) {
  const editing = !!initial;
  const form = useForm({
    name: initial?.name || '', type: initial?.type || '',
    floorAreaM2: initial?.floorAreaM2 ?? '', operatingHours: initial?.operatingHours ?? '',
  }, validateBuilding);
  const submit = form.handleSubmit(async (v) => {
    const body = { name: v.name.trim(), type: v.type.trim(), floorAreaM2: Number(v.floorAreaM2), operatingHours: Number(v.operatingHours) };
    await (editing ? updateBuilding(initial.id, body) : createBuilding(body));
    onSaved(editing ? 'Building updated' : 'Building added');
  });
  const f = (name, label, extra = {}) => <FormField label={label} name={name} value={form.values[name]} onChange={form.onChange} error={form.errors[name]} {...extra} />;
  return (
    <form className="panel" onSubmit={submit} noValidate aria-label={editing ? 'Edit building' : 'Add building'}>
      <h2>{editing ? 'Edit building' : 'Add building'}</h2>
      {form.formError && <Alert variant="error">{form.formError}</Alert>}
      <div className="form-grid">
        {f('name', 'Name')}
        {f('type', 'Type', { placeholder: 'e.g. Classroom block, Ward, Office', list: 'building-types' })}
        {f('floorAreaM2', 'Floor area (m²)', { type: 'number', min: 0, step: 'any' })}
        {f('operatingHours', 'Operating hours per day (1–24)', { type: 'number', min: 1, max: 24, step: 'any' })}
      </div>
      <datalist id="building-types"><option value="School" /><option value="College" /><option value="Hospital" /><option value="Office" /></datalist>
      <div className="form-actions">
        <Button type="submit" disabled={form.submitting}>{form.submitting ? 'Saving…' : 'Save'}</Button>
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}

function BuildingDetail({ building, currency, onClose }) {
  const { data, loading, error } = useApi(() => getAnalysis(building.id), [building.id]);
  return (
    <section className="panel stack" aria-labelledby="detail-title">
      <div className="row between"><h2 id="detail-title">{building.name}</h2><Button variant="secondary" size="small" onClick={onClose}>Close</Button></div>
      <p className="muted">{building.type} · {formatNumber(building.floorAreaM2)} m² · {formatNumber(building.operatingHours, 1)} h/day</p>
      {loading && <Spinner />}
      {error && <Alert variant="error">{error.message}</Alert>}
      {data && (
        <div className="grid-3">
          <div className="kpi"><div className="value">{formatNumber(data.totals.kwh)} kWh</div><div className="label">{data.eui.complete ? 'Last 12 months' : `${data.monthsInPeriod} month(s) recorded`}</div></div>
          <div className="kpi"><div className="value">{formatCurrency(data.totals.cost, currency)}</div><div className="label">Electricity cost</div></div>
          <div className="kpi"><div className="value">{data.eui.complete ? formatNumber(data.eui.value, 1) : '–'}</div><div className="label">EUI kWh/m²/year {data.eui.complete ? '' : `(${data.eui.label})`}</div></div>
        </div>
      )}
      <div className="row">
        <Link className="btn secondary small" to="/energy">Energy records</Link>
        <Link className="btn secondary small" to="/equipment">Equipment</Link>
        <Link className="btn secondary small" to="/audit">Audit</Link>
        <Link className="btn secondary small" to="/reports">Report</Link>
      </div>
    </section>
  );
}

export default function Buildings() {
  const { buildings, maxBuildings, loading, error, reload, selectBuilding } = useBuildings();
  const { isAdmin, institution } = useAuth();
  const [mode, setMode] = useState(null); // null | { type: 'add' } | { type: 'edit', b } | { type: 'view', b }
  const [toDelete, setToDelete] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [actionError, setActionError] = useState(null);
  const atLimit = maxBuildings !== null && buildings.length >= maxBuildings;

  const saved = (msg) => { setMode(null); setNotice(msg); reload(); };
  const confirmDelete = async () => {
    setBusy(true); setActionError(null);
    try { await deleteBuilding(toDelete.id); setNotice(`Deleted ${toDelete.name} and all its data`); setToDelete(null); reload(); }
    catch (e) { setActionError(e.message); setToDelete(null); } finally { setBusy(false); }
  };

  const columns = [
    { key: 'name', header: 'Name' },
    { key: 'type', header: 'Type' },
    { key: 'floorAreaM2', header: 'Floor area (m²)', align: 'num', render: (b) => formatNumber(b.floorAreaM2) },
    { key: 'operatingHours', header: 'Hours/day', align: 'num', render: (b) => formatNumber(b.operatingHours, 1) },
    { key: 'actions', header: 'Actions', render: (b) => (
      <span className="row">
        <Button variant="secondary" size="small" onClick={() => { selectBuilding(b.id); setMode({ type: 'view', b }); }}>View</Button>
        <Button variant="secondary" size="small" onClick={() => setMode({ type: 'edit', b })}>Edit</Button>
        {isAdmin && <Button variant="danger secondary" size="small" onClick={() => setToDelete(b)}>Delete</Button>}
      </span>) },
  ];

  return (
    <div className="stack">
      <div className="page-header">
        <h1>Buildings</h1>
        <div>
          <Button onClick={() => setMode({ type: 'add' })} disabled={atLimit || loading}>Add building</Button>
          {maxBuildings !== null && <div className="muted small">{buildings.length} of {maxBuildings} buildings used{atLimit ? ' (limit reached)' : ''}</div>}
        </div>
      </div>
      {notice && <Alert variant="success" onClose={() => setNotice(null)}>{notice}</Alert>}
      {actionError && <Alert variant="error" onClose={() => setActionError(null)}>{actionError}</Alert>}
      {atLimit && <Alert variant="warning">The building limit has been reached.{isAdmin ? ' You can raise it in Settings.' : ' Ask an administrator to raise it.'}</Alert>}
      {mode?.type === 'add' && <BuildingForm onSaved={saved} onCancel={() => setMode(null)} />}
      {mode?.type === 'edit' && <BuildingForm key={mode.b.id} initial={mode.b} onSaved={saved} onCancel={() => setMode(null)} />}
      {mode?.type === 'view' && <BuildingDetail building={mode.b} currency={institution?.currency} onClose={() => setMode(null)} />}
      {loading && <Spinner />}
      {error && <Alert variant="error">{error.message} <Button variant="link" onClick={reload}>Retry</Button></Alert>}
      {!loading && !error && (buildings.length === 0
        ? <EmptyState title="No buildings yet">Use “Add building” to create the first one.</EmptyState>
        : <DataTable columns={columns} rows={buildings} caption="Buildings" />)}
      <ConfirmDialog open={!!toDelete} busy={busy} title="Delete building?" confirmLabel="Delete building"
        message={toDelete && `This permanently deletes ${toDelete.name} with its energy records, equipment, findings and recommendations.`}
        onConfirm={confirmDelete} onCancel={() => setToDelete(null)} />
    </div>
  );
}
