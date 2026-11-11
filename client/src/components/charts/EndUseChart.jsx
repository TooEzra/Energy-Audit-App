import { Pie } from 'react-chartjs-2';
import { seriesColor } from './chartSetup.js';
import ChartDataTable from './ChartDataTable.jsx';
import { categoryLabel, formatNumber } from '../../utils/formatters.js';

/** End-use pie: share of inventory kWh by equipment category. endUse = [{category, kwh, sharePct}] */
export default function EndUseChart({ endUse }) {
  if (!endUse.length) return null;
  const data = {
    labels: endUse.map((e) => categoryLabel(e.category)),
    datasets: [{ data: endUse.map((e) => e.kwh), backgroundColor: endUse.map((_, i) => seriesColor(i)) }],
  };
  const options = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: typeof window !== 'undefined' && window.innerWidth < 640 ? 'bottom' : 'right' } } };
  return (
    <div className="chart-section">
      <div className="chart-box"><Pie data={data} options={options} aria-label="End-use share of inventory consumption" role="img" /></div>
      <ChartDataTable
        caption="End-use share of inventory kWh"
        columns={['Category', 'kWh / year', 'Share (%)']}
        rows={endUse.map((e) => [categoryLabel(e.category), formatNumber(e.kwh), formatNumber(e.sharePct, 1)])}
      />
    </div>
  );
}
