-- 003: monthly electricity records. month is always the first day of the month.
CREATE TABLE energy_records (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  institution_id bigint NOT NULL,
  building_id    bigint NOT NULL,
  month          date NOT NULL CHECK (EXTRACT(day FROM month) = 1),
  kwh            numeric NOT NULL CHECK (kwh >= 0),
  cost           numeric NOT NULL CHECK (cost >= 0),
  CONSTRAINT energy_building_month_key UNIQUE (building_id, month),
  -- composite FK: a row can never point at another institution's building
  CONSTRAINT energy_building_fk FOREIGN KEY (institution_id, building_id)
    REFERENCES buildings (institution_id, id) ON DELETE CASCADE
);
CREATE INDEX energy_inst_idx ON energy_records (institution_id, building_id);
