# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

UniVerse is a React Native social platform for university students and organisations. Students discover events, follow orgs, and interact via posts. Organisations manage events (including paid ticketing via Stripe).

**Commercial status (2026-05-09):** Won best project at uni showcase. IP is retained by the founders and the app is being taken forward as a real commercial product. The name "UniVerse" is legally blocked (UK trademark conflict, Apple App Store rejected). A rebrand is in progress — see naming research in memory. Do not assume the app will continue to be called UniVerse.

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
- **Auth**: JWT stored via `expo-secure-store` under key `"authToken"`. Student ID stored under key `"userId"`. Middleware in `SourceCode/backend/src/middleware/` validates tokens.
- **Image uploads**: Base64-encoded in JSON payloads (10 MB limit set in backend).
- **Stripe**: PaymentSheet integration for paid events. Use test card `4242 4242 4242 4242` in dev.
- **Prisma client**: Import from `SourceCode/backend/src/utils/prisma.ts`. Run `prisma:generate` after any schema change.
- **Role-based routing**: Users are either `STUDENT` or `ORGANISATION`. Screens under `Students/` and `Organisations/` are role-gated.
- **Role middleware**: The export from `SourceCode/backend/src/middleware/roleMiddleware.ts` is named `requireRole` (not `roleMiddleware`). Usage: `requireRole("STUDENT")`.
- **Socket.io**: Integrated into Express via `http.createServer(app)` in `server.ts`. Real-time DMs use private rooms per student (`room:<studentId>`). Socket server at `SourceCode/backend/src/socket/index.ts` — exports `initSocket(httpServer)` and singleton `io`. JWT auth on handshake via `socket.handshake.auth.token`.
- **Direct Messages**: Students-only, mutual follow required to initiate. Conversation uniqueness enforced via canonical UUID pair ordering (`a < b ? [a, b] : [b, a]`). REST routes at `/messages/*` (requires auth + `requireRole("STUDENT")`). Client emits: `send_message`, `typing`, `react_message`. Server emits: `new_message`, `typing`, `message_reaction`. Push notification fallback when recipient socket room is empty.
  - **Entry point**: Message button appears on student profiles only when the viewer mutually follows the subject (`isFollowing && isFollowedBack`). Not shown to org viewers. Calls `POST /messages/conversations` (getOrCreateConversation) then navigates to conversation screen.
  - **Conversation list**: `GET /messages/conversations` filters to conversations with `messages: { some: {} }` — empty conversations (created on button tap before any message is sent) are never shown in the list.
  - **`checkFollowing` return shape**: `GET /follow/check/:targetId` now returns `{ isFollowing: boolean, isFollowedBack: boolean }`. The frontend `checkFollowing()` in `lib/followApi.ts` returns this object — do NOT treat it as a plain boolean. Both `profileStudent.tsx` and `profileOrg.tsx` destructure `.isFollowing`.
  - **Conversation navigation**: the screen accepts a `backPath` param. `"messages"` → `router.replace("/Students/messages")`; `"profile"` or absent → `router.back()`. Always pass `backPath` when navigating to conversation.
  - **Real-time badge**: `Students/_layout.tsx` subscribes to socket `new_message` events and calls `refreshUnread()` unless `pathname.includes("conversation")`. Tab bar hides via `display: "none"` on the overlay when on the conversation screen.

## Git Conventions

- Branch naming: `feature/xxx`, `fix/xxx`, `chore/xxx`
- Keep PRs focused; target `main`
- Remote `origin` → `https://github.com/DB14823/UniVerse-App.git` (personal repo — always push here)
- Remote `upstream` → Plymouth University template repo (ignore, do not push)

## Deployment

- **Backend**: Hosted on Railway at `https://universe-app-production.up.railway.app`. Prisma migrations run automatically on startup (`start` script: `prisma migrate deploy && node dist/server.js`).
- **Database**: Railway-hosted PostgreSQL. Internal URL only works within Railway — use `DATABASE_PUBLIC_URL` for local access.
- **Frontend**: EAS preview builds distributed internally. `EXPO_PUBLIC_*` vars are baked into the JS bundle at build time — they must be set in `eas.json` under `build.preview.env`, NOT just in `.env` (which is gitignored and not uploaded to EAS).
- **OTA updates**: `npx eas update --branch preview --message "..."` — only works for JS changes. Requires `"channel": "preview"` in the `eas.json` preview profile or updates won't be received by the device.
- **Full rebuild required for**: new native packages, changes to `app.json`, changes to `eas.json` env vars, any changes to Swift files in `modules/`.

## Migration Gotchas

