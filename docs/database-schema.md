# Initial database schema

The SQL initialization scripts in `database/init` create one database per stateful service and its initial tables. PostgreSQL is shared as a local container; each service owns its database and schema changes.

## Authentication Service

- `users`: email, password hash, account status, timestamps
- `roles`: `customer` and `driver`
- `permissions`: named capabilities
- `user_roles`: account-to-role assignment
- `role_permissions`: role-to-capability mapping

Initial permissions distinguish customer actions (such as creating a ride and viewing/cancelling owned rides) from driver actions (such as updating availability and assigned rides). Passwords are stored only as hashes.

## Customer Service

- `customer_profiles`: customer-specific profile fields keyed by the Authentication Service's external `user_id`
- `saved_locations`: label and coordinates owned by a customer
- `customer_preferences`: preference key/value records

## Driver Service

- `driver_profiles`: onboarding/profile data keyed by external `user_id`
- `vehicles`: vehicle details owned by a driver profile

Current online status and simulated coordinates are temporary Redis data, not the durable source of driver identity/profile data.

## Ride Service

- `rides`: customer/driver external IDs, pickup/dropoff coordinates, fare estimate, currency, current state, timestamps
- `ride_status_history`: append-only state transitions
- `event_outbox`: ride events committed with ride changes and published to RabbitMQ by a worker

## Payment Service

- `payments`: external ride ID, amount, currency, simulated provider reference, status, timestamps

Payment status is independent of ride status. A completed ride can have a pending, succeeded, or failed simulated payment.
