import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useBuildings } from '../hooks/useBuildings.js';
import { useApi } from '../hooks/useApi.js';
import { useAuth } from '../hooks/useAuth.js';
import { useForm } from '../hooks/useForm.js';
import { listRecommendations, createRecommendation, updateRecommendation, deleteRecommendation, prefillRecommendation } from '../api/recommendations.js';
import { listMeasures } from '../api/measures.js';
import { listFindings } from '../api/findings.js';
import { validateRecommendation } from '../utils/validators.js';
import Spinner from '../components/ui/Spinner.jsx';
import Alert from '../components/ui/Alert.jsx';
import Button from '../components/ui/Button.jsx';
import FormField from '../components/ui/FormField.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import ConfirmDialog from '../components/ui/ConfirmDialog.jsx';
import BuildingSelector from '../components/domain/BuildingSelector.jsx';
import RecommendationCard from '../components/domain/RecommendationCard.jsx';
import { categoryLabel, formatCurrency, formatNumber } from '../utils/formatters.js';

function RecForm({ buildingId, initial, findings, onSaved, onCancel }) {
  const editing = !!initial?.id;
  const form = useForm({
    title: initial?.title || '', estimatedCost: initial?.estimatedCost ?? '', estimatedAnnualSaving: initial?.estimatedAnnualSaving ?? '',
    status: initial?.status || 'Proposed', findingId: initial?.findingId ?? '',
  }, validateRecommendation);
  const submit = form.handleSubmit(async (v) => {
    const body = {
      title: v.title.trim(), estimatedCost: Number(v.estimatedCost), estimatedAnnualSaving: Number(v.estimatedAnnualSaving),
      status: v.status, findingId: v.findingId ? Number(v.findingId) : null,
    };
    if (editing) await updateRecommendation(buildingId, initial.id, body);
    else await createRecommendation(buildingId, { ...body, measureId: initial?.measureId ?? null });
    onSaved(editing ? 'Recommendation updated' : 'Recommendation added');
  });
  const f = (name, label, extra = {}) => <FormField label={label} name={name} value={form.values[name]} onChange={form.onChange} error={form.errors[name]} {...extra} />;
  return (
    <form className="panel" onSubmit={submit} noValidate aria-label={editing ? 'Edit recommendation' : 'Add recommendation'}>
      <h2>{editing ? 'Edit recommendation' : initial?.measureId ? 'Add from measures library' : 'Add recommendation'}</h2>
      {initial?.basis && <Alert variant="info">Saving estimate based on the {initial.basis}. This is an estimate, not a verified result; edit any value before saving.</Alert>}
      {form.formError && <Alert variant="error">{form.formError}</Alert>}
      {f('title', 'Title')}
      <div className="form-grid">
        {f('estimatedCost', 'Estimated cost', { type: 'number', min: 0, step: 'any' })}
        {f('estimatedAnnualSaving', 'Estimated annual saving (estimate)', { type: 'number', min: 0, step: 'any' })}
        <FormField as="select" label="Status" name="status" value={form.values.status} onChange={form.onChange} error={form.errors.status}>
          {['Proposed', 'Accepted', 'Implemented'].map((s) => <option key={s}>{s}</option>)}
        </FormField>
        <FormField as="select" label="Related finding (optional)" name="findingId" value={form.values.findingId} onChange={form.onChange} error={form.errors.findingId}>
          <option value="">None</option>
          {findings.map((x) => <option key={x.id} value={x.id}>{categoryLabel(x.area)}: {x.problem.slice(0, 60)}</option>)}
        </FormField>
      </div>
      <div className="form-actions">
        <Button type="submit" disabled={form.submitting}>{form.submitting ? 'Saving…' : 'Save'}</Button>
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}

export default function Recommendations() {
  const { buildings, loading: bLoading, error: bError, selected, selectBuilding } = useBuildings();
  const { isAdmin, institution } = useAuth();
  const bid = selected?.id;
  const cur = institution?.currency || 'KES';
  const recs = useApi(() => listRecommendations(bid), [bid], { enabled: !!bid });
  const measures = useApi(listMeasures, []);
  const findings = useApi(() => listFindings(bid), [bid], { enabled: !!bid });
  const [form, setForm] = useState(null); // null | initial values object ({} = blank)
  const [showLibrary, setShowLibrary] = useState(false);
  const [measureId, setMeasureId] = useState('');
  const [libBusy, setLibBusy] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [actionError, setActionError] = useState(null);

  if (bLoading) return <Spinner />;
  if (bError) return <Alert variant="error">{bError.message}</Alert>;
  if (!buildings.length) return <EmptyState title="No buildings yet" action={<Link to="/buildings" className="btn">Add a building</Link>}>Add a building before creating recommendations.</EmptyState>;

  const saved = (msg) => { setForm(null); setNotice(msg); recs.reload(); };
  const usePrefill = async () => {
    setLibBusy(true); setActionError(null);
    try {
      const p = await prefillRecommendation(bid, measureId);
      setForm({ measureId: p.measureId, title: p.title, estimatedCost: p.estimatedCost, estimatedAnnualSaving: p.estimatedAnnualSaving, basis: p.baselineBasis });
      setShowLibrary(false);
    } catch (e) { setActionError(e.message); } finally { setLibBusy(false); }
  };
  const changeStatus = async (rec, status) => {
    setActionError(null);
    try { await updateRecommendation(bid, rec.id, { status }); recs.reload(); } catch (e) { setActionError(e.message); }
  };
  const confirmDelete = async () => {
    setBusy(true);
    try { await deleteRecommendation(bid, toDelete.id); setNotice('Recommendation deleted'); recs.reload(); } catch (e) { setActionError(e.message); } finally { setBusy(false); setToDelete(null); }
  };

  const list = recs.data?.items || [];
  return (
    <div className="stack">
      <div className="page-header"><h1>Recommendations</h1><BuildingSelector buildings={buildings} value={bid} onChange={(v) => { selectBuilding(v); setForm(null); }} /></div>
      <Alert variant="info">All savings and paybacks on this page are <strong>estimates</strong>, not verified results.</Alert>
      {notice && <Alert variant="success" onClose={() => setNotice(null)}>{notice}</Alert>}
      {actionError && <Alert variant="error" onClose={() => setActionError(null)}>{actionError}</Alert>}
      <div className="row">
        <Button onClick={() => { setForm({}); setShowLibrary(false); }} disabled={!!form}>Add recommendation</Button>
        <Button variant="secondary" onClick={() => { setShowLibrary((s) => !s); }} disabled={!!form}>Add from measures library</Button>
      </div>
      {showLibrary && (
        <section className="panel" aria-labelledby="lib-title">
          <h2 id="lib-title">Measures library</h2>
          {measures.loading && <Spinner />}
          {measures.error && <Alert variant="error">{measures.error.message}</Alert>}
          {measures.data && (<>
            <FormField as="select" label="Measure" value={measureId} onChange={(e) => setMeasureId(e.target.value)} hint="Title, cost and a saving estimate are pre-filled; you can edit everything before saving.">
              <option value="">Choose a measure…</option>
              {measures.data.items.map((m) => <option key={m.id} value={m.id}>{m.name} ({categoryLabel(m.category)}, ~{formatNumber(m.typicalSavingPct)}% saving, {formatCurrency(m.typicalCost, cur)})</option>)}
            </FormField>
            <div className="form-actions">
              <Button onClick={usePrefill} disabled={!measureId || libBusy}>{libBusy ? 'Loading…' : 'Use this measure'}</Button>
              <Button variant="secondary" onClick={() => setShowLibrary(false)}>Cancel</Button>
            </div>
          </>)}
        </section>
      )}
      {form && <RecForm key={form.id || form.measureId || 'new'} buildingId={bid} initial={form} findings={findings.data?.items || []} onSaved={saved} onCancel={() => setForm(null)} />}
      {recs.loading && <Spinner />}
      {recs.error && <Alert variant="error">{recs.error.message} <Button variant="link" onClick={recs.reload}>Retry</Button></Alert>}
      {recs.data && (list.length === 0
        ? <EmptyState title="No recommendations yet">Add one by hand or from the measures library.</EmptyState>
        : (<>
          <p><strong>Total estimated cost:</strong> {formatCurrency(recs.data.totals.estimatedCost, cur)} · <strong>Total estimated annual saving:</strong> {formatCurrency(recs.data.totals.estimatedAnnualSaving, cur)} <span className="muted">(estimate)</span></p>
          <div className="cards">
            {list.map((r) => <RecommendationCard key={r.id} rec={r} currency={cur} canDelete={isAdmin} onEdit={(x) => setForm(x)} onDelete={setToDelete} onStatusChange={changeStatus} />)}
          </div>
        </>))}
      <ConfirmDialog open={!!toDelete} busy={busy} title="Delete recommendation?" message={toDelete && `Delete “${toDelete.title}”?`} onConfirm={confirmDelete} onCancel={() => setToDelete(null)} />
    </div>
  );
}
