import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { useForm } from '../hooks/useForm.js';
import { validateEmail } from '../utils/validators.js';
import FormField from '../components/ui/FormField.jsx';
import Button from '../components/ui/Button.jsx';
import Alert from '../components/ui/Alert.jsx';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const form = useForm({ email: '', password: '' }, (v) => ({
    email: validateEmail(v.email), password: v.password ? undefined : 'Password is required',
  }));
  if (user) return <Navigate to={user.mustChangePassword ? '/change-password' : '/'} replace />;

  const submit = form.handleSubmit(async (v) => {
    const s = await login(v.email.trim(), v.password);
    navigate(s.user.mustChangePassword ? '/change-password' : location.state?.from || '/', { replace: true });
  });
  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={submit} noValidate>
        <h1>Energy Audit</h1>
        <p className="muted">Sign in to your institution's account.</p>
        {form.formError && <Alert variant="error">{form.formError}</Alert>}
        <FormField label="E-mail" type="email" name="email" autoComplete="username" value={form.values.email} onChange={form.onChange} error={form.errors.email} />
        <FormField label="Password" type="password" name="password" autoComplete="current-password" value={form.values.password} onChange={form.onChange} error={form.errors.password} />
        <Button type="submit" disabled={form.submitting}>{form.submitting ? 'Signing in…' : 'Sign in'}</Button>
        <p className="small" style={{ marginTop: 'var(--space-4)' }}>New institution? <Link to="/register">Register here</Link></p>
      </form>
    </div>
  );
}
