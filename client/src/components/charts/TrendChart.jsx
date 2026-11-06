import { Line } from 'react-chartjs-2';
import { cssVar } from './chartSetup.js';
import { formatMonth } from '../../utils/formatters.js';

/** Monthly kWh trend of one building. Flagged (anomalous) months are drawn as amber points. The records table sits beneath it on the page. */
export default function TrendChart({ series }) {
  const primary = cssVar('--color-primary'), warn = cssVar('--color-warning');
  const data = {
    labels: series.map((s) => formatMonth(s.month)),
    datasets: [{
      label: 'kWh', data: series.map((s) => s.kwh), borderColor: primary, backgroundColor: primary, tension: 0.2,
      pointRadius: series.map((s) => (s.anomaly ? 7 : 3)), pointBackgroundColor: series.map((s) => (s.anomaly ? warn : primary)),
    }],
  };
  const options = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true, title: { display: true, text: 'kWh' } } },
  };
  return <div className="chart-box"><Line data={data} options={options} aria-label="Monthly consumption trend (amber points are flagged months)" role="img" /></div>;
}
