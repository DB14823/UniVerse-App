import {
  requestCalendarPermission,
  addEventToCalendar,
} from "../../lib/calendar";

// Mock expo-calendar before importing the module under test
jest.mock("expo-calendar", () => ({
  requestCalendarPermissionsAsync: jest.fn(),
  getCalendarsAsync: jest.fn(),
  createEventAsync: jest.fn(),
  EntityTypes: { EVENT: "event" },
}));

jest.mock("react-native", () => ({
  Platform: { OS: "ios" },
  Alert: { alert: jest.fn() },
}));

import * as Calendar from "expo-calendar";
import { Alert } from "react-native";

const mockRequestPerms = Calendar.requestCalendarPermissionsAsync as jest.Mock;
const mockGetCalendars = Calendar.getCalendarsAsync as jest.Mock;
const mockCreateEvent = Calendar.createEventAsync as jest.Mock;
const mockAlert = Alert.alert as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

const EVENT_DATA = {
  title: "Summer Ball",
  date: new Date("2026-06-01T19:00:00"),
  location: "Plymouth Pavilions",
  description: "Annual summer event",
};

// ---------------------------------------------------------------------------
// requestCalendarPermission
// ---------------------------------------------------------------------------
describe("requestCalendarPermission", () => {
  it("returns true when permission is granted", async () => {
    mockRequestPerms.mockResolvedValue({ status: "granted" });
    const result = await requestCalendarPermission();
    expect(result).toBe(true);
  });

  it("returns false when permission is denied", async () => {
    mockRequestPerms.mockResolvedValue({ status: "denied" });
    const result = await requestCalendarPermission();
    expect(result).toBe(false);
  });

  it("returns false for any non-granted status", async () => {
    mockRequestPerms.mockResolvedValue({ status: "undetermined" });
    const result = await requestCalendarPermission();
    expect(result).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// addEventToCalendar
// ---------------------------------------------------------------------------
describe("addEventToCalendar", () => {
  it("shows an alert and returns null when permission is denied", async () => {
    mockRequestPerms.mockResolvedValue({ status: "denied" });

    const result = await addEventToCalendar(EVENT_DATA);

    expect(mockAlert).toHaveBeenCalledWith(
      "Calendar Access Denied",
      expect.any(String),
    );
    expect(result).toBeNull();
  });

  it("shows an alert and returns null when no writable calendar is found", async () => {
    mockRequestPerms.mockResolvedValue({ status: "granted" });
    mockGetCalendars.mockResolvedValue([]); // no calendars

    const result = await addEventToCalendar(EVENT_DATA);

    expect(mockAlert).toHaveBeenCalledWith(
      "No Calendar Found",
      expect.any(String),
    );
    expect(result).toBeNull();
  });

  it("returns null when no calendar allows modifications", async () => {
    mockRequestPerms.mockResolvedValue({ status: "granted" });
    mockGetCalendars.mockResolvedValue([
      { id: "cal1", allowsModifications: false },
    ]);

    const result = await addEventToCalendar(EVENT_DATA);

    expect(result).toBeNull();
  });

  it("creates the event and returns its ID on success", async () => {
    mockRequestPerms.mockResolvedValue({ status: "granted" });
    mockGetCalendars.mockResolvedValue([
      { id: "cal1", allowsModifications: true },
    ]);
    mockCreateEvent.mockResolvedValue("new-event-id");

    const result = await addEventToCalendar(EVENT_DATA);

    expect(mockCreateEvent).toHaveBeenCalledWith(
      "cal1",
      expect.objectContaining({
        title: "Summer Ball",
        startDate: EVENT_DATA.date,
        location: "Plymouth Pavilions",
        notes: "Annual summer event",
        alarms: [{ relativeOffset: -60 }],
      }),
    );
    expect(result).toBe("new-event-id");
  });

  it("sets endDate to 2 hours after startDate", async () => {
    mockRequestPerms.mockResolvedValue({ status: "granted" });
    mockGetCalendars.mockResolvedValue([
      { id: "cal1", allowsModifications: true },
    ]);
    mockCreateEvent.mockResolvedValue("eid");

    await addEventToCalendar(EVENT_DATA);

    const createArg = mockCreateEvent.mock.calls[0][1];
    const diff =
      new Date(createArg.endDate).getTime() -
      new Date(createArg.startDate).getTime();
    expect(diff).toBe(2 * 60 * 60 * 1000); // exactly 2 hours in ms
  });

  it("returns null and does not throw when createEventAsync rejects", async () => {
    mockRequestPerms.mockResolvedValue({ status: "granted" });
    mockGetCalendars.mockResolvedValue([
      { id: "cal1", allowsModifications: true },
    ]);
    mockCreateEvent.mockRejectedValue(new Error("Calendar write failed"));

    const result = await addEventToCalendar(EVENT_DATA);

    expect(result).toBeNull();
  });
});
