# Uber Clone

A simulated ride-hailing application with seven backend services, a React frontend, PostgreSQL, Redis, Kafka and an Nginx API gateway.

## Project conventions

Follow Uber's public web UI as the visual reference throughout the project: black navigation, white surfaces, gray inputs, restrained typography and responsive layouts. Keep the independent simulator identity visible. Implement actual flows rather than decorative controls. Customer is the backend role; passenger is its frontend label. Driver is the other supported role.

Work in small increments. The project owner reviews, commits and pushes changes; do not run Git commits or pushes unless requested.

Every page must adapt to mobile, tablet and desktop viewports. Build fluid layouts with CSS breakpoints based on available space, support portrait and landscape orientations, and prevent unintended horizontal scrolling. Navigation, forms, maps and dialogs must remain usable with touch and keyboard input. Use readable text, accessible labels and adequately sized touch targets. Check each new feature at mobile and desktop sizes before calling it complete. Keep backend APIs independent of the web layout so a future mobile app can reuse them; the current deliverable is a responsive website.

## Start locally

Requirements: Node.js 22+, npm, Git, Docker Desktop with Linux containers.

1. Copy `.env.example` to `.env` if it does not exist. Preserve an existing `.env`.
2. Set a unique `POSTGRES_PASSWORD`, matching `DATABASE_URL` (`postgres://uber:<URL-encoded-password>@postgres:5432/uber_clone`) and a random `JWT_SECRET` of at least 32 characters. Keep these only in the ignored root `.env`.
3. Run `npm ci` at the root and `npm ci` inside `frontend` for local development.
4. Run `docker compose up -d --build` at the root.
5. Open http://localhost:8080. Local verification and recovery emails appear at http://localhost:8025 (Mailpit); they are not sent to real email addresses.

Auth migrations are versioned and applied automatically at auth startup using a PostgreSQL advisory lock. Existing local data is preserved. The Kafka initializer gives the broker ownership of its named volume, then exits. Kafka itself runs as its unprivileged application user.

For frontend hot reload, run `npm run dev` inside `frontend` and open http://localhost:5173. `/api` is proxied to Nginx. The default email and OAuth return URL is port 8080; change `APP_URL` and `GOOGLE_REDIRECT_URI` consistently if using port 5173 exclusively.

## Authentication

Implemented features:

- Passenger and driver registration with name, normalized unique email and validated passwords.
- Salted scrypt password hashes and timing-safe password verification.
- Staged email/password login, remember-me sessions, password visibility, loading and error states.
- Fifteen-minute access JWTs held only in browser memory.
- Database-backed rotating refresh tokens stored as hashes; an HttpOnly, SameSite cookie retains the browser session.
- Server-side logout revokes the session immediately for this service.
- Email verification and resend; verification status appears on the account page.
- Password recovery via expiring single-use email links. Reset/change password revokes every session for that account.
- Role-protected routes and account views. Auth checks the active database session and account role on protected requests.
- Optional Google OAuth code flow with PKCE, state/nonce checks, server-side ID-token verification and provider-subject identity records.
- Request validation, size limits, rate limits, custom-header/origin CSRF protection, no-store responses and sensitive log redaction.

New accounts may access the account/security screen before verifying their email. Email verification must be required on future booking/driver business endpoints. Passenger profiles now live in the User Service; driver onboarding belongs to the next increment.

Google credentials are intentionally empty. A password account with the same email is not silently linked to a Google identity: use the password sign-in for that existing account. Account linking, phone OTP, Apple sign-in, MFA and real driver onboarding are not implemented.

## Google sign-in setup

1. Open https://console.cloud.google.com/ and select or create a project for this simulator.
2. Open **Google Auth Platform** (or **APIs & Services → OAuth consent screen**). Configure Branding with your app name and support contact. Use a simulator/project name rather than representing it as the official Uber service.
3. Configure Audience as External when appropriate. While testing, add the Google accounts that will test your app under Test users.
4. In Clients, create an OAuth client with application type **Web application**.
5. Set Authorized JavaScript origins to `http://localhost:8080` (optionally also `http://localhost:5173` for Vite development).
6. Add the exact Authorized redirect URI: `http://localhost:8080/api/auth/google/callback`.
7. Add the generated client ID and client secret to the ignored root `.env` as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. Set `GOOGLE_REDIRECT_URI` to the exact URI above. Never put the secret in a `VITE_` variable or commit it.
8. Run `docker compose up -d --force-recreate auth-service`. Reload the login page; Continue with Google becomes enabled.
9. Test using an allowed Google test account. The first Google registration uses the role selected on the registration page (login defaults to passenger). Returning accounts keep their existing role.

Reference: https://developers.google.com/identity/protocols/oauth2/web-server

## API routes