- The Prisma schema has drifted ahead of migrations — several columns/tables were added without `prisma migrate dev` being run. When adding new schema fields, always create a migration immediately.
- University network blocks outbound PostgreSQL ports — run `prisma migrate dev` from home or use `prisma migrate deploy` via Railway's start script instead.
- When creating migrations manually (no DB access), use `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` and `CREATE TABLE IF NOT EXISTS` to make them idempotent.

## Frontend Notes

- Maps: uses `react-native-maps` with Apple Maps (no API key needed on iOS). Geocoding via Nominatim in `lib/staticMaps.ts`.
- Calendar: `lib/calendar.ts` prompts user to pick a calendar via Alert before adding events.
- `KeyboardAvoidingView` with `behavior="padding"` wraps ScrollViews on screens with TextInput to prevent keyboard overlap.
- **Colour theme**: tokens are `textPrimary`, `textSecondary`, `textMuted`, `textAccent`, `primary`, `surface`, `background`, `border`. There is no `colours.text` — use `colours.textPrimary`.
- **Socket singleton**: `app/hooks/useSocket.ts` — `useSocket()` mounts the connection (call in `_layout.tsx`); `getSocket()` lets screens emit events without re-subscribing. Module-level singleton pattern with `active = false` cleanup for React Strict Mode safety.
- **Chat pagination**: `conversation.tsx` uses `onScroll` with `contentOffset.y < 80` + `scrollEventThrottle={200}` to detect scroll-to-top and load older messages. Do NOT use `onEndReached` — it fires at the bottom (newest messages) of a non-inverted list, which is the wrong end for loading history.
- **Push token registration**: `registerForPushNotifications()` in `lib/notifications.ts` always calls the backend on every app launch — there is no local cache guard. Do NOT re-add the `if (cached !== token)` check. The backend handles duplicate registrations efficiently, and the cache previously caused silent failures when the Railway DB lost push token records.
- **Native modules**: A local Expo native module lives in `SourceCode/frontend/modules/`. Each module has a `.podspec` and is linked via a `file:` entry in `package.json`. Swift source changes require an EAS rebuild — they cannot OTA. For iteration before EAS, open `ios/UniVerse.xcworkspace` in Xcode and build locally.
  - `modules/liquid-glass-tab-bar/` — iOS 26 liquid glass floating pill tab bar. **Shipped.** Rendered as absolute-position overlay in layout (not via `tabBar` prop) to avoid React Navigation background injection.
  - `modules/haptic-feedback/` — **Shipped.** Function module. `impactAsync(style)` + `notificationAsync(type)` wrapping `UIImpactFeedbackGenerator` / `UINotificationFeedbackGenerator`. Fired on: like toggle (medium), send message (light), feed pull-to-refresh (success), ticket purchase (success).
  - `modules/share-sheet/` — **Shipped.** Function module. `shareAsync({ message?, url? })` via `UIActivityViewController`. Triggered from PostCard "···" options button.
  - `modules/native-image-picker/` — **Shipped.** Function module. `pickImageAsync()` via `PHPickerViewController`. Returns `{ canceled, uri }` where `uri` is a `file://` path. Replaces `expo-image-picker` (gallery) and `react-native-image-crop-picker` across all create/settings screens. **Note:** `PHPickerViewController` does not require a permission request — it handles access internally. Camera (`takePhoto`) still uses `expo-image-picker`.
  - `modules/native-action-sheet/` — **Shipped.** Function module. `showActionSheetAsync({ title?, message?, options, cancelButtonIndex, destructiveButtonIndex? })` via `UIAlertController` action sheet. Returns `{ buttonIndex }`. Used in PostCard "···" menu (share post / cancel).
  - `modules/liquid-glass-surface/` — **Shipped.** View module. Generic `ExpoView` that renders `UIGlassEffect` (iOS 26) / `UIBlurEffect` fallback behind any React Native children. Prop: `cornerRadius: number`. Use for any floating glass container in JS. Cannot use RN's `borderRadius` style — `UIVisualEffectView` must be clipped by its own layer via the native `cornerRadius` prop.
  - **Native module gotchas (burns hours if wrong):**
    - `expo-module.config.json` must declare `"platforms": ["apple"]` not `"ios"` — autolinking uses `--platform apple` and silently skips anything else.
    - The `.podspec` **must live inside the `ios/` subdirectory** — `use_expo_modules!` only scans one level into subdirectories, never the package root.
    - After adding a new module, run `pod install` then verify with `grep "YourModule" "ios/Pods/Target Support Files/Pods-UniVerse/ExpoModulesProvider.swift"` before rebuilding.
    - `UIBlurEffect` / `UIGlassEffect` views sample whatever UIView is behind them. React Navigation inserts opaque white ancestor views — override `didMoveToSuperview()` in your `ExpoView` and walk up clearing `backgroundColor = .clear`.
    - **Always present from `topViewController`, not `rootViewController`** — in a React Navigation app, `rootViewController` already has the nav stack as a `presentedViewController`. UIKit silently drops `present()` calls on a VC that already has something presented. Use a recursive helper: nav → `visibleViewController`, tab → `selectedViewController`, otherwise → `presentedViewController`, fallback = base. Both `native-image-picker` and `native-action-sheet` use this pattern.
    - **SourceKit false positives**: `No such module 'UIKit'` / `'ExpoModulesCore'` in native Swift files when SourceKit runs outside Xcode. Safe to ignore — Xcode compiles these correctly.
  - **Floating tab bar pattern**: use `tabBarStyle: { display: "none" }` and render the component as a `position: absolute, bottom: 0` overlay in a wrapping `View`. This prevents React Navigation from reserving space or injecting backgrounds.
  - **Tab bar visibility scoping**: hidden on detail/task screens via `HIDE_TAB_BAR_SCREENS` constant array at the top of each `_layout.tsx`. Add a pathname substring there to hide the bar on a new screen. Currently hidden in Students: `conversation`, `createPost`, `profileStudent`, `profileOrg`, `profileStudentSettings`, `notifications`. In Orgs: `createPost`, `profileOrg`, `profileStudent`, `profileOrgSettings`, `scanTickets`.
  - **Safe area on screens without the tab bar**: use `edges={["top","bottom"]}` on `SafeAreaView`. Do not add manual `paddingBottom` for the tab bar — `edges={["bottom"]}` handles the home indicator correctly on its own.
  - **SF Symbol fill variants**: `calendar.fill` and `person.3.fill` do not exist — use `calendar.circle.fill` and `person.3.sequence.fill`.
  - **Tab bar animation**: the active highlight uses a `highlightAnimating: Bool` flag in Swift. `layoutSubviews` skips `positionActiveHighlight` while this flag is set, preventing it from cancelling the spring animation mid-flight. Do not remove this guard.

