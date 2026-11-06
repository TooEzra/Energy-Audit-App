/** kind: 'priority' (Low/Medium/High) | 'status' (Proposed/Accepted/Implemented) | 'role' | 'estimate' | 'warn' | 'neutral' */
export default function StatusChip({ kind = 'neutral', value, children }) {
  const cls = ['priority', 'status', 'role'].includes(kind) ? `chip ${kind}-${value}` : `chip ${kind}`;
  return <span className={cls}>{children ?? value}</span>;
}
