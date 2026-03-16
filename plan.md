# UniVerse Improvement Plan

A comprehensive plan for improving the UniVerse university events management app.

## Project Overview

UniVerse is a university events management app where:
- **Students** can find and book tickets to events, socialise, share moments, and find people to attend events with
- **Organisations** can create and manage events, and access the social tab to promote themselves

---

## 🔴 Critical / High Impact

### 1. Event Attendance Tracking
**Current gap:** Organisations can't see how many tickets have been booked for their events.
- Add ticket count display on organisation's event cards
- Show capacity/remaining spots on student event cards
- Add "fully booked" state when events reach capacity

### 2. Event Description Field
**Current gap:** `createEvent.tsx` has description in backend but no input field in frontend.
- Add a description textarea to the create event form
- Show description in event detail modals for students

### 3. Date/Time Filtering Improvements
**Current gap:** Filter is by day-of-week (Monday-Sunday) rather than actual dates.
- Change filter to show: "Today", "This Week", "This Month", "All"
- Add past/upcoming event toggle
- Show actual date ranges instead of generic day names

### 4. Hashtag Search Implementation
**Current gap:** Tapping a hashtag sets search query locally but doesn't filter by hashtag server-side.
- Implement hashtag search endpoint on backend
- Show posts tagged with specific hashtag across all users

---

## 🟡 Important Features

### 5. QR Code Scanner for Organisations ✅ COMPLETED
- Added `used` and `usedAt` fields to Ticket model
- Created `validateTicket` API endpoint for organisations
- Added `scanTickets.tsx` screen with camera integration
- Implemented QR code scanning via expo-camera
- Added manual ticket ID entry fallback
- Shows validation results (student info, event details)
- Tracks recent successful scans
- Fixed duplicate scan issue with ref-based debouncing
- Added event-specific validation: scanner checks ticket belongs to selected event
- Removed redundant Scan tab from bottom nav (now accessed via event modal)

### 6. Comments on Posts ✅ COMPLETED
- Added Comment model to Prisma schema
- Created comments API endpoints (GET, POST, DELETE)
- Added comment input and display on post detail screen
- Added comment count to PostCard and posts API

### 7. Event Categories/Tags
**Current gap:** No way to categorise events (music, sports, academic, social).
- Add category field to Event model
- Add category picker in create/edit event
- Add category filter in event feed

### 8. Notifications System
**Current gap:** Toggle exists in settings but does nothing.
- Implement push notifications for:
  - New events from followed organisations
  - Event reminders (1 day before, 1 hour before)
  - Likes/comments on your posts
  - Ticket confirmation
- **Note:** Push notifications require paid Apple Developer account

### 9. Stripe Payment Integration ✅ COMPLETED
- Added Stripe SDK to frontend (`@stripe/stripe-react-native`)
- Created backend payment intent endpoint (`/payments/create-intent`)
- Modified ticket creation to verify payment for paid events
- PaymentSheet UI for card payments (no Apple Pay/Google Pay)
- Test card support: `4242 4242 4242 4242`
- Added `paymentIntentId` to Ticket model for tracking

### 10. See Who's Attending
**Current gap:** Students can't see who else is going to an event.
- Add attendee list to event detail modal
- Allow students to see other attendees (privacy setting optional)

---

## 🟢 Nice to Have

### 11. Follow System ✅ COMPLETED
- Added Follow model to schema
- Follow/unfollow organisations and students
- Show followed organisations' events prominently
- Show followed users' posts in a prioritised feed

### 12. Calendar Integration
- Add "Add to Calendar" button on tickets
- Export event to Apple/Google Calendar

### 13. Event Sharing
- Share event deep links
- Share posts to other apps

### 14. Password Reset
**Current gap:** No forgot password functionality.
- Add password reset via email

### 15. Organisation Verification Badge
**Current gap:** Badge exists in UI but all organisations show it.
- Only show verified badge after admin approval
- Add admin verification workflow

### 16. Event Map Improvements
- Show multiple events on a single map view
- Add "Events Near Me" feature with location

### 17. Profile Enhancements
- Add bio/description field
- Show attended events count on student profiles
- Show upcoming events count on org profiles

---

## 🐛 Bug Fixes / Polish

| Issue | Location | Fix |
|-------|----------|-----|
| Notifications toggle non-functional | `profileStudentSettings.tsx` | Connect to notification preferences API |
| Description not shown to students | `EventFeed.tsx` modal | Add description to modal display |
| No loading state | Various | Add activity indicators during API calls |
| Day filter doesn't reflect actual dates | `FilterBar.tsx` | Use date range filtering |
| No pull-to-refresh | `createEvent.tsx` | Already has RefreshControl but does nothing useful |
| Static map image can fail | Static map API | Add fallback to "Open in Maps" only |

---

## 📊 Database Schema Additions Needed

```prisma
// Already implemented
model Comment {
  id        String   @id @default(uuid())
  content   String
  createdAt DateTime @default(now())
  postId    String
  userId    String
  post      Posts    @relation(fields: [postId], references: [id], onDelete: Cascade)

  @@index([postId])
  @@index([userId])
}

// Ticket model updated with validation tracking
model Ticket {
  id         String    @id @default(uuid())
  eventId    String
  studentId  String
  createdAt  DateTime  @default(now())
  used       Boolean   @default(false)  // Track if ticket has been scanned
  usedAt     DateTime?                   // When ticket was validated

  event      Event     @relation(fields: [eventId], references: [id], onDelete: Cascade)
  student    Student   @relation(fields: [studentId], references: [id], onDelete: Cascade)

  @@unique([studentId, eventId])
  @@index([eventId])
  @@index([studentId])
}

// Potential new models
model Follow {
  id          String   @id @default(uuid())
  followerId  String
  followingId String
  createdAt   DateTime @default(now())
}

model Notification {
  id        String   @id @default(uuid())
  type      String   // "EVENT_REMINDER", "NEW_FOLLOWER", etc.
  title     String
  body      String
  read      Boolean  @default(false)
  userId    String
  createdAt DateTime @default(now())
}
```

---

## 📋 Recommended Implementation Order

1. ~~Event description field~~ ✅
2. ~~Ticket count for organisations~~ ✅
3. ~~Date filtering improvements~~ ✅
4. ~~Hashtag search~~ ✅
5. ~~Event categories~~ ✅
6. ~~Comments on posts~~ ✅
7. ~~QR scanner for orgs~~ ✅ (completes ticket flow)
8. ~~Follow system~~ ✅
9. ~~Notifications system~~ ✅ (push notifications require paid Apple Developer account)
10. ~~Stripe payment integration~~ ✅
11. **Polish and remaining features**
