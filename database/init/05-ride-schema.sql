\connect ride_db

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE rides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_user_id UUID NOT NULL,
  driver_user_id UUID,
  status TEXT NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested', 'accepted', 'arriving', 'in_progress', 'completed', 'cancelled')),
  pickup_label TEXT NOT NULL,
  pickup_latitude DOUBLE PRECISION NOT NULL CHECK (pickup_latitude BETWEEN -90 AND 90),
  pickup_longitude DOUBLE PRECISION NOT NULL CHECK (pickup_longitude BETWEEN -180 AND 180),
  dropoff_label TEXT NOT NULL,
  dropoff_latitude DOUBLE PRECISION NOT NULL CHECK (dropoff_latitude BETWEEN -90 AND 90),
  dropoff_longitude DOUBLE PRECISION NOT NULL CHECK (dropoff_longitude BETWEEN -180 AND 180),
  fare_estimate NUMERIC(10, 2) NOT NULL CHECK (fare_estimate >= 0),
  currency CHAR(3) NOT NULL DEFAULT 'INR',
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX rides_customer_user_id_requested_at_idx ON rides(customer_user_id, requested_at DESC);
CREATE INDEX rides_driver_user_id_requested_at_idx ON rides(driver_user_id, requested_at DESC);
CREATE INDEX rides_status_requested_at_idx ON rides(status, requested_at);

CREATE TABLE ride_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by_user_id UUID,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ride_status_history_ride_id_created_at_idx
  ON ride_status_history(ride_id, created_at);

CREATE TABLE event_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregate_type TEXT NOT NULL,
  aggregate_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ
);

CREATE INDEX event_outbox_unpublished_idx ON event_outbox(created_at)
  WHERE published_at IS NULL;
