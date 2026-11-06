import { useState } from 'react';

/** Small form helper: values, inline errors (client + server), submit state. */
export function useForm(initial, validate) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const onChange = (e) => {
    const { name, value } = e.target;
    setValues((v) => ({ ...v, [name]: value }));
    setErrors((er) => ({ ...er, [name]: undefined }));
  };
  const reset = (next = initial) => { setValues(next); setErrors({}); setFormError(null); };

  const handleSubmit = (submit) => async (e) => {
    e.preventDefault();
    // Validators may return keys with undefined values for valid fields; keep only real messages.
    const clientErrors = Object.fromEntries(Object.entries(validate ? validate(values) : {}).filter(([, msg]) => msg));
    if (Object.keys(clientErrors).length) { setErrors(clientErrors); setFormError(null); return; }
    setSubmitting(true);
    setFormError(null);
    try {
      await submit(values);
    } catch (err) {
      if (err.details && typeof err.details === 'object') setErrors(err.details); // server field errors
      setFormError(err.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };
  return { values, errors, formError, submitting, onChange, reset, setValues, setErrors, handleSubmit };
}
