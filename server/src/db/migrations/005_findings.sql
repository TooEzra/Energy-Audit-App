-- 005: audit checklist findings. UNIQUE (institution_id, id) lets recommendations reference a finding safely.
CREATE TABLE findings (
  id                   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  institution_id       bigint NOT NULL,
  building_id          bigint NOT NULL,
  area                 text NOT NULL CHECK (area IN ('lighting','ac_ventilation','motors_pumps','operating_hours','practices')),
  problem              text NOT NULL CHECK (length(btrim(problem)) > 0),
  location_system      text,
  suggested_improvement text,
  priority             text NOT NULL CHECK (priority IN ('Low','Medium','High')),
  photo_path           text,
  created_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT findings_inst_id_key UNIQUE (institution_id, id),
  CONSTRAINT findings_building_fk FOREIGN KEY (institution_id, building_id)
    REFERENCES buildings (institution_id, id) ON DELETE CASCADE
);
CREATE INDEX findings_inst_idx ON findings (institution_id, building_id);
