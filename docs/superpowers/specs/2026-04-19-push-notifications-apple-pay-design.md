# Design: Push Notifications & Apple Pay
**Date:** 2026-04-19  
**Status:** Approved

---

## Overview

Two features unlocked by the paid Apple Developer account:

1. **Push Notifications** — real end-to-end APNs delivery via Expo Notifications, replacing the existing stub
2. **Apple Pay** — native PassKit payment sheet replacing Stripe's PaymentSheet UI, with Stripe still processing payments on the backend

---

## 1. Push Notifications

### Architecture

Expo Notifications abstracts APNs. The backend already uses Expo's push API (`https://exp.host/--/api/v2/push/send`) and expects Expo push tokens — no backend transport changes needed.

### Token Registration

- At app launch in `_layout.tsx`, call `registerForPushNotifications()` from `lib/notifications.ts`
- Request permission via `expo-notifications`
- Fetch token via `getExpoPushTokenAsync({ projectId: <expo-project-id> })`
- POST token to backend `/notifications/register-token`
- Cache token in SecureStore to avoid re-registering on every launch (only register if token has changed)

### lib/notifications.ts (replacing stub)

Full implementation with:
- `registerForPushNotifications()` — permission + token fetch + backend registration
- `unregisterForPushNotifications()` — DELETE token from backend + SecureStore
- `setupNotificationListeners()` — foreground notification handler + response handler (tap to navigate)
- `getCurrentPushToken()` — reads from SecureStore
- `clearNotificationBadge()` — calls `setBadgeCountAsync(0)`
- `scheduleLocalNotification()` — via `scheduleNotificationAsync`

### Notification Triggers (backend wiring)

| Event | Controller | Recipient | Type |
|-------|-----------|-----------|------|
| Org creates event | `eventsController` | All followers | `NEW_EVENT` |
| Student/org follows user | `followController` | Followed user | `NEW_FOLLOWER` |
| Student likes a post | `postController` | Post author | `POST_LIKE` |
| Student comments on post | `postController` | Post author | `POST_COMMENT` |
| Student books ticket | `ticketsController` | Org that owns event | `TICKET_CONFIRMED` |

`notifyFollowersOfNewEvent` already exists in `services/notifications.ts` — just needs calling from `eventsController`. The other triggers need `sendNotificationToUser` calls added to their respective controllers.

### Event Reminders (backend cron)

- Install `node-cron` on the backend
- New file: `src/jobs/eventReminders.ts`
- Cron runs every 15 minutes
- Queries events where `date` is within 25h–23h (1-day reminder) or 75min–45min (1-hour reminder)
- For each event, finds all ticket holders and calls `sendNotificationToUser`
- New Prisma model `EventReminder` tracks sent reminders to prevent duplicates:

```prisma
model EventReminder {
  id           String   @id @default(uuid())
  eventId      String
  reminderType String   // "ONE_DAY" | "ONE_HOUR"
  sentAt       DateTime @default(now())
  event        Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)

  @@unique([eventId, reminderType])
}
```

- Cron job started in `src/index.ts` at server boot

### Settings Toggle

- `profileStudentSettings.tsx` already has a notifications toggle UI
- Wire it to `PATCH /notifications/preferences` endpoint (already exists in backend)
- Toggle reads/writes `notificationsEnabled` on the Student model

### Notification Types Summary

**Students receive:**
- `NEW_EVENT` — followed org posted a new event
- `NEW_FOLLOWER` — someone followed them
- `POST_LIKE` — someone liked their post
- `POST_COMMENT` — someone commented on their post
- `EVENT_REMINDER_ONE_DAY` — event they have a ticket to is tomorrow
- `EVENT_REMINDER_ONE_HOUR` — event they have a ticket to is in ~1 hour

**Organisations receive:**
- `NEW_FOLLOWER` — someone followed them
- `TICKET_CONFIRMED` — a student booked a ticket to their event

---

## 2. Apple Pay (Native PassKit + Stripe Backend)

### Architecture

`@stripe/stripe-react-native` (already installed) exposes a `useApplePay` hook that triggers the native iOS Apple Pay sheet (PassKit) directly. Stripe receives the payment token transparently — the backend PaymentIntent endpoint is unchanged.

### Apple Developer Configuration

1. Register Merchant ID in Apple Developer Console: `merchant.com.universe.app` (or similar)
2. Add entitlement to `app.json`:
```json
{
  "ios": {
    "entitlements": {
      "com.apple.developer.in-app-payments": ["merchant.com.universe.app"]
    }
  }
}
```
3. Pass `merchantIdentifier` to `StripeProvider` in `_layout.tsx`

### Frontend Payment Flow

Replace `presentPaymentSheet()` with:

1. Check `isApplePaySupported` (false on Android, simulators without Apple Pay configured)
2. If supported: call `presentApplePay({ cartItems, country: "GB", currency: "gbp" })`
3. In the `onPaymentMethodCreate` callback: call `confirmApplePayPayment(clientSecret)`
4. If not supported: fall back to existing `presentPaymentSheet()` flow

The booking button label changes: "Pay with Apple Pay" when supported, "Pay £X.XX" otherwise.

### Backend

No changes required. The PaymentIntent creation endpoint (`POST /payments/create-intent`) remains identical — Stripe handles the Apple Pay token server-side transparently.

### Fallback

- Android: existing Stripe PaymentSheet
- iOS Simulator (no Apple Pay): existing Stripe PaymentSheet
- Physical iOS device with Apple Pay: native sheet

---

## Testing

### Push Notifications
- Physical device required for end-to-end testing (simulator cannot receive APNs)
- Expo Go supports push notifications with `experienceId` set correctly
- Test each trigger manually (follow, like, comment, book ticket, create event)
- Verify reminders don't fire twice (check `EventReminder` table)

### Apple Pay
- Physical device required for Apple Pay (simulator cannot use real cards)
- Use Stripe test environment — Apple Pay in test mode accepts any card added to Wallet
- Verify fallback renders correctly on simulator

---

## Files Affected

### Frontend
- `lib/notifications.ts` — replace stub with full implementation
- `app/_layout.tsx` — call `registerForPushNotifications` + `setupNotificationListeners` at launch
- `app/Students/profileStudentSettings.tsx` — wire notifications toggle
- Ticket booking screen — replace PaymentSheet with `useApplePay` + fallback
- `app/_layout.tsx` — add `merchantIdentifier` to `StripeProvider`

### Backend
- `src/controllers/eventsController.ts` — call `notifyFollowersOfNewEvent`
- `src/controllers/followController.ts` — add `NEW_FOLLOWER` notification
- `src/controllers/postController.ts` — add `POST_LIKE` and `POST_COMMENT` notifications
- `src/controllers/ticketsController.ts` — add `TICKET_BOOKED` notification to org
- `src/jobs/eventReminders.ts` — new cron job file
- `src/index.ts` — start cron job at boot
- `prisma/schema.prisma` — add `EventReminder` model
- `package.json` — add `node-cron` dependency
