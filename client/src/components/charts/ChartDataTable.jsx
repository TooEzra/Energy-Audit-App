/** Accessible data table shown beneath every chart. */
export default function ChartDataTable({ caption, columns, rows }) {
  return (
    <details className="chart-table" open>
      <summary>Data table</summary>
      <div className="table-wrap">
        <table className="data">
          <caption className="visually-hidden">{caption}</caption>
          <thead><tr>{columns.map((c, i) => <th key={c} scope="col" className={i > 0 ? 'num' : undefined}>{c}</th>)}</tr></thead>
          <tbody>{rows.map((r, i) => <tr key={i}>{r.map((v, j) => <td key={j} className={j > 0 ? 'num' : undefined}>{v}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </details>
  );
}
