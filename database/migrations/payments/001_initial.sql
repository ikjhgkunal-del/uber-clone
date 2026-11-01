CREATE SCHEMA IF NOT EXISTS payments;
SET search_path TO payments, public;

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID NOT NULL UNIQUE,
  customer_user_id UUID NOT NULL,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
  currency CHAR(3) NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
  provider_reference TEXT UNIQUE,
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX payments_customer_user_id_created_at_idx
  ON payments(customer_user_id, created_at DESC);
