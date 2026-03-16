# Phase 1 Completion Guide: Image Storage Migration to Cloudinary

## Overview
This guide walks you through completing the Cloudinary image storage migration.

## What's Been Done

✅ **Completed:**
1. Prisma schema updated to use String URLs instead of Bytes
2. Cloudinary service created (`src/services/imageUpload.ts`)
3. Image migration script created (`migrateImages.ts`)
4. All backend controllers updated:
   - `postsController.ts`
   - `eventsController.ts`
   - `auth.ts` routes
5. Cloudinary SDK installed

## What You Need To Do

### Step 1: Set Up Cloudinary Environment Variables

Add these to your backend `.env` file:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=your_api_key_here
CLOUDINARY_API_SECRET=your_api_secret_here
```

### Step 2: Run Database Migration

Since there's existing image data, we need to migrate carefully:

**Option A: Safe Migration (Recommended)**

1. Add new URL columns without dropping old columns:
```bash
cd SourceCode/backend
npx prisma migrate dev --name add_image_url_columns
```

2. Run the migration script to upload images to Cloudinary:
```bash
npx ts-node migrateImages.ts
```

3. Verify all images are migrated, then remove old columns:
```bash
npx prisma migrate dev --name remove_old_image_columns
```

**Option B: Fresh Database (Development Only)**

If you don't care about existing data:
```bash
cd SourceCode/backend
npx prisma migrate reset
```

### Step 3: Generate Prisma Client

```bash
cd SourceCode/backend
npx prisma generate
```

### Step 4: Update Frontend

The frontend needs to handle image URLs instead of base64. Update these files:

#### 1. `lib/postsApi.ts` - Update Post interface:
```typescript
export interface Post {
  id: string;
  caption: string;
  imageUrl: string;  // Changed from image/imageMimeType
  userId: string;
  username: string;
  userRole: "STUDENT" | "ORGANISATION";
  userAvatarUri?: string;  // Changed from base64
  createdAt: string;
  liked?: boolean;
  likeCount?: number;
}
```

#### 2. `app/components/socialFeed.tsx` - Update image rendering:
```typescript
// Replace base64 handling with direct URL usage
{post.imageUrl ? (
  <RNImage source={{ uri: post.imageUrl }} style={styles.mediaImage} />
) : (
  <Text style={styles.mediaLabel}>image</Text>
)}
```

#### 3. `app/Students/EventFeed.tsx` and `app/Organisations/eventsOrg.tsx`:
```typescript
// Update EventItem interface
type EventItem = {
  id: string;
  day: string;
  title: string;
  dateLabel: string;
  dateLabelDate: string;
  dateLabelTime: string;
  location: string;
  price: string;
  eventImageUrl: string | null;  // Changed from eventImage/eventImageMimeType
  mapLocation: string;
};

// Update image rendering
{ev.eventImageUrl ? (
  <Image source={{ uri: ev.eventImageUrl }} style={styles.eventImageFill} />
) : (
  <Text style={styles.eventImageText}>image</Text>
)}
```

#### 4. Profile Images:
Update all profile image displays to use `profileImageUrl` instead of base64:
```typescript
{user.profileImageUrl ? (
  <Image source={{ uri: user.profileImageUrl }} style={styles.profileImage} />
) : null}
```

### Step 5: Test the Application

1. Start the backend:
```bash
cd SourceCode/backend
npm run dev
```

2. Start the frontend:
```bash
cd SourceCode/frontend
npx expo start
```

3. Test these scenarios:
   - Create a new post with an image
   - View posts in the feed
   - Upload a profile image
   - Create/edit events with images
   - Delete posts/events (verify images are deleted from Cloudinary)

## Benefits of This Migration

✅ **Performance:**
- Images load faster with Cloudinary CDN
- Automatic image optimization (WebP, compression)
- Reduced database size (no more base64 storage)

✅ **Scalability:**
- Database won't grow with image data
- Bandwidth offloaded to Cloudinary CDN
- Can serve thousands of concurrent users

✅ **Features:**
- Automatic image resizing for different screen sizes
- Format optimization (WebP for modern browsers)
- Easy image transformations (thumbnails, filters)

## Troubleshooting

**Error: "CLOUDINARY_CLOUD_NAME is not defined"**
- Make sure environment variables are in backend `.env`
- Restart the backend server

**Images not displaying:**
- Check browser console for CORS errors
- Verify Cloudinary URLs are correct
- Check if images uploaded successfully in Cloudinary dashboard

**Migration script fails:**
- Verify database connection
- Check Cloudinary credentials
- Ensure all models have correct field names

## Next Steps

After completing this migration, you can proceed to **Phase 2** improvements:
- Fix TypeScript type augmentation
- Add global error handling
- Consolidate API client logic
- Refactor large components

## Need Help?

If you encounter issues:
1. Check the Cloudinary dashboard to see if images uploaded
2. Check backend logs for errors
3. Verify frontend is receiving correct URLs from API
4. Test with a fresh database if needed (development only)
