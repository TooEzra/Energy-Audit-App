import { useState } from 'react';
import FormField from '../ui/FormField.jsx';
import Button from '../ui/Button.jsx';
import Alert from '../ui/Alert.jsx';
import { useForm } from '../../hooks/useForm.js';
import { validateFinding } from '../../utils/validators.js';
import { categoryLabel } from '../../utils/formatters.js';

const AREAS = ['lighting', 'ac_ventilation', 'motors_pumps', 'operating_hours', 'practices'];
const MAX_PHOTO = 5 * 1024 * 1024;

/** Add / edit a finding. Builds a FormData (fields + optional photo). onSubmit(formData) is supplied by the page. */
export default function FindingForm({ area, initial, onSubmit, onCancel }) {
  const editing = !!initial;
  const [photo, setPhoto] = useState(null);
  const [photoError, setPhotoError] = useState(null);
  const form = useForm({
    area: initial?.area || area, problem: initial?.problem || '', locationSystem: initial?.locationSystem || '',
    suggestedImprovement: initial?.suggestedImprovement || '', priority: initial?.priority || 'Medium', removePhoto: false,
  }, validateFinding);
  const { values, errors, onChange } = form;

  const pickPhoto = (e) => {
    const f = e.target.files?.[0] || null;
    setPhotoError(null);
    if (f && !['image/jpeg', 'image/png'].includes(f.type)) { setPhotoError('Photo must be a JPG or PNG'); setPhoto(null); e.target.value = ''; return; }
    if (f && f.size > MAX_PHOTO) { setPhotoError('Photo must be 5 MB or smaller'); setPhoto(null); e.target.value = ''; return; }
    setPhoto(f);
  };

  const submit = form.handleSubmit(async (v) => {
    if (photoError) throw new Error(photoError);
    const fd = new FormData();
    ['area', 'problem', 'locationSystem', 'suggestedImprovement', 'priority'].forEach((k) => fd.append(k, v[k] ?? ''));
    if (editing && v.removePhoto) fd.append('removePhoto', 'true');
    if (photo) fd.append('photo', photo);
    await onSubmit(fd);
  });

  return (
    <form className="panel" onSubmit={submit} noValidate aria-label={editing ? 'Edit finding' : 'Add finding'}>
      <h3>{editing ? 'Edit finding' : 'Add finding'}</h3>
      {form.formError && <Alert variant="error">{form.formError}</Alert>}
      <div className="form-grid">
        <FormField as="select" label="Area" name="area" value={values.area} onChange={onChange} error={errors.area}>
          {AREAS.map((a) => <option key={a} value={a}>{categoryLabel(a)}</option>)}
        </FormField>
        <FormField as="select" label="Priority" name="priority" value={values.priority} onChange={onChange} error={errors.priority}>
          {['Low', 'Medium', 'High'].map((p) => <option key={p}>{p}</option>)}
        </FormField>
      </div>
      <FormField as="textarea" rows={2} label="Problem" name="problem" value={values.problem} onChange={onChange} error={errors.problem} />
      <div className="form-grid">
        <FormField label="Location / system" name="locationSystem" value={values.locationSystem} onChange={onChange} error={errors.locationSystem} />
        <FormField label="Suggested improvement" name="suggestedImprovement" value={values.suggestedImprovement} onChange={onChange} error={errors.suggestedImprovement} />
      </div>
      <FormField type="file" accept="image/jpeg,image/png" label="Photo (optional, JPG or PNG, max 5 MB)" onChange={pickPhoto} error={photoError || errors.photo} />
      {editing && initial.hasPhoto && (
        <label className="row small"><input type="checkbox" name="removePhoto" checked={values.removePhoto} onChange={(e) => form.setValues((v) => ({ ...v, removePhoto: e.target.checked }))} /> Remove the current photo</label>
      )}
      <div className="form-actions">
        <Button type="submit" disabled={form.submitting}>{form.submitting ? 'Saving…' : editing ? 'Save changes' : 'Add finding'}</Button>
        {onCancel && <Button variant="secondary" onClick={onCancel}>Cancel</Button>}
      </div>
    </form>
  );
}
