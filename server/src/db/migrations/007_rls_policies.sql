-- 007: Row-level security + privileges.
-- The app connects as energy_app (no SUPERUSER, no BYPASSRLS). The migration owner owns the tables.
-- FORCE makes the policies apply to the table owner as well, so only superusers / BYPASSRLS roles skip them.

GRANT USAGE ON SCHEMA public TO energy_app, energy_definer;
GRANT SELECT, INSERT, UPDATE, DELETE ON
  institutions, users, buildings, energy_records, equipment, findings, measures_library, recommendations
  TO energy_app, energy_definer;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO energy_definer;
GRANT EXECUTE ON FUNCTION app_institution_id() TO energy_app, energy_definer;

-- Tenant tables: one policy covering SELECT/INSERT/UPDATE/DELETE, both USING and WITH CHECK.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['users','buildings','energy_records','equipment','findings','recommendations'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING (institution_id = app_institution_id()) WITH CHECK (institution_id = app_institution_id())', t);
  END LOOP;
END $$;

-- institutions: a tenant sees only its own row (the id IS the tenant id).
ALTER TABLE institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE institutions FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON institutions
  USING (id = app_institution_id()) WITH CHECK (id = app_institution_id());

-- measures_library: everyone reads system presets (institution_id IS NULL) + own rows; writes only to own rows.
ALTER TABLE measures_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE measures_library FORCE ROW LEVEL SECURITY;
CREATE POLICY measures_read ON measures_library FOR SELECT
  USING (institution_id IS NULL OR institution_id = app_institution_id());
CREATE POLICY measures_insert ON measures_library FOR INSERT
  WITH CHECK (institution_id = app_institution_id());
CREATE POLICY measures_update ON measures_library FOR UPDATE
  USING (institution_id = app_institution_id()) WITH CHECK (institution_id = app_institution_id());
CREATE POLICY measures_delete ON measures_library FOR DELETE
  USING (institution_id = app_institution_id());
