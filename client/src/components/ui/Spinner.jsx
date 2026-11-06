export default function Spinner({ label = 'Loading…' }) {
  return <div role="status" aria-live="polite"><div className="spinner" aria-hidden="true" /><span className="visually-hidden">{label}</span></div>;
}
