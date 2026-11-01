CREATE SCHEMA IF NOT EXISTS auth;
SET search_path TO auth, public;

CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_key TEXT NOT NULL UNIQUE CHECK (role_key IN ('customer', 'driver')),
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'locked', 'disabled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  permission_key TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL
);

CREATE TABLE user_roles (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE role_permissions (
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

INSERT INTO roles (role_key, display_name) VALUES
  ('customer', 'Customer'),
  ('driver', 'Driver');

INSERT INTO permissions (permission_key, description) VALUES
  ('customer:profile:read-own', 'Read the signed-in customer profile'),
  ('customer:profile:update-own', 'Update the signed-in customer profile'),
  ('ride:create', 'Request a ride as a customer'),
  ('ride:read-own', 'Read rides associated with the signed-in user'),
  ('ride:cancel-own', 'Cancel an eligible ride owned by the signed-in customer'),
  ('driver:profile:read-own', 'Read the signed-in driver profile'),
  ('driver:availability:update-own', 'Set the signed-in driver availability'),
  ('ride:accept-assigned', 'Accept an offered ride as the assigned driver'),
  ('ride:status:update-assigned', 'Update an assigned ride status');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r CROSS JOIN permissions p
WHERE r.role_key = 'customer'
  AND p.permission_key IN (
    'customer:profile:read-own', 'customer:profile:update-own',
    'ride:create', 'ride:read-own', 'ride:cancel-own'
  );

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r CROSS JOIN permissions p
WHERE r.role_key = 'driver'
  AND p.permission_key IN (
    'driver:profile:read-own', 'driver:availability:update-own',
    'ride:read-own', 'ride:accept-assigned', 'ride:status:update-assigned'
  );
