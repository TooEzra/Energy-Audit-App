import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useBuildings } from '../hooks/useBuildings.js';
import { useApi } from '../hooks/useApi.js';
import { useAuth } from '../hooks/useAuth.js';
import { useForm } from '../hooks/useForm.js';
import { createEnergy, updateEnergy, deleteEnergy, getAnalysis, importEnergy, listEnergy } from '../api/energy.js';
import { validateEnergy } from '../utils/validators.js';
import Spinner from '../components/ui/Spinner.jsx';
import Alert from '../components/ui/Alert.jsx';
import Button from '../components/ui/Button.jsx';
import DataTable from '../components/ui/DataTable.jsx';
import FormField from '../components/ui/FormField.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import ConfirmDialog from '../components/ui/ConfirmDialog.jsx';
import StatusChip from '../components/ui/StatusChip.jsx';
import BuildingSelector from '../components/domain/BuildingSelector.jsx';
import CsvImportPanel from '../components/domain/CsvImportPanel.jsx';
import AnomalyBanner from '../components/domain/AnomalyBanner.jsx';
import TrendChart from '../components/charts/TrendChart.jsx';
import { formatMonth, formatNumber } from '../utils/formatters.js';

function RecordForm({ buildingId, editing, onSaved, onCancel }) {
  const form = useForm({ month: editing?.month || '', kwh: editing?.kwh ?? '', cost: editing?.cost ?? '' }, validateEnergy);
  const submit = form.handleSubmit(async (v) => {
    const body = { month: v.month, kwh: Number(v.kwh), cost: Number(v.cost) };
    await (editing ? updateEnergy(buildingId, editing.id, body) : createEnergy(buildingId, body));
    form.reset({ month: '', kwh: '', cost: '' });
    onSaved(editing ? 'Record updated' : 'Record added');
  });
  const f = (name, label, extra = {}) => <FormField label={label} name={name} value={form.values[name]} onChange={form.onChange} error={form.errors[name]} {...extra} />;
  return (
    <form className="panel" onSubmit={submit} noValidate aria-label={editing ? 'Edit monthly record' : 'Add monthly record'}>
      <h2>{editing ? `Edit ${formatMonth(editing.month)}` : 'Add monthly record'}</h2>
      {form.formError && <Alert variant="error">{form.formError}</Alert>}
      <div className="form-grid">
        {f('month', 'Month', { type: 'month' })}
        {f('kwh', 'Electricity (kWh)', { type: 'number', min: 0, step: 'any' })}
        {f('cost', 'Cost', { type: 'number', min: 0, step: 'any' })}
      </div>
      <div className="form-actions">
        <Button type="submit" disabled={form.submitting}>{form.submitting ? 'Saving…' : editing ? 'Save changes' : 'Add record'}</Button>
        {editing && <Button variant="secondary" onClick={onCancel}>Cancel</Button>}
      </div>
    </form>
  );
}

export default function EnergyRecords() {
  const { buildings, loading: bLoading, error: bError, selected, selectBuilding } = useBuildings();
  const { isAdmin } = useAuth();
  const bid = selected?.id;
  const analysis = useApi(() => getAnalysis(bid), [bid], { enabled: !!bid });
  const recs = useApi(() => listEnergy(bid), [bid], { enabled: !!bid }); // gives each month's record id (for edit/delete)
  const { data, loading, error } = analysis;
  const reload = () => { analysis.reload(); recs.reload(); };
  const [editing, setEditing] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [actionError, setActionError] = useState(null);

  if (bLoading) return <Spinner />;
  if (bError) return <Alert variant="error">{bError.message}</Alert>;
  if (!buildings.length) return <EmptyState title="No buildings yet" action={<Link to="/buildings" className="btn">Add a building</Link>}>Add a building before entering energy records.</EmptyState>;

  const saved = (msg) => { setEditing(null); setNotice(msg); reload(); };
  const confirmDelete = async () => {
    setBusy(true);
    try { await deleteEnergy(bid, toDelete.id); setNotice('Record deleted'); reload(); } catch (e) { setActionError(e.message); } finally { setBusy(false); setToDelete(null); }
  };
  // The analysis series already carries month/kwh/cost/anomaly; records need an id for edit/delete, so we map by month below.
  const idByMonth = new Map((recs.data?.items || []).map((r) => [r.month, r.id]));
  const rows = data ? data.series.map((s) => ({ ...s, id: idByMonth.get(s.month) })) : [];
  const columns = [
    { key: 'month', header: 'Month', render: (r) => formatMonth(r.month) },
    { key: 'kwh', header: 'kWh', align: 'num', render: (r) => formatNumber(r.kwh) },
    { key: 'cost', header: 'Cost', align: 'num', render: (r) => formatNumber(r.cost) },
    { key: 'flag', header: 'Flag', render: (r) => r.anomaly ? <StatusChip kind="warn">High +{formatNumber(r.pctAbove, 0)}%</StatusChip> : '' },
    { key: 'actions', header: 'Actions', render: (r) => (
      <span className="row">
        <Button variant="secondary" size="small" onClick={() => setEditing(r)}>Edit</Button>
        {isAdmin && <Button variant="danger secondary" size="small" onClick={() => setToDelete(r)}>Delete</Button>}
      </span>) },
  ];

  return (
    <div className="stack">
      <div className="page-header"><h1>Energy Records</h1><BuildingSelector buildings={buildings} value={bid} onChange={(v) => { selectBuilding(v); setEditing(null); }} /></div>
      {notice && <Alert variant="success" onClose={() => setNotice(null)}>{notice}</Alert>}
      {actionError && <Alert variant="error" onClose={() => setActionError(null)}>{actionError}</Alert>}
      <RecordForm key={editing?.month || 'new'} buildingId={bid} editing={editing} onSaved={saved} onCancel={() => setEditing(null)} />
      <CsvImportPanel
        key={bid}
        onPreview={(csv) => importEnergy(bid, csv, false)}
        onConfirm={(csv) => importEnergy(bid, csv, true)}
        onImported={(r) => { setNotice(`Imported ${r.imported} record(s)`); reload(); }}
      />
      {loading && <Spinner />}
      {error && <Alert variant="error">{error.message}</Alert>}
      {data && (data.series.length === 0
        ? <EmptyState title="No records yet">Add a month above or import a CSV.</EmptyState>
        : (<>
          <AnomalyBanner anomalies={data.anomalies} />
          {!data.eui.complete && <Alert variant="info">EUI is {data.eui.label}. Consumption so far: {formatNumber(data.totals.kwh)} kWh.</Alert>}
          <section className="panel" aria-labelledby="trend-title"><h2 id="trend-title">Consumption trend</h2><TrendChart series={data.series} /></section>
          <DataTable columns={columns} rows={rows} rowKey="month" caption="Monthly records" rowClassName={(r) => (r.anomaly ? 'flagged' : undefined)} />
        </>))}
      <ConfirmDialog open={!!toDelete} busy={busy} title="Delete record?" message={toDelete && `Delete the record for ${formatMonth(toDelete.month)}?`} onConfirm={confirmDelete} onCancel={() => setToDelete(null)} />
    </div>
  );
}
