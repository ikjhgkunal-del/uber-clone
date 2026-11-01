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
