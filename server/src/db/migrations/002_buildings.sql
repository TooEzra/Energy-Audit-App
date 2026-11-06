-- 002: buildings. UNIQUE (institution_id, id) is the target of the composite foreign keys on child tables.
CREATE TABLE buildings (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  institution_id  bigint NOT NULL REFERENCES institutions (id) ON DELETE CASCADE,
  name            text NOT NULL CHECK (length(btrim(name)) > 0),
  type            text NOT NULL CHECK (length(btrim(type)) > 0),
  floor_area_m2   numeric NOT NULL CHECK (floor_area_m2 > 0),
  operating_hours numeric NOT NULL CHECK (operating_hours >= 1 AND operating_hours <= 24),
  CONSTRAINT buildings_inst_name_key UNIQUE (institution_id, name),
  CONSTRAINT buildings_inst_id_key UNIQUE (institution_id, id)
);
