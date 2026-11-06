-- 001: institutions and users.
-- Helper used by every RLS policy and by INSERTs: reads the tenant id that withTenant() sets per transaction.
-- NULLIF guards against '' (what current_setting returns on a reused pooled connection after a transaction-local
-- set_config has ended) so an unset tenant yields NULL -> no rows, instead of a cast error.
CREATE FUNCTION app_institution_id() RETURNS bigint
  LANGUAGE sql STABLE
  AS $$ SELECT NULLIF(current_setting('app.institution_id', true), '')::bigint $$;

CREATE TABLE institutions (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name         text NOT NULL CHECK (length(btrim(name)) > 0),
  currency     char(3) NOT NULL DEFAULT 'KES',
  max_buildings integer NOT NULL DEFAULT 5 CHECK (max_buildings BETWEEN 1 AND 50),
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT institutions_name_key UNIQUE (name)
);

CREATE TABLE users (
  id                   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  institution_id       bigint NOT NULL REFERENCES institutions (id) ON DELETE CASCADE,
  name                 text NOT NULL CHECK (length(btrim(name)) > 0),
  email                text NOT NULL,
  password_hash        text NOT NULL,
  role                 text NOT NULL CHECK (role IN ('admin', 'auditor')),
  must_change_password boolean NOT NULL DEFAULT false,
  created_at           timestamptz NOT NULL DEFAULT now()
);
-- e-mail is unique across the whole system (case-insensitive) because login happens before the tenant is known.
CREATE UNIQUE INDEX users_email_unique ON users (lower(email));
CREATE INDEX users_institution_idx ON users (institution_id);
