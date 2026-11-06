import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useBuildings } from '../hooks/useBuildings.js';
import { useApi } from '../hooks/useApi.js';
import { useAuth } from '../hooks/useAuth.js';
import { listFindings, createFinding, updateFinding, deleteFinding, photoUrl } from '../api/findings.js';
import Spinner from '../components/ui/Spinner.jsx';
import Alert from '../components/ui/Alert.jsx';
import Button from '../components/ui/Button.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import ConfirmDialog from '../components/ui/ConfirmDialog.jsx';
import StatusChip from '../components/ui/StatusChip.jsx';
import BuildingSelector from '../components/domain/BuildingSelector.jsx';
import FindingForm from '../components/domain/FindingForm.jsx';
import { categoryLabel } from '../utils/formatters.js';

const AREAS = ['lighting', 'ac_ventilation', 'motors_pumps', 'operating_hours', 'practices'];

export default function Audit() {
  const { buildings, loading: bLoading, error: bError, selected, selectBuilding } = useBuildings();
  const { isAdmin } = useAuth();
  const bid = selected?.id;
  const { data, loading, error, reload } = useApi(() => listFindings(bid), [bid], { enabled: !!bid });
  const [area, setArea] = useState(AREAS[0]);
  const [form, setForm] = useState(null); // null | { initial? }
  const [toDelete, setToDelete] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [actionError, setActionError] = useState(null);

  if (bLoading) return <Spinner />;
  if (bError) return <Alert variant="error">{bError.message}</Alert>;
  if (!buildings.length) return <EmptyState title="No buildings yet" action={<Link to="/buildings" className="btn">Add a building</Link>}>Add a building before recording audit findings.</EmptyState>;

  const items = data?.items || [];
  const inArea = items.filter((f) => f.area === area);
  const countFor = (a) => items.filter((f) => f.area === a).length;
  const save = async (fd) => {
    if (form.initial) await updateFinding(bid, form.initial.id, fd); else await createFinding(bid, fd);
    setNotice(form.initial ? 'Finding updated' : 'Finding added');
    setForm(null); reload();
  };
  const confirmDelete = async () => {
    setBusy(true);
    try { await deleteFinding(bid, toDelete.id); setNotice('Finding deleted'); reload(); } catch (e) { setActionError(e.message); } finally { setBusy(false); setToDelete(null); }
  };

  return (
    <div className="stack">
      <div className="page-header"><h1>Audit</h1><BuildingSelector buildings={buildings} value={bid} onChange={(v) => { selectBuilding(v); setForm(null); }} /></div>
      {notice && <Alert variant="success" onClose={() => setNotice(null)}>{notice}</Alert>}
      {actionError && <Alert variant="error" onClose={() => setActionError(null)}>{actionError}</Alert>}
      <div className="tabs" role="tablist" aria-label="Audit checklist areas">
        {AREAS.map((a) => (
          <button key={a} role="tab" id={`tab-${a}`} aria-selected={area === a} aria-controls="area-panel" onClick={() => { setArea(a); setForm(null); }}>
            {categoryLabel(a)} ({countFor(a)})
          </button>
        ))}
      </div>
      <div id="area-panel" role="tabpanel" aria-labelledby={`tab-${area}`} className="stack">
        <div><Button onClick={() => setForm({})} disabled={!!form}>Add finding</Button></div>
        {form && <FindingForm key={form.initial?.id || 'new'} area={area} initial={form.initial} onSubmit={save} onCancel={() => setForm(null)} />}
        {loading && <Spinner />}
        {error && <Alert variant="error">{error.message} <Button variant="link" onClick={reload}>Retry</Button></Alert>}
        {data && inArea.length === 0 && <EmptyState title={`No ${categoryLabel(area).toLowerCase()} findings yet`}>Use “Add finding” to record a problem in this area.</EmptyState>}
        {inArea.map((f) => (
          <article key={f.id} className={`finding priority-${f.priority}`} aria-label={f.problem}>
            <div className="row between"><strong>{f.problem}</strong><StatusChip kind="priority" value={f.priority} /></div>
            {f.locationSystem && <p className="small"><span className="muted">Location / system:</span> {f.locationSystem}</p>}
            {f.suggestedImprovement && <p className="small"><span className="muted">Suggested improvement:</span> {f.suggestedImprovement}</p>}
            {f.hasPhoto && <img src={photoUrl(bid, f.id)} alt={`Photo for finding: ${f.problem}`} loading="lazy" />}
            <div className="row" style={{ marginTop: 'var(--space-2)' }}>
              <Button variant="secondary" size="small" onClick={() => setForm({ initial: f })}>Edit</Button>
              {isAdmin && <Button variant="danger secondary" size="small" onClick={() => setToDelete(f)}>Delete</Button>}
            </div>
          </article>
        ))}
      </div>
      <ConfirmDialog open={!!toDelete} busy={busy} title="Delete finding?" message={toDelete && `Delete the finding “${toDelete.problem}”?`} onConfirm={confirmDelete} onCancel={() => setToDelete(null)} />
    </div>
  );
}
