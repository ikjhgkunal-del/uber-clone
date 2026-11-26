BEGIN;
CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE IF NOT EXISTS auth.users (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 email TEXT NOT NULL UNIQUE CHECK (email = lower(email)),
 password_hash TEXT NOT NULL,
 role TEXT NOT NULL CHECK (role IN ('customer','driver')),
 status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMIT;
