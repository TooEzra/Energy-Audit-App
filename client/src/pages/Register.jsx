import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { useForm } from '../hooks/useForm.js';
import { validateRegister } from '../utils/validators.js';
import FormField from '../components/ui/FormField.jsx';
import Button from '../components/ui/Button.jsx';
import Alert from '../components/ui/Alert.jsx';

/** Institution sign-up: creates the institution and its first admin. */
export default function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const form = useForm({ institutionName: '', currency: 'KES', adminName: '', email: '', password: '', confirm: '' }, validateRegister);
  if (user) return <Navigate to="/" replace />;

  const submit = form.handleSubmit(async (v) => {
    const { confirm, ...data } = v; // confirm is a client-side check only
    await register({ ...data, email: data.email.trim(), institutionName: data.institutionName.trim(), adminName: data.adminName.trim() });
    navigate('/', { replace: true });
  });
  const f = (name, label, extra = {}) => <FormField label={label} name={name} value={form.values[name]} onChange={form.onChange} error={form.errors[name]} {...extra} />;
  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={submit} noValidate>
        <h1>Register your institution</h1>
        <p className="muted">Creates the institution and its first administrator account.</p>
        {form.formError && <Alert variant="error">{form.formError}</Alert>}
        {f('institutionName', 'Institution name')}
        {f('currency', 'Currency (3-letter code)', { maxLength: 3 })}
        {f('adminName', 'Your name', { autoComplete: 'name' })}
        {f('email', 'E-mail', { type: 'email', autoComplete: 'username' })}
        {f('password', 'Password (at least 8 characters)', { type: 'password', autoComplete: 'new-password' })}
        {f('confirm', 'Confirm password', { type: 'password', autoComplete: 'new-password' })}
        <Button type="submit" disabled={form.submitting}>{form.submitting ? 'Creating…' : 'Create institution'}</Button>
        <p className="small" style={{ marginTop: 'var(--space-4)' }}>Already registered? <Link to="/login">Sign in</Link></p>
      </form>
    </div>
  );
}
