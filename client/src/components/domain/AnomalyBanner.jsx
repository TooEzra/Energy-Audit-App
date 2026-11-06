import Alert from '../ui/Alert.jsx';
import { formatMonth, formatNumber } from '../../utils/formatters.js';

/** Warning banner for months flagged as unusually high. anomalies = [{month, kwh, avgOthers, pctAbove, buildingName?}] */
export default function AnomalyBanner({ anomalies, showBuilding = false }) {
  if (!anomalies?.length) return null;
  return (
    <Alert variant="warning" title="Unusually high consumption flagged:">
      <ul>
        {anomalies.map((a) => (
          <li key={`${a.buildingId ?? ''}-${a.month}`}>
            {showBuilding && <strong>{a.buildingName}: </strong>}
            {formatMonth(a.month)} used {formatNumber(a.kwh)} kWh, {formatNumber(a.pctAbove, 0)}% above the average of the other months ({formatNumber(a.avgOthers)} kWh).
          </li>
        ))}
      </ul>
    </Alert>
  );
}
