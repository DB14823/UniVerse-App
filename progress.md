# UniVerse Progress Tracker

## Current Status

**Branch:** `main`
**Last updated:** March 16, 2026

---

## Next Steps

### Short Term
1. Implement comments on posts
2. Add QR code scanner for organisations

### Medium Term
1. Build notifications system
2. Date filtering improvements (Today/This Week/This Month)

---

## Recently Completed

- ✅ Hashtag search endpoint (server-side filtering)
- ✅ Event categories with picker and filter
- ✅ Ticket counts for organisation events
- ✅ Merged frontend into main repo (removed submodule)
- ✅ Cleaned up project documentation

---

## Known Issues to Address

1. **Notifications toggle** - UI exists but non-functional
2. **Organisation verification** - All orgs show badge regardless of status
3. **Static maps** - Can fail silently, needs better fallback

---

## Key Decisions Made

### Architecture
- **Expo Router** for navigation with file-based routing
- **Prisma ORM** with PostgreSQL database
- **Cloudinary** for image storage
- Separate navigation flows for Students vs Organisations

### Styling
- Custom `colours.ts` theme file with space/cosmic aesthetic
- Consistent spacing and border radius scales
- Glass-morphism effects with rgba backgrounds

### Authentication
- JWT tokens stored in SecureStore
- Auto-login on app launch if valid token exists
- Role-based routing (STUDENT vs ORGANISATION)

### Social Features
- Posts have likes (many-to-many via Like model)
- Hashtags parsed from captions with regex, server-side search supported
- Profile navigation respects viewer role

### Events
- Categories: Music, Sports, Academic, Social, Career, Workshop, Other
- Filter by category server-side

---

## Active Areas of Code

### Frontend Structure
```
SourceCode/frontend/app/
├── auth/           # Login/Register screens
├── Students/       # Student-specific screens
├── Organisations/  # Organisation-specific screens
├── post/           # Post detail view
├── components/     # Shared components
└── contexts/       # React contexts (Posts, Tickets)
```

### Backend Structure
```
SourceCode/backend/src/
├── controllers/    # Route handlers
├── routes/         # API endpoints
├── middleware/     # Auth, role checks
├── services/       # Image upload
└── utils/          # Prisma client
```

---

## Environment Setup Notes

### iOS Development
- Open `ios/frontend.xcworkspace` (not .xcodeproj)
- Configure signing with Apple ID in Xcode
- Trust developer profile on device after first install

### Backend
- Requires `.env` with `DATABASE_URL`, `JWT_SECRET`, Cloudinary keys
- Run `npx prisma generate` after schema changes
- Restart server after controller changes
