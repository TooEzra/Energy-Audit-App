import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useBuildings } from '../hooks/useBuildings.js';
import { useApi } from '../hooks/useApi.js';
import { getReport, reportPdfUrl, exportUrl } from '../api/reports.js';
import Spinner from '../components/ui/Spinner.jsx';
import Alert from '../components/ui/Alert.jsx';
import Button from '../components/ui/Button.jsx';
import FormField from '../components/ui/FormField.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import BuildingSelector from '../components/domain/BuildingSelector.jsx';
import ReportPreview from '../components/domain/ReportPreview.jsx';

export default function Reports() {
  const { buildings, loading: bLoading, error: bError, selected, selectBuilding } = useBuildings();
  const bid = selected?.id;
  const { data, loading, error, reload } = useApi(() => getReport(bid), [bid], { enabled: !!bid });
  const [conclusion, setConclusion] = useState('');

  // Start from the generated conclusion whenever a different building's report loads.
  useEffect(() => { if (data) setConclusion(data.conclusion); }, [data]);

  if (bLoading) return <Spinner />;
  if (bError) return <Alert variant="error">{bError.message}</Alert>;
  if (!buildings.length) return <EmptyState title="No buildings yet" action={<Link to="/buildings" className="btn">Add a building</Link>}>Add a building to produce a report.</EmptyState>;

  // The preview shows the text being edited; the PDF link carries the same text to the server.
  const report = data ? { ...data, conclusion } : null;

  return (
    <div className="stack">
      <div className="page-header no-print">
        <h1>Reports</h1>
        <BuildingSelector buildings={buildings} value={bid} onChange={selectBuilding} />
      </div>
      {loading && <Spinner />}
      {error && <Alert variant="error">{error.message} <Button variant="link" onClick={reload}>Retry</Button></Alert>}
      {report && (<>
        <section className="panel no-print" aria-labelledby="concl-title">
          <h2 id="concl-title">Conclusion (editable)</h2>
          <FormField as="textarea" rows={5} label="Conclusion text" value={conclusion} maxLength={2000} onChange={(e) => setConclusion(e.target.value)} hint="Used in the preview, the printout and the PDF. Up to 2000 characters." />
          <div className="form-actions">
            <a className="btn" href={reportPdfUrl(bid, conclusion)} download>Export PDF</a>
            <Button variant="secondary" onClick={() => window.print()}>Print</Button>
            <Button variant="secondary" onClick={() => setConclusion(data.defaultConclusion)}>Reset to suggested text</Button>
          </div>
          <p className="muted small">If PDF export is unavailable on this machine, use Print and choose “Save as PDF”.</p>
        </section>
        <ReportPreview report={report} />
      </>)}
      <section className="panel no-print" aria-labelledby="export-title">
        <h2 id="export-title">Export institution data</h2>
        <p className="muted">Download all of your institution's data.</p>
        <div className="row"><a className="btn secondary" href={exportUrl('json')} download>Download JSON</a><a className="btn secondary" href={exportUrl('csv')} download>Download CSV</a></div>
      </section>
    </div>
  );
}
