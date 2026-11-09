-- 009: allow many more buildings and a wider range of equipment categories.
-- (Drops and re-creates the inline CHECK constraints created by 001, 004 and 006.)

-- Building limit: 1..1000, new institutions default to 100. Institutions still on the old default of 5 are raised to 100.
ALTER TABLE institutions DROP CONSTRAINT institutions_max_buildings_check;
ALTER TABLE institutions ADD CONSTRAINT institutions_max_buildings_check CHECK (max_buildings BETWEEN 1 AND 1000);
ALTER TABLE institutions ALTER COLUMN max_buildings SET DEFAULT 100;
UPDATE institutions SET max_buildings = 100 WHERE max_buildings = 5;

-- Equipment categories: the original 5 plus 10 more. Keep this list in sync with server/src/validators/equipment.schema.js
-- and client/src/utils/formatters.js.
ALTER TABLE equipment DROP CONSTRAINT equipment_category_check;
ALTER TABLE equipment ADD CONSTRAINT equipment_category_check CHECK (category IN (
  'lighting','ac_ventilation','motors_pumps','ict','other',
  'refrigeration','water_heating','kitchen_catering','office_equipment','medical_lab',
  'laundry','lifts','audio_visual','workshop','security'));

-- Measures can target any equipment category, plus the two non-equipment areas.
ALTER TABLE measures_library DROP CONSTRAINT measures_library_category_check;
ALTER TABLE measures_library ADD CONSTRAINT measures_library_category_check CHECK (category IN (
  'lighting','ac_ventilation','motors_pumps','ict','other',
  'refrigeration','water_heating','kitchen_catering','office_equipment','medical_lab',
  'laundry','lifts','audio_visual','workshop','security',
  'operating_hours','practices'));
