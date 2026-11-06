/** Banner alert. variant: 'error' | 'warning' | 'info' | 'success'. Errors are announced to screen readers. */
export default function Alert({ variant = 'info', title, children, onClose }) {
  return (
    <div className={`alert ${variant}`} role={variant === 'error' ? 'alert' : 'status'}>
      <div className="row between">
        <div>{title && <strong>{title}</strong>}{title && children ? ' ' : null}{children}</div>
        {onClose && <button type="button" className="btn link small" onClick={onClose} aria-label="Dismiss">✕</button>}
      </div>
    </div>
  );
}
