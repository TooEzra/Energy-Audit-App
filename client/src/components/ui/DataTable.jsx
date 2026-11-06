/**
 * columns: [{ key, header, render?: (row) => node, align?: 'num' }]
 * Shows an empty message when there are no rows.
 */
export default function DataTable({ columns, rows, rowKey = 'id', caption, emptyMessage = 'No data yet.', rowClassName }) {
  if (!rows || rows.length === 0) return <div className="empty">{emptyMessage}</div>;
  return (
    <div className="table-wrap">
      <table className="data">
        {caption && <caption>{caption}</caption>}
        <thead>
          <tr>{columns.map((c) => <th key={c.key} scope="col" className={c.align === 'num' ? 'num' : undefined}>{c.header}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row[rowKey] ?? i} className={rowClassName ? rowClassName(row) : undefined}>
              {columns.map((c) => (
                <td key={c.key} className={c.align === 'num' ? 'num' : undefined}>{c.render ? c.render(row) : row[c.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
