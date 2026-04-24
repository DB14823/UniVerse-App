import * as Calendar from "expo-calendar";
import { Alert } from "react-native";

export interface CalendarEventData {
  title: string;
  date: Date;
  location: string;
  description?: string;
}

export async function requestCalendarPermission(): Promise<boolean> {
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  return status === "granted";
}

async function pickCalendarId(): Promise<string | null> {
  const hasPermission = await requestCalendarPermission();
  if (!hasPermission) {
    Alert.alert(
      "Calendar Access Denied",
      "Please enable calendar access in your device settings.",
    );
    return null;
  }

  const calendars = (
    await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT)
  ).filter((cal) => cal.allowsModifications);

  if (calendars.length === 0) {
    Alert.alert(
      "No Calendar Found",
      "Could not find a calendar to add the event to.",
    );
    return null;
  }

  if (calendars.length === 1) {
    return calendars[0].id;
  }

  return new Promise((resolve) => {
    Alert.alert("Add to Calendar", "Choose a calendar:", [
      ...calendars.map((cal) => ({
        text: cal.title,
        onPress: () => resolve(cal.id),
      })),
      {
        text: "Cancel",
        style: "cancel" as const,
        onPress: () => resolve(null),
      },
    ]);
  });
}

export async function addEventToCalendar(
  event: CalendarEventData,
): Promise<string | null> {
  try {
    const calendarId = await pickCalendarId();
    if (!calendarId) return null;

    const endDate = new Date(event.date);
    endDate.setHours(endDate.getHours() + 2);

    return await Calendar.createEventAsync(calendarId, {
      title: event.title,
      startDate: event.date,
      endDate: endDate,
      location: event.location,
      notes: event.description,
      alarms: [{ relativeOffset: -60 }],
    });
  } catch (error) {
    console.error("Failed to add event to calendar:", error);
    return null;
  }
}
