import prisma from './src/utils/prisma';
import { uploadImage } from './src/services/imageUpload';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function migrateImages() {
  console.log('Starting image migration to Cloudinary...\n');

  try {
    // Migrate Student profile images
    console.log('Migrating Student profile images...');
    const students = await prisma.student.findMany({
      where: {
        profileImage: { not: null },
      },
    });

    for (const student of students) {
      if (student.profileImage && student.profileImageMimeType) {
        try {
          const base64 = student.profileImage.toString('base64');
          const dataUri = `data:${student.profileImageMimeType};base64,${base64}`;

          const result = await uploadImage(dataUri, 'universe/profiles');

          await prisma.student.update({
            where: { id: student.id },
            data: {
              profileImageUrl: result.url,
              profileImage: null,
              profileImageMimeType: null,
            },
          });

          console.log(`✓ Migrated profile image for student: ${student.username}`);
        } catch (error) {
          console.error(`✗ Failed to migrate profile for ${student.username}:`, error);
        }
      }
    }

    // Migrate Organisation profile images
    console.log('\nMigrating Organisation profile images...');
    const organisations = await prisma.organisation.findMany({
      where: {
        profileImage: { not: null },
      },
    });

    for (const org of organisations) {
      if (org.profileImage && org.profileImageMimeType) {
        try {
          const base64 = org.profileImage.toString('base64');
          const dataUri = `data:${org.profileImageMimeType};base64,${base64}`;

          const result = await uploadImage(dataUri, 'universe/profiles');

          await prisma.organisation.update({
            where: { id: org.id },
            data: {
              profileImageUrl: result.url,
              profileImage: null,
              profileImageMimeType: null,
            },
          });

          console.log(`✓ Migrated profile image for organisation: ${org.name}`);
        } catch (error) {
          console.error(`✗ Failed to migrate profile for ${org.name}:`, error);
        }
      }
    }

    // Migrate Organisation evidence images
    console.log('\nMigrating Organisation evidence images...');
    const orgsWithEvidence = await prisma.organisation.findMany({
      where: {
        evidenceImage: { not: null },
      },
    });

    for (const org of orgsWithEvidence) {
      if (org.evidenceImage && org.evidenceImageMimeType) {
        try {
          const base64 = org.evidenceImage.toString('base64');
          const dataUri = `data:${org.evidenceImageMimeType};base64,${base64}`;

          const result = await uploadImage(dataUri, 'universe/evidence');

          await prisma.organisation.update({
            where: { id: org.id },
            data: {
              evidenceImageUrl: result.url,
              evidenceImage: null,
              evidenceImageMimeType: null,
            },
          });

          console.log(`✓ Migrated evidence image for organisation: ${org.name}`);
        } catch (error) {
          console.error(`✗ Failed to migrate evidence for ${org.name}:`, error);
        }
      }
    }

    // Migrate Event images
    console.log('\nMigrating Event images...');
    const events = await prisma.event.findMany({
      where: {
        eventImage: { not: null },
      },
    });

    for (const event of events) {
      if (event.eventImage && event.eventImageMimeType) {
        try {
          const base64 = event.eventImage.toString('base64');
          const dataUri = `data:${event.eventImageMimeType};base64,${base64}`;

          const result = await uploadImage(dataUri, 'universe/events');

          await prisma.event.update({
            where: { id: event.id },
            data: {
              eventImageUrl: result.url,
              eventImage: null,
              eventImageMimeType: null,
            },
          });

          console.log(`✓ Migrated image for event: ${event.title}`);
        } catch (error) {
          console.error(`✗ Failed to migrate image for ${event.title}:`, error);
        }
      }
    }

    // Migrate Post images
    console.log('\nMigrating Post images...');
    const posts = await prisma.posts.findMany();

    for (const post of posts) {
      if (post.image && post.imageMimeType) {
        try {
          const base64 = post.image.toString('base64');
          const dataUri = `data:${post.imageMimeType};base64,${base64}`;

          const result = await uploadImage(dataUri, 'universe/posts');

          await prisma.posts.update({
            where: { id: post.id },
            data: {
              imageUrl: result.url,
              image: null,
              imageMimeType: null,
            },
          });

          console.log(`✓ Migrated image for post: ${post.id}`);
        } catch (error) {
          console.error(`✗ Failed to migrate image for post ${post.id}:`, error);
        }
      }
    }

    console.log('\n✓ Image migration completed successfully!');
  } catch (error) {
    console.error('\n✗ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
migrateImages().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
