import { useState } from 'react';
import { useApi } from '../hooks/useApi.js';
import { useAuth } from '../hooks/useAuth.js';
import { useForm } from '../hooks/useForm.js';
import { listUsers, createUser, updateUser, deleteUser } from '../api/users.js';
import { validateUser, validatePassword } from '../utils/validators.js';
import Spinner from '../components/ui/Spinner.jsx';
import Alert from '../components/ui/Alert.jsx';
import Button from '../components/ui/Button.jsx';
import DataTable from '../components/ui/DataTable.jsx';
import FormField from '../components/ui/FormField.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import ConfirmDialog from '../components/ui/ConfirmDialog.jsx';
import StatusChip from '../components/ui/StatusChip.jsx';
import { formatDate } from '../utils/formatters.js';

function AddUserForm({ onCreated, onCancel }) {
  const form = useForm({ name: '', email: '', role: 'auditor', temporaryPassword: '' }, validateUser);
  const submit = form.handleSubmit(async (v) => {
    const body = { name: v.name.trim(), email: v.email.trim(), role: v.role };
    if (v.temporaryPassword) body.temporaryPassword = v.temporaryPassword;
    onCreated(await createUser(body));
  });
  return (
    <form className="panel" onSubmit={submit} noValidate aria-label="Add user">
      <h2>Add user</h2>
      {form.formError && <Alert variant="error">{form.formError}</Alert>}
      <div className="form-grid">
        <FormField label="Name" name="name" value={form.values.name} onChange={form.onChange} error={form.errors.name} />
        <FormField label="E-mail" type="email" name="email" value={form.values.email} onChange={form.onChange} error={form.errors.email} />
        <FormField as="select" label="Role" name="role" value={form.values.role} onChange={form.onChange} error={form.errors.role}>
          <option value="auditor">Auditor</option><option value="admin">Admin</option>
        </FormField>
        <FormField label="Temporary password (optional)" name="temporaryPassword" value={form.values.temporaryPassword} onChange={form.onChange} error={form.errors.temporaryPassword} hint="Leave blank to generate one. The user must change it at first login." />
      </div>
      <div className="form-actions">
        <Button type="submit" disabled={form.submitting}>{form.submitting ? 'Creating…' : 'Create user'}</Button>
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}

function ResetPasswordForm({ user, onDone, onCancel }) {
  const form = useForm({ temporaryPassword: '' }, (v) => ({ temporaryPassword: validatePassword(v.temporaryPassword) }));
  const submit = form.handleSubmit(async (v) => { await updateUser(user.id, { temporaryPassword: v.temporaryPassword }); onDone(v.temporaryPassword); });
  return (
    <form className="panel" onSubmit={submit} noValidate aria-label={`Reset password for ${user.name}`}>
      <h2>Reset password for {user.name}</h2>
      {form.formError && <Alert variant="error">{form.formError}</Alert>}
      <FormField label="New temporary password" name="temporaryPassword" value={form.values.temporaryPassword} onChange={form.onChange} error={form.errors.temporaryPassword} hint="They will have to change it at their next login." />
      <div className="form-actions">
        <Button type="submit" disabled={form.submitting}>{form.submitting ? 'Saving…' : 'Reset password'}</Button>
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}

export default function Users() {
  const { user: me } = useAuth();
  const { data, loading, error, reload } = useApi(listUsers, []);
  const [mode, setMode] = useState(null); // null | 'add' | { reset: user }
  const [toDelete, setToDelete] = useState(null);
  const [busy, setBusy] = useState(false);
  const [credentials, setCredentials] = useState(null); // shown once after create / reset
  const [actionError, setActionError] = useState(null);

  const changeRole = async (u, role) => {
    setActionError(null);
    try { await updateUser(u.id, { role }); reload(); } catch (e) { setActionError(e.message); reload(); }
  };
  const confirmDelete = async () => {
    setBusy(true);
    try { await deleteUser(toDelete.id); reload(); } catch (e) { setActionError(e.message); } finally { setBusy(false); setToDelete(null); }
  };

  const columns = [
    { key: 'name', header: 'Name' },
    { key: 'email', header: 'E-mail' },
    { key: 'role', header: 'Role', render: (u) => (
      <span className="row">
        <StatusChip kind="role" value={u.role} />
        <select aria-label={`Role of ${u.name}`} value={u.role} onChange={(e) => changeRole(u, e.target.value)}>
          <option value="admin">admin</option><option value="auditor">auditor</option>
        </select>
      </span>) },
    { key: 'pw', header: 'Password', render: (u) => (u.mustChangePassword ? <StatusChip kind="warn">Temporary: must change</StatusChip> : 'Set by user') },
    { key: 'createdAt', header: 'Created', render: (u) => formatDate(u.createdAt) },
    { key: 'actions', header: 'Actions', render: (u) => (
      <span className="row">
        <Button variant="secondary" size="small" onClick={() => setMode({ reset: u })}>Reset password</Button>
        {u.id !== me.id && <Button variant="danger secondary" size="small" onClick={() => setToDelete(u)}>Delete</Button>}
      </span>) },
  ];

  return (
    <div className="stack">
      <div className="page-header"><h1>Users</h1><Button onClick={() => setMode('add')} disabled={!!mode}>Add user</Button></div>
      {credentials && (
        <Alert variant="success" title="Share this temporary password now. It is shown only once:" onClose={() => setCredentials(null)}>
          {credentials.name}: <code>{credentials.password}</code>
        </Alert>
      )}
      {actionError && <Alert variant="error" onClose={() => setActionError(null)}>{actionError}</Alert>}
      {mode === 'add' && <AddUserForm onCreated={(u) => { setCredentials({ name: u.name, password: u.temporaryPassword }); setMode(null); reload(); }} onCancel={() => setMode(null)} />}
      {mode?.reset && <ResetPasswordForm user={mode.reset} onDone={(pw) => { setCredentials({ name: mode.reset.name, password: pw }); setMode(null); reload(); }} onCancel={() => setMode(null)} />}
      {loading && <Spinner />}
      {error && <Alert variant="error">{error.message} <Button variant="link" onClick={reload}>Retry</Button></Alert>}
      {data && (data.items.length === 0 ? <EmptyState title="No users" /> : <DataTable columns={columns} rows={data.items} caption="Users" />)}
      <ConfirmDialog open={!!toDelete} busy={busy} title="Delete user?" message={toDelete && `Delete the account of ${toDelete.name} (${toDelete.email})?`} onConfirm={confirmDelete} onCancel={() => setToDelete(null)} />
    </div>
  );
}
