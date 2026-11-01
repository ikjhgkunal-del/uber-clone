# Uber Clone

A simulated ride-hailing application organized as backend microservices. Customers request simulated trips; drivers accept trips and send simulated locations. No real-world transport or payment is involved.

## Backend layout

The backend contains seven services: Authentication, User, Driver, Ride, Payment, Realtime, and Notification. PostgreSQL stores durable records in service-owned schemas. Redis holds temporary driver presence/location data. Kafka carries ride and payment events. Nginx routes public HTTP and WebSocket traffic to the API services.

At this stage the services are scaffolds: each exposes health/readiness routes, and Realtime exposes a basic WebSocket handshake. Domain endpoints and event consumers will be added incrementally.

See [docs/architecture.md](docs/architecture.md) and [docs/database-schema.md](docs/database-schema.md).

## Prerequisites

- Node.js 22 or later and npm
- Git
- Docker Desktop for Windows, running with Linux containers enabled
- VS Code or another editor

Copy `.env.example` to `.env`, then run from the repository root:

```powershell
npm install
docker compose up --build
```

The web placeholder and API gateway are available at `http://localhost:8080`. Kafka is available to host tools at `localhost:9092`; backend containers use `kafka:19092`.

## Build and schema files

```powershell
npm run build
npm run typecheck
```

Initial PostgreSQL migrations are organized under `database/migrations`. They are mounted into the PostgreSQL container at `/migrations` and are not automatically applied yet. Each migration sets its service-owned schema (`auth`, `users`, `drivers`, `rides`, or `payments`).

For local schema setup, apply each SQL file from a PowerShell terminal with `docker compose exec -T postgres psql -v ON_ERROR_STOP=1 -U uber -d uber_clone -f /migrations/<service>/001_initial.sql`.

## Gateway routes

| Gateway path | Service |
| --- | --- |
| `/api/auth/` | Authentication Service |
| `/api/users/` | User Service |
| `/api/drivers/` | Driver Service |
| `/api/rides/` | Ride Service |
| `/api/payments/` | Payment Service |
| `/ws` | Realtime Service WebSocket |

Notification Service is an internal event consumer and has no public gateway route.
