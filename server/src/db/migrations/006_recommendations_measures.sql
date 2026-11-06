-- 006: measures library (institution_id NULL = system preset) and recommendations.
CREATE TABLE measures_library (
  id                 bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  institution_id     bigint REFERENCES institutions (id) ON DELETE CASCADE,
  name               text NOT NULL CHECK (length(btrim(name)) > 0),
  category           text NOT NULL CHECK (category IN ('lighting','ac_ventilation','motors_pumps','ict','other','operating_hours','practices')),
  typical_saving_pct numeric NOT NULL CHECK (typical_saving_pct >= 0 AND typical_saving_pct <= 100),
  typical_cost       numeric NOT NULL CHECK (typical_cost >= 0),
  description        text
);
CREATE INDEX measures_inst_idx ON measures_library (institution_id);

CREATE TABLE recommendations (
  id                      bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  institution_id          bigint NOT NULL,
  building_id             bigint NOT NULL,
  finding_id              bigint,
  measure_id              bigint REFERENCES measures_library (id) ON DELETE SET NULL,
  title                   text NOT NULL CHECK (length(btrim(title)) > 0),
  estimated_cost          numeric NOT NULL CHECK (estimated_cost >= 0),
  estimated_annual_saving numeric NOT NULL CHECK (estimated_annual_saving >= 0),
  status                  text NOT NULL DEFAULT 'Proposed' CHECK (status IN ('Proposed','Accepted','Implemented')),
  -- savings are always estimates, never verified results
  is_estimate             boolean NOT NULL DEFAULT true CHECK (is_estimate = true),
  created_at              timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rec_building_fk FOREIGN KEY (institution_id, building_id)
    REFERENCES buildings (institution_id, id) ON DELETE CASCADE,
  -- PostgreSQL 15+: SET NULL on the finding column only (institution_id is NOT NULL)
  CONSTRAINT rec_finding_fk FOREIGN KEY (institution_id, finding_id)
    REFERENCES findings (institution_id, id) ON DELETE SET NULL (finding_id)
);
CREATE INDEX rec_inst_idx ON recommendations (institution_id, building_id);
