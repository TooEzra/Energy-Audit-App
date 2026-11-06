import { Link } from 'react-router-dom';
import { useApi } from '../hooks/useApi.js';
import { useAuth } from '../hooks/useAuth.js';
import { getComparison } from '../api/energy.js';
import Spinner from '../components/ui/Spinner.jsx';
import Alert from '../components/ui/Alert.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import Button from '../components/ui/Button.jsx';
import MonthlyConsumptionChart from '../components/charts/MonthlyConsumptionChart.jsx';
import EuiComparisonChart from '../components/charts/EuiComparisonChart.jsx';
import AnomalyBanner from '../components/domain/AnomalyBanner.jsx';
import { formatCurrency, formatNumber } from '../utils/formatters.js';

export default function Dashboard() {
  const { institution } = useAuth();
  const { data, loading, error, reload } = useApi(getComparison, []);
  const cur = institution?.currency || 'KES';

  return (
    <div className="stack">
      <div className="page-header"><h1>Dashboard</h1></div>
      {loading && <Spinner />}
      {error && <Alert variant="error">{error.message} <Button variant="link" onClick={reload}>Retry</Button></Alert>}
      {data && data.items.length === 0 && (
        <EmptyState title="No buildings yet" action={<Link to="/buildings" className="btn">Add your first building</Link>}>
          Add a building, then enter its monthly electricity data to see charts and EUI here.
        </EmptyState>
      )}
      {data && data.items.length > 0 && (<>
        <AnomalyBanner anomalies={data.anomalies} showBuilding />
        <div className="grid-3">
          <div className="kpi"><div className="value">{formatNumber(data.totals.buildings)}</div><div className="label">Buildings</div></div>
          <div className="kpi"><div className="value">{formatNumber(data.totals.kwh)} kWh</div><div className="label">Total consumption (latest 12 months per building)</div></div>
          <div className="kpi"><div className="value">{formatCurrency(data.totals.cost, cur)}</div><div className="label">Total electricity cost</div></div>
        </div>
        <section className="panel" aria-labelledby="monthly-title">
          <h2 id="monthly-title">Monthly consumption, all buildings</h2>
          {data.monthly.labels.length ? <MonthlyConsumptionChart monthly={data.monthly} /> : <p className="muted">No monthly records yet. <Link to="/energy">Enter energy data</Link>.</p>}
        </section>
        <section className="panel" aria-labelledby="eui-title">
          <h2 id="eui-title">EUI comparison</h2>
          {data.warning && <Alert variant="warning">{data.warning}</Alert>}
          <p className="muted small">EUI = annual kWh ÷ floor area. It is only calculated when a building has 12 months of data. Buildings differ in use, so treat the comparison as a guide, not a ranking.</p>
          <EuiComparisonChart items={data.items} />
        </section>
      </>)}
    </div>
  );
}
