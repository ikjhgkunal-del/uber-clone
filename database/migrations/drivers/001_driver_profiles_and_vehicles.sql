CREATE TABLE drivers.driver_profiles (
  user_id uuid PRIMARY KEY,
  display_name varchar(80) NOT NULL,
  phone_number varchar(16) NOT NULL DEFAULT '',
  license_number varchar(32) NOT NULL DEFAULT '',
  license_expires date,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE drivers.vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES drivers.driver_profiles(user_id) ON DELETE CASCADE,
  make varchar(40) NOT NULL,
  model varchar(40) NOT NULL,
  color varchar(30) NOT NULL,
  plate varchar(16) NOT NULL UNIQUE,
  year integer NOT NULL CHECK (year BETWEEN 1990 AND 2100),
  seats integer NOT NULL CHECK (seats BETWEEN 1 AND 8),
  is_active boolean NOT NULL DEFAULT false,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX vehicles_owner ON drivers.vehicles(user_id);
CREATE UNIQUE INDEX one_active_vehicle ON drivers.vehicles(user_id) WHERE is_active;
