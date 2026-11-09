import { Bar } from 'react-chartjs-2';
import { seriesColor } from './chartSetup.js';
import ChartDataTable from './ChartDataTable.jsx';
import { formatMonth, formatNumber } from '../../utils/formatters.js';

/** Monthly kWh of every building. monthly = { labels:['2025-01',..], series:[{name, values:[..|null]}] } */
const MAX_SERIES = 8; // beyond this, per-building bars are unreadable, so show the combined total instead

export default function MonthlyConsumptionChart({ monthly: input }) {
  const combined = input.series.length > MAX_SERIES;
  const monthly = combined
    ? { labels: input.labels, series: [{ name: `All ${input.series.length} buildings (total)`, values: input.labels.map((_, i) => input.series.reduce((sum, s) => sum + (s.values[i] || 0), 0)) }] }
    : input;
  const labels = monthly.labels.map(formatMonth);
  const data = {
    labels,
    datasets: monthly.series.map((s, i) => ({ label: s.name, data: s.values, backgroundColor: seriesColor(i) })),
  };
  const options = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom' } },
    scales: { y: { beginAtZero: true, title: { display: true, text: 'kWh' } } },
  };
  return (
    <div className="chart-section">
      {combined && <p className="muted small">Showing the combined total because there are more than {MAX_SERIES} buildings. Open a building's Energy Records page for its own trend.</p>}
      <div className="chart-box"><Bar data={data} options={options} aria-label="Monthly consumption by building" role="img" /></div>
      <ChartDataTable
        caption="Monthly consumption in kWh by building"
        columns={['Month', ...monthly.series.map((s) => `${s.name} (kWh)`)]}
        rows={monthly.labels.map((m, i) => [formatMonth(m), ...monthly.series.map((s) => formatNumber(s.values[i]))])}
      />
    </div>
  );
}
