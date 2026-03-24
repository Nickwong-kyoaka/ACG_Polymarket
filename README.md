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
- `/u/[handle]` public profile
- `/me` portfolio, rewards, cosmetics
- `/onboarding` sign-in and product intro
- `/help/market-rules` trust and rights policy
- `/admin` official-only publishing and Bangumi-aware import tools

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
- The MVP currently uses a seeded in-memory store for interactive demo behavior, which keeps the app usable before a real database layer is wired through every route.

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

- active branch prefix: `codex/`
- current implementation branch: `codex/mvp-bootstrap`
- remote backup: [Nickwong-kyoaka/ACG_Polymarket](https://github.com/Nickwong-kyoaka/ACG_Polymarket)
