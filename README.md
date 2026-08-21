# ACG Support Market

A web-first **character support market** built with `Next.js`, `TypeScript`, `Tailwind`, `Prisma`, and `NextAuth`.

This MVP is intentionally **positive-only**:

- users buy and sell back support units against a system pool
- there is no shorting, no player-to-player order book, and no cash-out
- Bangumi-compatible metadata and `CC BY-SA` text must preserve attribution
- official art, voice, manga pages, and logos are not assumed reusable by default

## Stack

- `Next.js 16` App Router
- `TypeScript`
- `Tailwind CSS 4`
- `Prisma 7`
- `NextAuth`
- `Vitest`
- `PostgreSQL` via `docker-compose`

## Main surfaces

- `/` landing + featured characters
- `/market` browse and filter characters
- `/character/[slug]` character detail, attribute table, buy/sell, comments, reactions
- `/comfort` and `/comfort/[mode]` healing fandom rooms with sweet-talk, ASMR placeholders, and comic panels
- `/u/[handle]` public profile
- `/me` portfolio, rewards, cosmetics
- `/onboarding` sign-in and product intro
- `/help/market-rules` trust and rights policy
- `/admin` official-only publishing and Bangumi-aware import tools
- `/admin/content`, `/admin/imports`, `/admin/assets`, `/admin/shop` beta content operations

## Local setup with Docker

This path runs both the Next.js app and PostgreSQL in Docker.

1. Build and start the stack:

```bash
docker compose up --build
```

2. Open the app:

```text
http://localhost:3000
http://localhost:3000/?lang=cn
http://localhost:3000/market?lang=cn
http://localhost:3000/comfort
http://localhost:3000/me
```

3. Stop the stack:

```bash
docker compose down
```

4. Reset the local Docker database when you want a clean seed:

```bash
docker compose down -v
docker compose up --build
```

The Docker app service runs `prisma generate`, applies committed migrations, seeds the idempotent demo data, then starts `next dev` on `0.0.0.0:3000`. Demo login and demo admin access are enabled only by this local Compose configuration.

## Local setup without Docker app

1. Install dependencies:

```bash
npm install
```

2. Copy env file:

```bash
cp .env.example .env
```

3. Start only local Postgres:

```bash
docker compose up -d postgres
```

4. Generate Prisma client:

```bash
npm run prisma:generate
```

5. Apply committed migrations and seed the database:

```bash
npx prisma migrate deploy
npm run db:seed
```

6. Start the app:

```bash
npm run dev
```

## Scripts

- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run prisma:generate`
- `npm run db:push`
- `npm run db:seed`

## Notes on auth

- Google and email providers are ready once env vars are filled.
- A demo credentials provider is included so local development works immediately.
- `.env.example` and Render default `DEMO_MODE` and `DEMO_ADMIN_ENABLED` to `false`. Enable them only in a private local environment.
- Google login requires `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`. Add `https://YOUR-SERVICE.onrender.com/api/auth/callback/google` as an authorized redirect URI in Google Cloud.

## Notes on persistence

- The repository includes a full Prisma schema for the target production model.
- Runtime market, reward, shop, watchlist, comment, reaction, and comfort flows are backed by Prisma/Postgres.
- Production builds never push schema changes or seed data.
- Render applies committed Prisma migrations before starting Next.js. The deployment bootstrap seeds only an empty database; later restarts preserve user data and only synchronize approved media metadata.

## Render deployment

This repo includes `render.yaml` for a Render Node web service on `main`, following Render's full Next.js web-service path instead of a static export.

1. Connect the GitHub repo to Render as a Blueprint.
2. Use a Neon or other durable Postgres URL for `DATABASE_URL`; Render free Postgres expires after 30 days and is best kept for temporary tests.
3. Set `NEXTAUTH_URL` to the full Render URL or custom domain, such as `https://acg-polymarket.onrender.com`.
4. Populate `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, and `ADMIN_EMAILS`. Render generates `AUTH_SECRET` and `NEXTAUTH_SECRET` from the Blueprint.
5. Keep `DEMO_MODE=false`, `DEMO_ADMIN_ENABLED=false`, and `ADS_PROVIDER=mock` for the first public deployment.
6. Fill the `S3_*` values only when durable asset storage is connected. Render's local filesystem is ephemeral.

Render uses these lifecycle commands:

```text
Build: npm ci && npm run prisma:generate && npm run build
Start: npx prisma migrate deploy && npm run db:bootstrap && npm run start -- -H 0.0.0.0 -p $PORT
Initial deploy hook: npm run db:bootstrap
Health check: /api/health
```

The health endpoint performs a lightweight `SELECT 1`, returns `200` only when PostgreSQL is reachable, and returns `503` without exposing database errors otherwise. `db:bootstrap` checks for existing characters before seeding, so manual Docker services and Blueprint services can share the same safe startup path without resetting an initialized database.

## Content policy

- Bangumi may be used for metadata, tags, relations, and attributed `CC BY-SA` text.
- Imported text must keep source URL, license, and attribution markers.
- Assets cannot be published as `PUBLISHED` without a linked rights grant.

## Verification

The current repo passes:

- `npx prisma validate`
- `npx prisma migrate deploy`
- `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`

## Git workflow

- active branch: `main`
- remote backup: [Nickwong-kyoaka/ACG_Polymarket](https://github.com/Nickwong-kyoaka/ACG_Polymarket)