All listed paths have `/api/auth` as the gateway prefix. Mutating requests require `X-Requested-With: uber-clone`; requests with an Origin must match `CORS_ORIGIN`.

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/register` | Register name/email/password/role |
| POST | `/login` | Login with optional remember flag |
| POST | `/refresh` | Rotate the HttpOnly refresh session |
| POST | `/logout` | Revoke the current browser session |
| GET | `/me` | Fetch the authenticated account |
| POST | `/forgot-password` | Request a reset email; generic response |
| POST | `/reset-password` | Consume reset token and set password |
| POST | `/verify-email` | Consume email verification token |
| POST | `/resend-verification` | Resend to authenticated account |
| POST | `/change-password` | Verify current password and replace it |
| GET | `/access/customer`, `/access/driver` | Exercise role authorization |
| GET | `/config` | Public provider availability, no secrets |
| GET | `/google/start`, `/google/callback` | Google authorization redirect flow |

## Checks

With local PostgreSQL and Mailpit running and the root `.env` configured:

```powershell
npm run build
npm run test:auth
npm run test:auth:gateway
npm run test:user
npm --prefix frontend run build
npm --prefix frontend run lint
```

Integration tests exercise both roles, duplicate registration, hashing, verification, single-use recovery tokens, password changes, refresh rotation, session revocation/expiry, CSRF rejection and login rate limiting. Test accounts are deleted afterwards. The gateway check requires the running stack at port 8080. Live Google login requires credentials and user interaction; it is not exercised by these tests.

For public deployment, use HTTPS, `COOKIE_SECURE=true`, the deployed origin/redirect URLs, a real SMTP provider and properly restricted database accounts. Current Compose is a local evaluation stack; Mailpit and single-node Kafka are for local use. Do not commit `.env`, tokens, credentials or private keys.

## Lower resource development

The default Compose stack runs PostgreSQL, Authentication, User Service, the static frontend, Nginx and Mailpit. Other services and their images remain available under the `full` profile.

```powershell
# Daily passenger development (6 containers)
docker compose up -d
# Full stack when working on ride/event features
docker compose --profile full up -d
# Stop optional services without deleting data
docker compose --profile full stop driver-service ride-service payment-service realtime-service notification-service redis kafka
# Stop the project when finished (preserves database volumes)
docker compose --profile full stop
```

Inactive service routes resolve at request time so Nginx can start without those services. They become available when the full profile runs. Node runtime images install only the selected service's production dependencies; TypeScript and development tools stay in the build stage. Kafka uses a small development JVM heap (128–256 MiB); increase it for future load testing.

Build only the component you changed, for example `docker compose up -d --build auth-service`. Avoid rebuilding all services on every edit. Docker images occupy disk; stopping unused containers is the direct way to reduce runtime memory. No volumes need to be deleted.

For WSL memory retained after builds, Docker recommends WSL `autoMemoryReclaim`. A global WSL memory limit affects every WSL distribution; configure it separately after considering other workloads. Do not shut WSL down during an active login or database operation.

## Frontend libraries and assets

Use `lucide-react` for interface icons throughout the project, with named imports so only used icons are bundled. Use consistent SVG sizing/stroke widths and accessible labels on icon buttons. Prefer established libraries for standard behavior, selecting dependencies that fit the feature and resource budget.

Brand marks remain separate from interface icons: the local Uber SVG wordmark is sourced from Simple Icons (`siUber`, installed as a development dependency), and the Google sign-in mark is a reusable multicolor SVG component. Do not use emoji or text arrows in place of UI icons. Maintain the Uber reference layout and reusable components as new pages are implemented.

## Passenger accounts (User Service)

Passengers land at `/passenger` after signing in. Overview, personal details, saved places, ride preferences and security are responsive on desktop and mobile. Saved places support a map or manual latitude/longitude; no device location permission is requested. Preferences are stored for future ride matching; rides themselves are not implemented yet.

The `users` schema owns `customer_profiles`, `saved_locations` and `customer_preferences` in the local `uber_clone` database. Auth owns identity/email; User Service validates active sessions through Auth's HTTP API and accepts only the customer role. The identity UUID is an external reference, with no cross-service foreign key or direct reads of Auth tables. Profiles initialize idempotently on first access. Versioned migrations run at startup and preserve existing data. Profile/preference versions prevent stale updates; saved-place queries enforce ownership and transactional limits (20 total, one Home and one Work).

All endpoints below use the gateway prefix `/api/users`, a Bearer access token and the same mutation header/origin policy as authentication:

| Method | Path | Purpose |
| --- | --- | --- |
| GET / PUT | `/me` | Read/update display name and optional international phone number |
| GET / POST | `/me/places` | List/create saved places |
| PUT / DELETE | `/me/places/:id` | Edit/remove an owned place |
| GET / PUT | `/me/preferences` | Read/update ride preferences |

Phone numbers are explicitly unverified. Email changes remain outside this component. Radix Dialog supplies modal focus trapping, Escape and accessibility; React Leaflet/Leaflet supplies maps, loaded only when needed. OpenStreetMap attribution is visible, with a tile-request referrer policy supporting its usage policy. `VITE_MAP_TILE_URL` may select another compatible tile provider; production deployments must follow their provider's terms/capacity limits.

`npm run test:user` exercises PostgreSQL persistence, real Auth session introspection, RBAC, ownership, validation, stale versions, CSRF and concurrent saved-place limits using disposable local fixtures. Build Auth first with `npm run build`. The tests require Auth/gateway and local PostgreSQL running; fixtures never send SMTP email.
