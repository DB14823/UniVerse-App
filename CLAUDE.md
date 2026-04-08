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
- **Prisma client**: Import from `SourceCode/backend/src/utils/prismaClient.ts`. Run `prisma:generate` after any schema change.
- **Role-based routing**: Users are either `STUDENT` or `ORGANISATION`. Screens under `Students/` and `Organisations/` are role-gated.

## Git Conventions

- Branch naming: `feature/xxx`, `fix/xxx`, `chore/xxx`
- Keep PRs focused; target `main`

## Known Issues

- Notifications toggle UI exists but push notifications are non-functional end-to-end.
- Organisation verification badge shows for all orgs regardless of verified status.
- Static map component can fail silently — needs a fallback.

## TypeScript

Both packages use strict TypeScript. Run `npx tsc --noEmit` in each package to check types without compiling. Use `/verify` to run lint + typecheck across the whole monorepo.
