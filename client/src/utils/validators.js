// Client-side checks for fast feedback. They mirror the server's Zod rules; the SERVER is the authority.
const isBlank = (v) => v === undefined || v === null || String(v).trim() === '';
const num = (v) => (isBlank(v) ? NaN : Number(v));

export function validatePassword(pw) {
  if (isBlank(pw)) return 'Password is required';
  return String(pw).length < 8 ? 'Password must be at least 8 characters' : undefined;
}
export const validateEmail = (v) => (isBlank(v) ? 'E-mail is required' : /^\S+@\S+\.\S+$/.test(v) ? undefined : 'Enter a valid e-mail address');

const clean = (errors) => Object.fromEntries(Object.entries(errors).filter(([, v]) => v));

export function validateRegister(f) {
  return clean({
    institutionName: isBlank(f.institutionName) ? 'Institution name is required' : undefined,
    currency: /^[A-Za-z]{3}$/.test(f.currency || '') ? undefined : 'Use a 3-letter currency code',
    adminName: isBlank(f.adminName) ? 'Your name is required' : undefined,
    email: validateEmail(f.email),
    password: validatePassword(f.password),
    confirm: f.password !== f.confirm ? 'Passwords do not match' : undefined,
  });
}

export function validateBuilding(f) {
  const area = num(f.floorAreaM2), hours = num(f.operatingHours);
  return clean({
    name: isBlank(f.name) ? 'Name is required' : undefined,
    type: isBlank(f.type) ? 'Type is required' : undefined,
    floorAreaM2: !(area > 0) ? 'Floor area must be greater than 0' : undefined,
    operatingHours: !(hours >= 1 && hours <= 24) ? 'Operating hours must be between 1 and 24' : undefined,
  });
}

export function validateEnergy(f) {
  const kwh = num(f.kwh), cost = num(f.cost);
  return clean({
    month: /^\d{4}-(0[1-9]|1[0-2])$/.test(f.month || '') ? undefined : 'Choose a month',
    kwh: Number.isNaN(kwh) ? 'kWh is required' : kwh < 0 ? 'kWh cannot be negative' : undefined,
    cost: Number.isNaN(cost) ? 'Cost is required' : cost < 0 ? 'Cost cannot be negative' : undefined,
  });
}

export function validateEquipment(f) {
  const w = num(f.ratingW), q = num(f.qty), h = num(f.hoursDay), d = num(f.daysYear);
  return clean({
    name: isBlank(f.name) ? 'Name is required' : undefined,
    ratingW: !(w > 0) ? 'Rating must be greater than 0' : undefined,
    qty: !(q > 0 && Number.isInteger(q)) ? 'Quantity must be a whole number above 0' : undefined,
    hoursDay: !(h >= 0 && h <= 24) ? 'Hours per day must be 0 to 24' : undefined,
    daysYear: !(d >= 0 && d <= 366 && Number.isInteger(d)) ? 'Days per year must be 0 to 366' : undefined,
  });
}

export function validateFinding(f) {
  return clean({ problem: isBlank(f.problem) ? 'Problem is required' : undefined });
}

export function validateRecommendation(f) {
  const cost = num(f.estimatedCost), saving = num(f.estimatedAnnualSaving);
  return clean({
    title: isBlank(f.title) ? 'Title is required' : undefined,
    estimatedCost: Number.isNaN(cost) ? 'Cost is required' : cost < 0 ? 'Cost cannot be negative' : undefined,
    estimatedAnnualSaving: Number.isNaN(saving) ? 'Saving is required' : saving < 0 ? 'Saving cannot be negative' : undefined,
  });
}

export function validateUser(f) {
  return clean({
    name: isBlank(f.name) ? 'Name is required' : undefined,
    email: validateEmail(f.email),
    temporaryPassword: isBlank(f.temporaryPassword) ? undefined : validatePassword(f.temporaryPassword),
  });
}

export function validateSettings(f) {
  const n = num(f.maxBuildings);
  return clean({
    name: isBlank(f.name) ? 'Institution name is required' : undefined,
    currency: /^[A-Za-z]{3}$/.test(f.currency || '') ? undefined : 'Use a 3-letter currency code',
    maxBuildings: !(Number.isInteger(n) && n >= 1 && n <= 1000) ? 'Limit must be a whole number from 1 to 1000' : undefined,
  });
}
