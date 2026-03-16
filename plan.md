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

### 5. QR Code Scanner for Organisations
**Current gap:** Students have QR codes but organisations have no way to validate them.
- Add a "Scan Tickets" tab for organisations
- Use camera to scan student QR codes
- Mark tickets as "used" to prevent duplicate entry

### 6. Comments on Posts
**Current gap:** Only likes exist - no way to comment.
- Add Comment model to Prisma schema
- Create comments API endpoints
- Add comment input and display to posts

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

### 9. See Who's Attending
**Current gap:** Students can't see who else is going to an event.
- Add attendee list to event detail modal
- Allow students to see other attendees (privacy setting optional)

---

## 🟢 Nice to Have

### 10. Follow System
**Current gap:** No way to follow organisations or students.
- Add Follow model to schema
- Show followed organisations' events prominently
- Show followed users' posts in a prioritised feed

### 11. Calendar Integration
- Add "Add to Calendar" button on tickets
- Export event to Apple/Google Calendar

### 12. Event Sharing
- Share event deep links
- Share posts to other apps

### 13. Password Reset
**Current gap:** No forgot password functionality.
- Add password reset via email

### 14. Organisation Verification Badge
**Current gap:** Badge exists in UI but all organisations show it.
- Only show verified badge after admin approval
- Add admin verification workflow

### 15. Event Map Improvements
- Show multiple events on a single map view
- Add "Events Near Me" feature with location

### 16. Profile Enhancements
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
// Potential new models
model Comment {
  id        String   @id @default(uuid())
  content   String
  createdAt DateTime @default(now())
  postId    String
  userId    String
  post      Posts    @relation(...)
  user      Student  @relation(...) // or Organisation
}

model Follow {
  id          String   @id @default(uuid())
  followerId  String
  followingId String
  createdAt   DateTime @default(now())
}

model Category {
  id    String   @id @default(uuid())
  name  String   @unique
  events Event[]
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

1. **Event description field** (quick win, high visibility)
2. **Ticket count for organisations** (critical for event management)
3. **Date filtering improvements** (better UX)
4. **Hashtag search** (partially implemented, easy to complete)
5. **Event categories** (adds structure)
6. **Comments on posts** (increases engagement)
7. **QR scanner for orgs** (completes ticket flow)
8. **Notifications system** (significant work but high value)
9. **Follow system** (social features)
10. **Polish and remaining features**
