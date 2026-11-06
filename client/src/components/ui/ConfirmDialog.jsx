import { useEffect, useRef } from 'react';
import Button from './Button.jsx';

/** Confirmation before destructive actions. Escape cancels; focus starts on Cancel. */
export default function ConfirmDialog({ open, title = 'Are you sure?', message, confirmLabel = 'Delete', busy, onConfirm, onCancel }) {
  const cancelRef = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    cancelRef.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onCancel]);
  if (!open) return null;
  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-msg">
        <h2 id="confirm-title">{title}</h2>
        <p id="confirm-msg">{message}</p>
        <div className="form-actions">
          <Button variant="danger" onClick={onConfirm} disabled={busy}>{busy ? 'Working…' : confirmLabel}</Button>
          <Button ref={cancelRef} variant="secondary" onClick={onCancel} disabled={busy}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}
