# Merch Shop — Backend

Official-licensed esports merch storefront backend. NestJS + Prisma/PostgreSQL, REST API (see [ADR-0007](docs/adr/0007-rest-over-graphql.md), [ADR-0014](docs/adr/0014-external-graphql-bff.md)).

For domain vocabulary and terminology, see [`CONTEXT.md`](CONTEXT.md). For architectural decisions, see [`docs/adr/`](docs/adr). For coding conventions, see [`CONVENTIONS.md`](CONVENTIONS.md).

## Setup

Requires Node 22, npm, and a running PostgreSQL instance (or Docker).

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL, JWT_SECRET, STRIPE_*, RESEND_*, etc.
```

Start Postgres via Docker (or point `DATABASE_URL` at your own instance):

```bash
docker compose up -d
```

Apply migrations and generate the Prisma client:

```bash
npm run prisma:migrate
```

Seed the first admin account (reads `ADMIN_EMAIL`/`ADMIN_PASSWORD` from `.env`):

```bash
npm run seed:admin
```

Run the API:

```bash
npm run start:dev
```

## Scripts

| Script | Purpose |
|---|---|
| `npm run start:dev` | Run the API with hot reload |
| `npm run build` | Compile to `dist/` |
| `npm run start` | Run the compiled build |
| `npm run lint` | ESLint over `src/` and `test/` |
| `npm test` | Unit tests (`*.spec.ts` under `src/`) |
| `npm run test:integration` | Integration tests (`*.integration.spec.ts` under `test/integration/`) — spins up Postgres via `docker-compose.test.yml` |
| `npm run test:coverage` | Unit tests with coverage report |
| `npm run prisma:migrate` | Apply migrations locally (dev) |
| `npm run prisma:migrate:deploy` | Apply migrations (CI/prod) |
| `npm run prisma:studio` | Open Prisma Studio |
| `npm run seed:admin` | Seed the first `ADMIN` account from env vars |
| `npm run seed:orders` | Seed sample orders (`prisma/seed-orders.ts`) |

## Testing

Integration tests need a live database. `test/integration/setup.ts` points `DATABASE_URL` at the Postgres instance defined in `docker-compose.test.yml` (port `5433`) and runs `prisma migrate deploy` before the suite:

```bash
docker compose -f docker-compose.test.yml up -d
npm run test:integration
```

See [`CONVENTIONS.md` §12](CONVENTIONS.md#12-testing) for when to add a unit spec vs. rely on integration coverage.
