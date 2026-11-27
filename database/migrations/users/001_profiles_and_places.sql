CREATE TABLE users.customer_profiles (
 user_id UUID PRIMARY KEY,
 display_name TEXT NOT NULL CHECK(length(trim(display_name)) BETWEEN 1 AND 100),
 phone_number TEXT NOT NULL DEFAULT '',
 version INTEGER NOT NULL DEFAULT 1,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE users.saved_locations (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES users.customer_profiles(user_id) ON DELETE CASCADE,
 kind TEXT NOT NULL CHECK(kind IN ('home','work','other')), label TEXT NOT NULL CHECK(length(trim(label)) BETWEEN 1 AND 60),
 address_text TEXT NOT NULL CHECK(length(trim(address_text)) BETWEEN 3 AND 300),
 latitude DOUBLE PRECISION NOT NULL CHECK(latitude BETWEEN -90 AND 90), longitude DOUBLE PRECISION NOT NULL CHECK(longitude BETWEEN -180 AND 180),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX saved_location_label_unique ON users.saved_locations(user_id,lower(label));
CREATE UNIQUE INDEX saved_location_kind_unique ON users.saved_locations(user_id,kind) WHERE kind IN ('home','work');
CREATE INDEX saved_location_owner_idx ON users.saved_locations(user_id);
CREATE TABLE users.customer_preferences (
 user_id UUID PRIMARY KEY REFERENCES users.customer_profiles(user_id) ON DELETE CASCADE,
 quiet_ride BOOLEAN NOT NULL DEFAULT false, cool_temperature BOOLEAN NOT NULL DEFAULT false,
 assistance_needed BOOLEAN NOT NULL DEFAULT false, version INTEGER NOT NULL DEFAULT 1, updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
