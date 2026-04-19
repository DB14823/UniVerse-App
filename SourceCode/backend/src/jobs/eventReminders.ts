import cron from "node-cron";
import prisma from "../utils/prisma";
import { sendNotificationToUser } from "../services/notifications";

// Runs every 15 minutes to check for upcoming events needing reminders
export function startEventReminderJob(): void {
  cron.schedule("*/15 * * * *", async () => {
    try {
      await sendDueReminders();
    } catch (error) {
      console.error("Event reminder job error:", error);
    }
  });

  console.log("Event reminder job started");
}

async function sendDueReminders(): Promise<void> {
  const now = new Date();

  // 1-day window: events starting between 23h and 25h from now
  const oneDayMin = new Date(now.getTime() + 23 * 60 * 60 * 1000);
  const oneDayMax = new Date(now.getTime() + 25 * 60 * 60 * 1000);

  // 1-hour window: events starting between 45min and 75min from now
  const oneHourMin = new Date(now.getTime() + 45 * 60 * 1000);
  const oneHourMax = new Date(now.getTime() + 75 * 60 * 1000);

  await Promise.all([
    processReminders(
      oneDayMin,
      oneDayMax,
      "ONE_DAY",
      "Tomorrow",
      "is tomorrow",
    ),
    processReminders(
      oneHourMin,
      oneHourMax,
      "ONE_HOUR",
      "Starting soon",
      "starts in about 1 hour",
    ),
  ]);
}

async function processReminders(
  dateMin: Date,
  dateMax: Date,
  reminderType: "ONE_DAY" | "ONE_HOUR",
  title: string,
  bodyFragment: string,
): Promise<void> {
  // Find events in the time window that haven't had this reminder sent yet
  const events = await prisma.event.findMany({
    where: {
      date: { gte: dateMin, lte: dateMax },
      reminders: { none: { reminderType } },
    },
    include: {
      tickets: { select: { studentId: true } },
    },
  });

  for (const event of events) {
    const studentIds = event.tickets.map((t) => t.studentId);
    if (studentIds.length === 0) continue;

    // Mark reminder as sent before dispatching to prevent duplicates on retry
    await prisma.eventReminder.create({
      data: { eventId: event.id, reminderType },
    });

    await Promise.all(
      studentIds.map((studentId) =>
        sendNotificationToUser(
          studentId,
          "STUDENT",
          `EVENT_REMINDER_${reminderType}`,
          `${title}: ${event.title}`,
          `"${event.title}" ${bodyFragment}.`,
          { eventId: event.id },
        ).catch((err) =>
          console.error(`Failed to send reminder to ${studentId}:`, err),
        ),
      ),
    );
  }
}
