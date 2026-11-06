import { useState } from 'react';
import { useApi } from '../hooks/useApi.js';
import { useAuth } from '../hooks/useAuth.js';
import { useForm } from '../hooks/useForm.js';
import { getInstitution, updateInstitution } from '../api/institution.js';
import { validateSettings } from '../utils/validators.js';
import Spinner from '../components/ui/Spinner.jsx';
import Alert from '../components/ui/Alert.jsx';
import Button from '../components/ui/Button.jsx';
import FormField from '../components/ui/FormField.jsx';

function SettingsForm({ institution }) {
  const { setInstitution } = useAuth();
  const [saved, setSaved] = useState(false);
  const form = useForm({ name: institution.name, currency: institution.currency, maxBuildings: institution.maxBuildings }, validateSettings);
  const submit = form.handleSubmit(async (v) => {
    const updated = await updateInstitution({ name: v.name.trim(), currency: v.currency.trim().toUpperCase(), maxBuildings: Number(v.maxBuildings) });
    setInstitution(updated);
    form.reset({ name: updated.name, currency: updated.currency, maxBuildings: updated.maxBuildings });
    setSaved(true);
  });
  const change = (e) => { setSaved(false); form.onChange(e); };
  return (
    <form className="panel" onSubmit={submit} noValidate aria-label="Institution settings">
      {saved && <Alert variant="success" onClose={() => setSaved(false)}>Settings saved.</Alert>}
      {form.formError && <Alert variant="error">{form.formError}</Alert>}
      <div className="form-grid">
        <FormField label="Institution name" name="name" value={form.values.name} onChange={change} error={form.errors.name} />
        <FormField label="Currency (3-letter code)" name="currency" maxLength={3} value={form.values.currency} onChange={change} error={form.errors.currency} />
        <FormField label="Building limit (1–50)" type="number" name="maxBuildings" min={1} max={50} value={form.values.maxBuildings} onChange={change} error={form.errors.maxBuildings} />
      </div>
      <div className="form-actions"><Button type="submit" disabled={form.submitting}>{form.submitting ? 'Saving…' : 'Save settings'}</Button></div>
    </form>
  );
}

export default function Settings() {
  const { data, loading, error, reload } = useApi(getInstitution, []);
  return (
    <div className="stack">
      <div className="page-header"><h1>Settings</h1></div>
      {loading && <Spinner />}
      {error && <Alert variant="error">{error.message} <Button variant="link" onClick={reload}>Retry</Button></Alert>}
      {data && <SettingsForm institution={data} />}
    </div>
  );
}
