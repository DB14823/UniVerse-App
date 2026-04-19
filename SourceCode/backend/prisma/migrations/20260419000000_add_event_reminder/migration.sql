-- CreateTable
CREATE TABLE "EventReminder" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "reminderType" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventReminder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventReminder_eventId_idx" ON "EventReminder"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "EventReminder_eventId_reminderType_key" ON "EventReminder"("eventId", "reminderType");

-- AddForeignKey
ALTER TABLE "EventReminder" ADD CONSTRAINT "EventReminder_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
