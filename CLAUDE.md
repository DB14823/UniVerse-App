# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

UniVerse is a React Native social platform for university students and organisations. Students discover events, follow orgs, and interact via posts. Organisations manage events (including paid ticketing via Stripe).

## Monorepo Structure

```
SourceCode/
  backend/    # Node.js + Express + TypeScript + Prisma + PostgreSQL
  frontend/   # React Native + Expo (v54) + Expo Router
```

Always run backend and frontend commands from their respective subdirectories unless using root scripts.

## Key Commands

**Root (run from repo root):**
```
npm run install:all       # Install all dependencies (run after clone)
npm run env:init          # Copy .env.example → .env in both packages
npm run backend           # Start backend dev server
npm run frontend          # Start Expo dev server
npm run dev:tunnel        # Start backend + frontend together with tunnel
npm run frontend:tunnel   # Expo with tunnel (for physical devices/Codespaces)
```

**Backend (run from SourceCode/backend/):**
```
npm run prisma:migrate    # Run pending DB migrations
npm run prisma:generate   # Regenerate Prisma client after schema changes
npm run build             # Compile TypeScript to dist/
```

**Frontend (run from SourceCode/frontend/):**
```
npm run lint              # ESLint via Expo
```

## Environment Variables

**Backend (`SourceCode/backend/.env`):**
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — secret for token signing
- `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` — Stripe integration
- `PORT` — defaults to 3001

**Frontend (`SourceCode/frontend/.env`):**
- `EXPO_PUBLIC_API_URL` — base URL for backend API (required for all API calls)

Run `npm run env:init` from root to bootstrap `.env` files from `.env.example`.

## Architecture Notes

- **Expo Router**: File-based routing under `app/`. Subdirectories map directly to navigation routes. Moving files breaks navigation.
- **Auth**: JWT stored via `expo-secure-store`. Middleware in `SourceCode/backend/src/middleware/` validates tokens.
- **Image uploads**: Base64-encoded in JSON payloads (10 MB limit set in backend).
- **Stripe**: PaymentSheet integration for paid events. Use test card `4242 4242 4242 4242` in dev.
- **Prisma client**: Import from `SourceCode/backend/src/utils/prisma.ts`. Run `prisma:generate` after any schema change.
- **Role-based routing**: Users are either `STUDENT` or `ORGANISATION`. Screens under `Students/` and `Organisations/` are role-gated.

## Git Conventions

- Branch naming: `feature/xxx`, `fix/xxx`, `chore/xxx`
- Keep PRs focused; target `main`

## Deployment

- **Backend**: Hosted on Railway at `https://universe-app-production.up.railway.app`. Prisma migrations run automatically on startup (`start` script: `prisma migrate deploy && node dist/server.js`).
- **Database**: Railway-hosted PostgreSQL. Internal URL only works within Railway — use `DATABASE_PUBLIC_URL` for local access.
- **Frontend**: EAS preview builds distributed internally. `EXPO_PUBLIC_*` vars are baked into the JS bundle at build time — they must be set in `eas.json` under `build.preview.env`, NOT just in `.env` (which is gitignored and not uploaded to EAS).
- **OTA updates**: `npx eas update --branch preview --message "..."` — only works for JS changes. Requires `"channel": "preview"` in the `eas.json` preview profile or updates won't be received by the device.
- **Full rebuild required for**: new native packages, changes to `app.json`, changes to `eas.json` env vars.

## Migration Gotchas

- The Prisma schema has drifted ahead of migrations — several columns/tables were added without `prisma migrate dev` being run. When adding new schema fields, always create a migration immediately.
- University network blocks outbound PostgreSQL ports — run `prisma migrate dev` from home or use `prisma migrate deploy` via Railway's start script instead.
- When creating migrations manually (no DB access), use `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` and `CREATE TABLE IF NOT EXISTS` to make them idempotent.

## Frontend Notes

- Maps: uses `react-native-maps` with Apple Maps (no API key needed on iOS). Geocoding via Nominatim in `lib/staticMaps.ts`.
- Calendar: `lib/calendar.ts` prompts user to pick a calendar via Alert before adding events.
- `KeyboardAvoidingView` with `behavior="padding"` wraps ScrollViews on screens with TextInput to prevent keyboard overlap.

## Known Issues

- Notifications toggle UI exists but push notifications are non-functional end-to-end.
- Organisation verification badge shows for all orgs regardless of verified status.

## TypeScript

Both packages use strict TypeScript. Run `npx tsc --noEmit` in each package to check types without compiling. Use `/verify` to run lint + typecheck across the whole monorepo.
