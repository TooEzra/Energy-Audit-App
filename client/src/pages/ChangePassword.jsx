import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { useForm } from '../hooks/useForm.js';
import { validatePassword } from '../utils/validators.js';
import FormField from '../components/ui/FormField.jsx';
import Button from '../components/ui/Button.jsx';
import Alert from '../components/ui/Alert.jsx';

/** Forced at first login for users with a temporary password; also reachable from the top bar. */
export default function ChangePassword() {
  const { user, changePassword, logout } = useAuth();
  const navigate = useNavigate();
  const form = useForm({ currentPassword: '', newPassword: '', confirm: '' }, (v) => ({
    currentPassword: v.currentPassword ? undefined : 'Current password is required',
    newPassword: validatePassword(v.newPassword),
    confirm: v.newPassword !== v.confirm ? 'Passwords do not match' : undefined,
  }));
  const submit = form.handleSubmit(async (v) => {
    await changePassword(v.currentPassword, v.newPassword);
    navigate('/', { replace: true });
  });
  const f = (name, label) => <FormField label={label} type="password" name={name} autoComplete={name === 'currentPassword' ? 'current-password' : 'new-password'} value={form.values[name]} onChange={form.onChange} error={form.errors[name]} />;
  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={submit} noValidate>
        <h1>Change password</h1>
        {user?.mustChangePassword && <Alert variant="warning">You are using a temporary password. Choose a new one to continue.</Alert>}
        {form.formError && <Alert variant="error">{form.formError}</Alert>}
        {f('currentPassword', user?.mustChangePassword ? 'Temporary password' : 'Current password')}
        {f('newPassword', 'New password (at least 8 characters)')}
        {f('confirm', 'Confirm new password')}
        <div className="form-actions">
          <Button type="submit" disabled={form.submitting}>{form.submitting ? 'Saving…' : 'Change password'}</Button>
          {user?.mustChangePassword
            ? <Button variant="secondary" onClick={async () => { await logout(); navigate('/login'); }}>Log out</Button>
            : <Link to="/" className="btn secondary">Cancel</Link>}
        </div>
      </form>
    </div>
  );
}
