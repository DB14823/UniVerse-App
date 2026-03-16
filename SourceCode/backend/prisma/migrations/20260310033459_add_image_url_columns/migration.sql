/*
  Warnings:

  - You are about to drop the column `eventImage` on the `Event` table. All the data in the column will be lost.
  - You are about to drop the column `eventImageMimeType` on the `Event` table. All the data in the column will be lost.
  - You are about to drop the column `evidenceImage` on the `Organisation` table. All the data in the column will be lost.
  - You are about to drop the column `evidenceImageMimeType` on the `Organisation` table. All the data in the column will be lost.
  - You are about to drop the column `profileImage` on the `Organisation` table. All the data in the column will be lost.
  - You are about to drop the column `profileImageMimeType` on the `Organisation` table. All the data in the column will be lost.
  - You are about to drop the column `image` on the `Posts` table. All the data in the column will be lost.
  - You are about to drop the column `imageMimeType` on the `Posts` table. All the data in the column will be lost.
  - You are about to drop the column `profileImage` on the `Student` table. All the data in the column will be lost.
  - You are about to drop the column `profileImageMimeType` on the `Student` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Event" DROP COLUMN "eventImage",
DROP COLUMN "eventImageMimeType",
ADD COLUMN     "eventImageUrl" TEXT;

-- AlterTable
ALTER TABLE "Organisation" DROP COLUMN "evidenceImage",
DROP COLUMN "evidenceImageMimeType",
DROP COLUMN "profileImage",
DROP COLUMN "profileImageMimeType",
ADD COLUMN     "evidenceImageUrl" TEXT,
ADD COLUMN     "profileImageUrl" TEXT;

-- AlterTable
ALTER TABLE "Posts" DROP COLUMN "image",
DROP COLUMN "imageMimeType",
ADD COLUMN     "imageUrl" TEXT;

-- AlterTable
ALTER TABLE "Student" DROP COLUMN "profileImage",
DROP COLUMN "profileImageMimeType",
ADD COLUMN     "profileImageUrl" TEXT;
