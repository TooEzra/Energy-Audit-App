-- 004: equipment inventory.
CREATE TABLE equipment (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  institution_id bigint NOT NULL,
  building_id    bigint NOT NULL,
  category       text NOT NULL CHECK (category IN ('lighting','ac_ventilation','motors_pumps','ict','other')),
  name           text NOT NULL CHECK (length(btrim(name)) > 0),
  location       text,
  rating_w       numeric NOT NULL CHECK (rating_w > 0),
  qty            integer NOT NULL CHECK (qty > 0),
  hours_day      numeric NOT NULL CHECK (hours_day >= 0 AND hours_day <= 24),
  days_year      integer NOT NULL CHECK (days_year >= 0 AND days_year <= 366),
  condition      text,
  CONSTRAINT equipment_building_fk FOREIGN KEY (institution_id, building_id)
    REFERENCES buildings (institution_id, id) ON DELETE CASCADE
);
CREATE INDEX equipment_inst_idx ON equipment (institution_id, building_id);
