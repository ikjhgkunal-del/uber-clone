# Initial database schema

The SQL migrations are grouped by service under `database/migrations`. Local PostgreSQL uses one database (`uber_clone`) with separate schemas: `auth`, `users`, `drivers`, `rides`, and `payments`.

## Authentication Service

- `users`: email, password hash, account status, timestamps
- `roles`: `customer` and `driver`
- `permissions`: named capabilities
- `user_roles`: account-to-role assignment
- `role_permissions`: role-to-capability mapping

The initial role mappings distinguish customer actions (request rides and access owned rides) from driver actions (update availability and assigned rides). Passwords are stored as hashes.

## User Service

- `customer_profiles`: customer profile fields keyed by Authentication Service `user_id`
- `saved_locations`: customer-owned labels and coordinates
- `customer_preferences`: preference key/value records

## Driver Service

- `driver_profiles`: onboarding/profile data keyed by external `user_id`
- `vehicles`: vehicle details owned by a driver profile

Online availability and simulated coordinates are temporary Redis state.

## Ride Service

- `rides`: customer/driver external IDs, pickup/dropoff coordinates, fare estimate, current state and timestamps
- `ride_status_history`: append-only state transitions
- `event_outbox`: ride events committed with ride changes and published to Kafka

## Payment Service

- `payments`: external ride ID, amount, currency, simulated provider reference, status and timestamps

Payment status is independent of ride status. A completed ride can have a pending, succeeded or failed simulated payment.
