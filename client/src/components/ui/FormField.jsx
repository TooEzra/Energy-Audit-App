import { useId } from 'react';

/** Labelled input/select/textarea with an inline error. `as` = 'input' | 'select' | 'textarea'. */
export default function FormField({ label, error, hint, as: Tag = 'input', id, children, ...props }) {
  const auto = useId();
  const fid = id || auto;
  const describedBy = [error && `${fid}-err`, hint && `${fid}-hint`].filter(Boolean).join(' ') || undefined;
  return (
    <div className="field">
      <label htmlFor={fid}>{label}</label>
      <Tag id={fid} aria-invalid={error ? 'true' : undefined} aria-describedby={describedBy} {...props}>{children}</Tag>
      {hint && <span className="hint" id={`${fid}-hint`}>{hint}</span>}
      {error && <span className="error" id={`${fid}-err`} role="alert">{error}</span>}
    </div>
  );
}