## Known Issues

- Push notifications are fully functional end-to-end (APNs key configured, cron reminders, follow/like/comment/booking triggers). Requires EAS preview build — local Xcode builds lack the `aps-environment` entitlement.
- Organisation verification badge shows for all orgs regardless of verified status — `Organisation` model has no `verified` boolean; needs a migration and real badge logic.
- **Existing student accounts have `name: "Student"`** in the DB — a leftover dev placeholder that was hardcoded in the registration form. The code is fixed, but existing rows need a one-off SQL fix on Railway: `UPDATE "Student" SET name = NULL WHERE name = 'Student';`

## Production Readiness — Outstanding Issues

Issues identified 2026-05-09. Fix before onboarding real users.

### 🔴 Critical

- **No rate limiting** — auth endpoints (`/auth/login-student`, `/auth/login-org`) have no brute-force protection. Add `express-rate-limit` (e.g. 10 attempts / 15 min / IP).
- **CORS wide open** — `app.use(cors())` in `server.ts` allows all origins. Lock down to actual app domains before production.
- **No email domain validation** — any email can register as a student. For a multi-university commercial product, enforce a configurable domain allowlist on `/auth/register-student` rather than hardcoding `.ac.uk`.
- **No input validation** — post captions, event titles, comments have no server-side length limits. Add max-length checks to prevent abuse.
- **Login errors leak user existence** — `"Student not found"` and `"Invalid password"` are separate responses; both should return generic `"Invalid credentials"` to prevent email enumeration.

### 🟡 Important

- **No password strength enforcement** — any string is accepted. Add minimum length (8+ chars) before `bcrypt.hash`.
- **No token revocation** — stolen JWTs are valid for 7 days with no way to invalidate. Add a refresh token flow or Redis-backed blocklist.
- **Base64 image uploads won't scale** — 10MB JSON body limit works but is inefficient (base64 adds ~33% overhead). Cloudinary is in use for image storage but the frontend still sends base64 to the backend which then uploads to Cloudinary. Move to signed Cloudinary direct uploads from the client to remove the base64 overhead.
- **No `helmet` middleware** — add `helmet()` to `server.ts` for standard security headers (`X-Frame-Options`, CSP, etc.). One-liner.
- **Stripe still in test mode** — swap to live Stripe keys before taking real payments; test full payment flow end-to-end with a real card first.

### 🟢 Before wider rollout

- **Privacy policy and Terms of Service** — legally required before App Store listing and real payments.
- **GDPR data export** — `DELETE /auth/me` exists but users need a data export endpoint too. Surface the deletion option clearly in UI settings.
- **Verified org badge** — see Known Issues above; needs `verified` field migration and admin flow to grant verification.

## TypeScript

Both packages use strict TypeScript. Run `npx tsc --noEmit` in each package to check types without compiling. Use `/verify` to run lint + typecheck across the whole monorepo.
