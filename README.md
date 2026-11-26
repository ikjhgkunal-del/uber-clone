# Uber Clone

A simulated ride-hailing application organized as backend microservices.

## Backend layout

The backend is divided into Authentication, User, Driver, Ride, Payment, Realtime, and Notification services. PostgreSQL, Redis, Kafka, and Nginx are configured through Docker Compose.

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

The API gateway is available at `http://localhost:8080`. Kafka is available to host tools at `localhost:9092`; backend containers use `kafka:19092`.

## Build and schema files

```powershell
npm run build
npm run typecheck
```

Database migrations and seed data will be added incrementally under their service folders.

## Authentication increment

The Authentication Service now supports `POST /register`, `POST /login`, `GET /me`, and role-protected `GET /access/customer` and `GET /access/driver`. Gateway paths have the `/api/auth` prefix. Registration accepts `email`, a password of 12–128 characters, and `role` (`customer` or `driver`). Passenger is the UI label for customer.

Passwords use salted scrypt hashes. Signed access tokens expire after 15 minutes. The frontend keeps the token in memory; refreshing or signing out clears the local session. Refresh tokens, server-side logout/revocation, driver approval, and authorization in the remaining services are future increments.

Set a random `JWT_SECRET` of at least 32 characters in the ignored root `.env`. Start PostgreSQL with `docker compose up -d postgres`, then apply the auth migration:

```powershell
docker compose exec -T postgres psql -v ON_ERROR_STOP=1 -U uber -d uber_clone -f /migrations/auth/001_initial.sql
```

The full backend stack can be started with `docker compose up --build`. In another terminal, run `npm install` and `npm run dev` inside `frontend`. Vite proxies `/api` to the gateway at port 8080. The auth schema migration is currently applied manually; automatic versioned migration execution is pending.
