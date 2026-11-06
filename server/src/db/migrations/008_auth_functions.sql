-- 008: login and sign-up run before a tenant is known. Instead of weakening the policies, they go through
-- SECURITY DEFINER functions owned by energy_definer (a NOLOGIN role with BYPASSRLS). Each function does one
-- narrow job: look up one user by e-mail / create one institution with its first admin.

CREATE FUNCTION auth_lookup(p_email text)
RETURNS TABLE (user_id bigint, institution_id bigint, name text, email text, password_hash text,
               role text, must_change_password boolean, institution_name text, currency char(3), max_buildings integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT u.id, u.institution_id, u.name, u.email, u.password_hash, u.role, u.must_change_password,
         i.name, i.currency, i.max_buildings
  FROM users u JOIN institutions i ON i.id = u.institution_id
  WHERE lower(u.email) = lower(p_email)
$$;

CREATE FUNCTION register_institution(p_name text, p_currency text, p_admin_name text, p_email text, p_password_hash text)
RETURNS TABLE (institution_id bigint, user_id bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE v_inst bigint; v_user bigint;
BEGIN
  INSERT INTO institutions (name, currency) VALUES (btrim(p_name), upper(p_currency)) RETURNING id INTO v_inst;
  INSERT INTO users (institution_id, name, email, password_hash, role, must_change_password)
    VALUES (v_inst, btrim(p_admin_name), lower(btrim(p_email)), p_password_hash, 'admin', false) RETURNING id INTO v_user;
  RETURN QUERY SELECT v_inst, v_user;
END $$;

ALTER FUNCTION auth_lookup(text) OWNER TO energy_definer;
ALTER FUNCTION register_institution(text, text, text, text, text) OWNER TO energy_definer;
REVOKE ALL ON FUNCTION auth_lookup(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION register_institution(text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION auth_lookup(text), register_institution(text, text, text, text, text) TO energy_app;
