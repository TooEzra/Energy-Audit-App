import { useState } from 'react';
import Alert from '../ui/Alert.jsx';
import Button from '../ui/Button.jsx';
import { checkCsvHeader } from '../../utils/csvParser.js';
import { formatMonth, formatNumber } from '../../utils/formatters.js';

const SAMPLE = 'month,kwh,cost\n2025-01,12000,180000\n2025-02,11500,172500';

/**
 * Two steps: "Validate" (server dry-run, returns per-row errors) then "Import valid rows" (only after the user confirms).
 * onPreview(csv) / onConfirm(csv) are provided by the page (they call the API); this component never calls fetch.
 */
export default function CsvImportPanel({ onPreview, onConfirm, onImported }) {
  const [csv, setCsv] = useState('');
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const change = (text) => { setCsv(text); setPreview(null); setError(null); };
  const readFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => change(String(reader.result || ''));
    reader.onerror = () => setError('Could not read that file');
    reader.readAsText(file);
  };

  const validate = async () => {
    const quick = checkCsvHeader(csv);
    if (!quick.ok) { setError(quick.message); setPreview(null); return; }
    setBusy(true); setError(null);
    try { setPreview(await onPreview(csv)); } catch (e) { setError(e.details?.csv || e.message); setPreview(null); } finally { setBusy(false); }
  };
  const confirm = async () => {
    setBusy(true); setError(null);
    try {
      const result = await onConfirm(csv);
      setCsv(''); setPreview(null);
      onImported?.(result);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  return (
    <section className="panel csv-drop" aria-labelledby="csv-title">
      <h2 id="csv-title">Import from CSV</h2>
      <p className="muted">Columns: <code>month,kwh,cost</code> (month as YYYY-MM). Nothing is saved until you confirm the valid rows.</p>
      <div className="field">
        <label htmlFor="csv-file">CSV file</label>
        <input id="csv-file" type="file" accept=".csv,text/csv,text/plain" onChange={readFile} />
      </div>
      <div className="field">
        <label htmlFor="csv-text">…or paste CSV text</label>
        <textarea id="csv-text" value={csv} placeholder={SAMPLE} onChange={(e) => change(e.target.value)} />
      </div>
      {error && <Alert variant="error">{error}</Alert>}
      {preview && (
        <div className="stack">
          <Alert variant={preview.errors.length ? 'warning' : 'success'}>
            {preview.valid.length} valid row(s), {preview.errors.length} row(s) with problems.
          </Alert>
          {preview.errors.length > 0 && (
            <div role="region" aria-label="Invalid rows">
              <h3>Rows that will be skipped</h3>
              <ul>{preview.errors.map((r) => <li key={r.row}>Row {r.row}: {r.message}</li>)}</ul>
            </div>
          )}
          {preview.valid.length > 0 && (
            <div className="table-wrap">
              <table className="data">
                <caption>Rows to import</caption>
                <thead><tr><th scope="col">Row</th><th scope="col">Month</th><th scope="col" className="num">kWh</th><th scope="col" className="num">Cost</th></tr></thead>
                <tbody>{preview.valid.map((r) => <tr key={r.row}><td>{r.row}</td><td>{formatMonth(r.month)}</td><td className="num">{formatNumber(r.kwh)}</td><td className="num">{formatNumber(r.cost)}</td></tr>)}</tbody>
              </table>
            </div>
          )}
        </div>
      )}
      <div className="form-actions">
        <Button variant="secondary" onClick={validate} disabled={busy || !csv.trim()}>{busy && !preview ? 'Checking…' : 'Validate'}</Button>
        <Button onClick={confirm} disabled={busy || !preview || preview.valid.length === 0}>
          {preview ? `Import ${preview.valid.length} valid row(s)` : 'Import valid rows'}
        </Button>
      </div>
    </section>
  );
}
