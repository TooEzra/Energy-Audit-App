import FormField from '../ui/FormField.jsx';

export default function BuildingSelector({ buildings, value, onChange, label = 'Building' }) {
  return (
    <FormField as="select" label={label} value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
      {buildings.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
    </FormField>
  );
}
