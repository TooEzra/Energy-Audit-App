import { Bar } from 'react-chartjs-2';
import { seriesColor } from './chartSetup.js';
import ChartDataTable from './ChartDataTable.jsx';
import { formatNumber } from '../../utils/formatters.js';

/** EUI (kWh/m²/year) per building. Buildings without 12 months have no EUI and are listed as "incomplete". */
export default function EuiComparisonChart({ items }) {
  const complete = items.filter((i) => i.euiComplete && i.eui !== null);
  const data = {
    labels: complete.map((i) => i.name),
    datasets: [{ label: 'EUI (kWh/m²/year)', data: complete.map((i) => i.eui), backgroundColor: complete.map((_, i) => seriesColor(i)) }],
  };
  const options = {
    responsive: true, maintainAspectRatio: false, indexAxis: 'y',
    plugins: { legend: { display: false } },
    scales: { x: { beginAtZero: true, title: { display: true, text: 'kWh/m²/year' } } },
  };
  return (
    <div className="chart-section">
      {complete.length > 0
        ? <div className="chart-box" style={{ height: Math.max(240, complete.length * 28 + 60) }}><Bar data={data} options={options} aria-label="EUI comparison" role="img" /></div>
        : <p className="muted">No building has 12 months of data yet, so there is no EUI to compare.</p>}
      <ChartDataTable
        caption="Energy use intensity by building"
        columns={['Building', 'Type', 'EUI (kWh/m²/year)']}
        rows={items.map((i) => [i.name, i.type, i.euiComplete ? formatNumber(i.eui, 1) : `incomplete (${i.monthsRecorded}/12 months)`])}
      />
    </div>
  );
}
