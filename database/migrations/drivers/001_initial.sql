CREATE SCHEMA IF NOT EXISTS drivers;
SET search_path TO drivers, public;

CREATE TABLE driver_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  license_number TEXT UNIQUE,
  onboarding_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (onboarding_status IN ('pending', 'approved', 'rejected', 'suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES driver_profiles(id) ON DELETE CASCADE,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  color TEXT NOT NULL,
  plate_number TEXT NOT NULL UNIQUE,
  seat_count SMALLINT NOT NULL DEFAULT 4 CHECK (seat_count BETWEEN 1 AND 12),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX vehicles_driver_id_idx ON vehicles(driver_id);
