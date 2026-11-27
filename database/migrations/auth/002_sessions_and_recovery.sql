ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS display_name TEXT NOT NULL DEFAULT '';
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE auth.users ALTER COLUMN password_hash DROP NOT NULL;
CREATE TABLE IF NOT EXISTS auth.sessions (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 refresh_hash TEXT NOT NULL UNIQUE, expires_at TIMESTAMPTZ NOT NULL, revoked_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON auth.sessions(user_id);
CREATE TABLE IF NOT EXISTS auth.email_tokens (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 token_hash TEXT NOT NULL UNIQUE, purpose TEXT NOT NULL CHECK(purpose IN ('verify','reset')),
 expires_at TIMESTAMPTZ NOT NULL, used_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS auth.oauth_accounts (
 provider TEXT NOT NULL, subject TEXT NOT NULL, user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 PRIMARY KEY(provider,subject), UNIQUE(provider,user_id)
);
