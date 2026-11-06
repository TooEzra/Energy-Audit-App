import { Bar } from 'react-chartjs-2';
import { seriesColor } from './chartSetup.js';
import ChartDataTable from './ChartDataTable.jsx';
import { formatMonth, formatNumber } from '../../utils/formatters.js';

/** Monthly kWh of every building. monthly = { labels:['2025-01',..], series:[{name, values:[..|null]}] } */
export default function MonthlyConsumptionChart({ monthly }) {
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
      <div className="chart-box"><Bar data={data} options={options} aria-label="Monthly consumption by building" role="img" /></div>
      <ChartDataTable
        caption="Monthly consumption in kWh by building"
        columns={['Month', ...monthly.series.map((s) => `${s.name} (kWh)`)]}
        rows={monthly.labels.map((m, i) => [formatMonth(m), ...monthly.series.map((s) => formatNumber(s.values[i]))])}
      />
    </div>
  );
}
