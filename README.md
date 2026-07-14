# Epic FHIR Ingest Service

A Node.js (TypeScript) backend that authenticates to the **Epic FHIR sandbox** using SMART Backend Services (JWT), fetches **Patient** and **Appointment** resources, resolves **Practitioner** and **Location** references, and persists data to **PostgreSQL**.

## Features

- SMART Backend Services OAuth2 (RS384 JWT client assertion)
- FHIR R4 reads with pagination (`Bundle.link` `next`)
- Reference resolution for Practitioner and Location
- PostgreSQL upserts (`ON CONFLICT`) to avoid duplicates on re-ingest
- REST API for health checks, ingest, and paginated reads
- Docker Compose setup (app + PostgreSQL)
- Unit tests for FHIR mapping and health endpoint

## Prerequisites

- Node.js 20+
- Docker & Docker Compose (optional, recommended)
- Epic developer portal access: https://fhir.epic.com/

## Epic App Setup (Backend Services)

1. Sign in at https://fhir.epic.com/ with your sandbox credentials (do **not** commit these).
2. Create a new app:
   - **Application Audience**: Backend Systems
   - **Incoming APIs**: FHIR R4
   - **Application Type**: Confidential (Backend Services)
3. Request these scopes:
   - `system/Patient.read`
   - `system/Appointment.read`
   - `system/Practitioner.read`
   - `system/Location.read`
4. Generate an RSA key pair locally:

```bash
npm run generate-keys
```

This creates `keys/private.pem` and `keys/public.pem`.

5. Upload `keys/public.pem` to your Epic app registration.
6. Copy the **Non-Production Client ID** into your `.env` file.

> **Note:** Epic sandbox configuration can take time to propagate (sometimes up to 24 hours). JWT `exp` must be no more than 5 minutes in the future.

## Local Setup

```bash
cp .env.example .env
# Edit .env with your EPIC_CLIENT_ID and key path

npm install
npm run migrate
npm run dev
```

## Docker Setup

```bash
cp .env.example .env
# Edit .env with Epic credentials

docker compose up --build
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | `{ "status": "ok" }` |
| POST | `/ingest` | Fetch from Epic and upsert into PostgreSQL |
| GET | `/patients?page=1&limit=20` | Paginated patients |
| GET | `/appointments?page=1&limit=20` | Paginated appointments with joined names |

### Example

```bash
curl http://localhost:4000/health
curl -X POST http://localhost:4000/ingest
curl "http://localhost:4000/patients?page=1&limit=10"
curl "http://localhost:4000/appointments?page=1&limit=10"
```

## Database Schema

Tables: `patients`, `providers`, `locations`, `appointments`

- All `ehr_id` columns are **UNIQUE**
- Upserts use `ON CONFLICT (ehr_id) DO UPDATE`
- Appointments join patients/providers/locations for display names

Schema file: `src/db/schema.sql`

## Assumptions & Notes

- Uses **SMART Backend Services** (JWT) because this is a server-to-server ingest job with no user interaction.
- Patient phone is taken from `Patient.telecom` where `system='phone'`.
- Provider name comes from `Practitioner.name`; location name from `Location.name`.
- Appointment participants are scanned for `Patient/`, `Practitioner/`, and `Location/` references.
- FHIR requests retry on transient failures with configurable timeout/backoff.
- Secrets live in `.env` only; never commit credentials or private keys.

## Tests

```bash
npm test
```

## Project Structure

```
src/
  config.ts           # Environment configuration
  index.ts            # Express app entrypoint
  db/                 # PostgreSQL pool, schema, migrations
  epic/               # Auth, FHIR client, types, mappers
  routes/             # REST route handlers
  services/           # Ingest orchestration
  utils/              # Logging
tests/                # Jest tests
scripts/              # Key generation helper
```

## Troubleshooting

| Issue | Suggestion |
|-------|------------|
| `invalid_client` from Epic | Verify client ID, public key upload, and JWT `exp` ≤ 5 min |
| Empty patient/appointment results | Sandbox data varies; try again after Epic app approval |
| DB connection errors | Ensure PostgreSQL is running and `DATABASE_URL` is correct |

## License

ISC
