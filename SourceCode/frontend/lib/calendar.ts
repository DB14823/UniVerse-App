import * as Calendar from "expo-calendar";
import { Platform, Alert } from "react-native";

export interface CalendarEventData {
  title: string;
  date: Date;
  location: string;
  description?: string;
}

/**
 * Request calendar permission from the user
 * Returns true if granted, false otherwise
 */
export async function requestCalendarPermission(): Promise<boolean> {
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  return status === "granted";
}

/**
 * Get the default calendar ID for the device
 */
async function getDefaultCalendarId(): Promise<string | null> {
  const calendars = await Calendar.getCalendarsAsync(
    Calendar.EntityTypes.EVENT,
  );

  if (Platform.OS === "ios") {
    const defaultCalendar = calendars.find((cal) => cal.allowsModifications);
    return defaultCalendar?.id ?? null;
  } else {
    const writableCalendar = calendars.find((cal) => cal.allowsModifications);
    return writableCalendar?.id ?? null;
  }
}

/**
 * Add an event to the device calendar
 * Returns the event ID if successful, null otherwise
 */
export async function addEventToCalendar(
  event: CalendarEventData,
): Promise<string | null> {
  try {
    const hasPermission = await requestCalendarPermission();

    if (!hasPermission) {
      Alert.alert(
        "Calendar Access Denied",
        "To add events to your calendar, please enable calendar access in your device settings.",
      );
      return null;
    }

    const calendarId = await getDefaultCalendarId();

    if (!calendarId) {
      Alert.alert(
        "No Calendar Found",
        "Could not find a calendar to add the event to.",
      );
      return null;
    }

    const endDate = new Date(event.date);
    endDate.setHours(endDate.getHours() + 2);

    const eventId = await Calendar.createEventAsync(calendarId, {
      title: event.title,
      startDate: event.date,
      endDate: endDate,
      location: event.location,
      notes: event.description,
      alarms: [{ relativeOffset: -60 }],
    });

    return eventId;
  } catch (error) {
    console.error("Failed to add event to calendar:", error);
    return null;
  }
}
