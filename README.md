# Uber Clone

A simulated ride-hailing application built as a full-stack microservices project. Riders request simulated trips; drivers accept them and send simulated locations. No real-world transport or payment is involved.

## First evaluation scope

- Six independently runnable backend service projects
- PostgreSQL database ownership and initial schemas
- Redis for temporary driver presence/location state
- RabbitMQ for ride and payment events
- Docker Compose for local orchestration
- Nginx as the API gateway and WebSocket proxy
- Customer and driver roles in one authentication system

The first service implementations expose health endpoints and the Realtime Service exposes a basic WebSocket endpoint. Business workflows will be added in small increments.

## Prerequisites

- Node.js 22 or later and npm
- Git
- Docker Desktop for Windows, running with Linux containers enabled
- VS Code (or another editor)

Copy `.env.example` to `.env`. The sample passwords are for local development only. Then run:

```powershell
npm install
docker compose up --build
```

The gateway is available at `http://localhost:8080`. Its health endpoint is `http://localhost:8080/health`. RabbitMQ's local management UI is available at `http://localhost:15672` using the credentials from `.env`.

To build and type-check the service projects:

```powershell
npm run build
npm run typecheck
```

PostgreSQL initializes five service-owned databases when its data volume is first created. Initialization scripts run only for a fresh volume. For a clean local reinitialization, stop Compose and remove the `postgres_data` volume with `docker compose down -v`.

## Service routes

| Gateway path | Backend |
| --- | --- |
| `/api/auth/` | Authentication Service |
| `/api/customers/` | Customer Service |
| `/api/drivers/` | Driver Service |
| `/api/rides/` | Ride Service |
| `/api/payments/` | Payment Service |
| `/ws` | Realtime Service WebSocket |

See [docs/architecture.md](docs/architecture.md) and [docs/database-schema.md](docs/database-schema.md) for the initial design.
