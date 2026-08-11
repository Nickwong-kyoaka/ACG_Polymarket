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

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Copy env file:

```bash
cp .env.example .env
```

3. Start local Postgres:

```bash
docker compose up -d
```

4. Generate Prisma client:

```bash
npm run prisma:generate
```

5. Start the app:

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

## Notes on persistence

- The repository includes a full Prisma schema for the target production model.
- Runtime market, reward, shop, watchlist, comment, reaction, and comfort flows are backed by Prisma/Postgres.
- Render runs `npm run db:push` and `npm run db:seed` during the beta build so free web services can sync the external Neon/Postgres database.

## Render deployment

This repo includes `render.yaml` for a Render Node web service on `main`, following Render's full Next.js web-service path instead of a static export.

1. Connect the GitHub repo to Render as a Blueprint.
2. Use a Neon or other durable Postgres URL for `DATABASE_URL`; Render's free Postgres is useful for temporary tests but not durable long-term.
3. Set `NEXTAUTH_URL` to the Render public URL or custom domain, and keep `AUTH_SECRET` and `NEXTAUTH_SECRET` populated with long random secrets.
4. Leave `ADS_PROVIDER=mock` until Google ads are approved, then fill `GOOGLE_AD_CLIENT`.
5. Fill the `S3_*` values only when asset upload storage is connected.

The Render service builds with `npm ci && npm run prisma:generate && npm run db:push && npm run db:seed && npm run build`, starts with `npm run start -- -H 0.0.0.0 -p $PORT`, and auto-deploys from `main` after GitHub checks pass.

## Content policy

- Bangumi may be used for metadata, tags, relations, and attributed `CC BY-SA` text.
- Imported text must keep source URL, license, and attribution markers.
- Assets cannot be published as `PUBLISHED` without a linked rights grant.

## Verification

The current repo passes:

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`

## Git workflow

- active branch: `main`
- remote backup: [Nickwong-kyoaka/ACG_Polymarket](https://github.com/Nickwong-kyoaka/ACG_Polymarket)
