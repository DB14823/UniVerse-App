import prisma from "../../utils/prisma";
import {
  createEvent,
  getAllEvents,
  getEventsByOrganiser,
  getMyEvents,
  updateEvent,
  deleteEvent,
} from "../../controllers/eventsController";
import { mockRequest, mockResponse } from "../helpers";

jest.mock("../../utils/prisma");
jest.mock("../../services/imageUpload", () => ({
  uploadImage: jest
    .fn()
    .mockResolvedValue({ url: "https://cdn.example.com/img.jpg" }),
  deleteImage: jest.fn().mockResolvedValue(undefined),
  extractPublicIdFromUrl: jest.fn().mockReturnValue("universe/events/abc123"),
}));
jest.mock("../../services/notifications", () => ({
  notifyFollowersOfNewEvent: jest.fn().mockResolvedValue(undefined),
}));

const db = prisma as jest.Mocked<typeof prisma>;

const ORGANISER = {
  id: "org1",
  email: "org@test.com",
  role: "ORGANISATION" as const,
};

const makeEvent = (overrides = {}) => ({
  id: "evt1",
  title: "Summer Ball",
  description: "A great event",
  date: new Date("2026-06-01"),
  location: "Plymouth",
  price: 10,
  category: "Social",
  capacity: 100,
  organiserId: ORGANISER.id,
  eventImageUrl: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  organiser: { id: ORGANISER.id, name: "Test Org", location: "Plymouth" },
  _count: { tickets: 5 },
  ...overrides,
});

describe("createEvent", () => {
  it("returns 401 when user is not authenticated", async () => {
    const req = mockRequest({ body: {} });
    const res = mockResponse();

    await createEvent(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Unauthorized" });
  });

  it("returns 400 when required fields are missing", async () => {
    const req = mockRequest({
      user: ORGANISER,
      body: { title: "Only title" }, // missing date, location, price
    });
    const res = mockResponse();

    await createEvent(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("Missing required fields"),
      }),
    );
  });

  it("returns 400 for an invalid date string", async () => {
    const req = mockRequest({
      user: ORGANISER,
      body: {
        title: "Event",
        date: "not-a-date",
        location: "London",
        price: 5,
      },
    });
    const res = mockResponse();

    await createEvent(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid date format" });
  });

  it("returns 201 with the created event on success (no image)", async () => {
    (db.event.create as jest.Mock).mockResolvedValue(makeEvent());

    const req = mockRequest({
      user: ORGANISER,
      body: {
        title: "Summer Ball",
        date: "2026-06-01",
        location: "Plymouth",
        price: 10,
        category: "Social",
        capacity: 100,
      },
    });
    const res = mockResponse();

    await createEvent(req, res);

    expect(db.event.create).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({ title: "Summer Ball" }),
      }),
    );
  });

  it("defaults capacity to null when not provided", async () => {
    (db.event.create as jest.Mock).mockResolvedValue(
      makeEvent({ capacity: null }),
    );

    const req = mockRequest({
      user: ORGANISER,
      body: {
        title: "Free Event",
        date: "2026-06-01",
        location: "Plymouth",
        price: 5, // price:0 is falsy → fails the controller's !price guard
      },
    });
    const res = mockResponse();

    await createEvent(req, res);

    const createCall = (db.event.create as jest.Mock).mock.calls[0][0];
    expect(createCall.data.capacity).toBeNull();
  });

  it("returns 500 on unexpected database error", async () => {
    (db.event.create as jest.Mock).mockRejectedValue(new Error("DB error"));

    const req = mockRequest({
      user: ORGANISER,
      body: {
        title: "Event",
        date: "2026-06-01",
        location: "Plymouth",
        price: 5,
      },
    });
    const res = mockResponse();

    await createEvent(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe("getAllEvents", () => {
  it("returns all events when no category filter is applied", async () => {
    const events = [
      makeEvent(),
      makeEvent({ id: "evt2", title: "Winter Gala" }),
    ];
    (db.event.findMany as jest.Mock).mockResolvedValue(events);

    const req = mockRequest({ query: {} });
    const res = mockResponse();

    await getAllEvents(req, res);

    const call = (db.event.findMany as jest.Mock).mock.calls[0][0];
    expect(call.where).toEqual({});
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        events: expect.arrayContaining([
          expect.objectContaining({ title: "Summer Ball" }),
        ]),
      }),
    );
  });

  it("filters by category when a specific category is passed", async () => {
    (db.event.findMany as jest.Mock).mockResolvedValue([makeEvent()]);

    const req = mockRequest({ query: { category: "Social" } });
    const res = mockResponse();

    await getAllEvents(req, res);

    const call = (db.event.findMany as jest.Mock).mock.calls[0][0];
    expect(call.where).toEqual({ category: "Social" });
  });

  it("does not filter when category is 'All'", async () => {
    (db.event.findMany as jest.Mock).mockResolvedValue([]);

    const req = mockRequest({ query: { category: "All" } });
    const res = mockResponse();

    await getAllEvents(req, res);

    const call = (db.event.findMany as jest.Mock).mock.calls[0][0];
    expect(call.where).toEqual({});
  });

  it("maps ticketCount from _count.tickets", async () => {
    (db.event.findMany as jest.Mock).mockResolvedValue([
      makeEvent({ _count: { tickets: 7 } }),
    ]);

    const req = mockRequest({ query: {} });
    const res = mockResponse();

    await getAllEvents(req, res);

    const { events } = (res.json as jest.Mock).mock.calls[0][0];
    expect(events[0].ticketCount).toBe(7);
  });
});

describe("getEventsByOrganiser", () => {
  it("returns 400 when organiserId param is missing", async () => {
    const req = mockRequest({ params: {} });
    const res = mockResponse();

    await getEventsByOrganiser(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns events for a given organiserId", async () => {
    (db.event.findMany as jest.Mock).mockResolvedValue([makeEvent()]);

    const req = mockRequest({ params: { organiserId: ORGANISER.id } });
    const res = mockResponse();

    await getEventsByOrganiser(req, res);

    const call = (db.event.findMany as jest.Mock).mock.calls[0][0];
    expect(call.where.organiserId).toBe(ORGANISER.id);
    expect(res.json).toHaveBeenCalled();
  });
});

describe("getMyEvents", () => {
  it("returns 401 when user is unauthenticated", async () => {
    const req = mockRequest();
    const res = mockResponse();

    await getMyEvents(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("returns events belonging to the authenticated organiser", async () => {
    (db.event.findMany as jest.Mock).mockResolvedValue([makeEvent()]);

    const req = mockRequest({ user: ORGANISER });
    const res = mockResponse();

    await getMyEvents(req, res);

    const call = (db.event.findMany as jest.Mock).mock.calls[0][0];
    expect(call.where.organiserId).toBe(ORGANISER.id);
    expect(res.json).toHaveBeenCalled();
  });
});

describe("updateEvent", () => {
  it("returns 401 when unauthenticated", async () => {
    const req = mockRequest({ params: { id: "evt1" } });
    const res = mockResponse();
    await updateEvent(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("returns 404 when the event does not exist", async () => {
    (db.event.findUnique as jest.Mock).mockResolvedValue(null);

    const req = mockRequest({
      user: ORGANISER,
      params: { id: "missing" },
      body: {},
    });
    const res = mockResponse();

    await updateEvent(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Event not found" });
  });

  it("returns 403 when the authenticated user does not own the event", async () => {
    (db.event.findUnique as jest.Mock).mockResolvedValue(
      makeEvent({ organiserId: "other-org" }),
    );

    const req = mockRequest({
      user: ORGANISER,
      params: { id: "evt1" },
      body: {},
    });
    const res = mockResponse();

    await updateEvent(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: "Forbidden" });
  });

  it("returns 400 for an invalid date string", async () => {
    (db.event.findUnique as jest.Mock).mockResolvedValue(makeEvent());

    const req = mockRequest({
      user: ORGANISER,
      params: { id: "evt1" },
      body: { date: "bad-date" },
    });
    const res = mockResponse();

    await updateEvent(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid date format" });
  });

  it("returns the updated event on success", async () => {
    const updated = makeEvent({ title: "Updated Title" });
    (db.event.findUnique as jest.Mock).mockResolvedValue(makeEvent());
    (db.event.update as jest.Mock).mockResolvedValue(updated);

    const req = mockRequest({
      user: ORGANISER,
      params: { id: "evt1" },
      body: { title: "Updated Title" },
    });
    const res = mockResponse();

    await updateEvent(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({ title: "Updated Title" }),
      }),
    );
  });
});

describe("deleteEvent", () => {
  it("returns 401 when unauthenticated", async () => {
    const req = mockRequest({ params: { id: "evt1" } });
    const res = mockResponse();
    await deleteEvent(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("returns 404 when the event does not exist", async () => {
    (db.event.findUnique as jest.Mock).mockResolvedValue(null);

    const req = mockRequest({ user: ORGANISER, params: { id: "missing" } });
    const res = mockResponse();

    await deleteEvent(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("returns 403 when user is not the event owner", async () => {
    (db.event.findUnique as jest.Mock).mockResolvedValue(
      makeEvent({ organiserId: "other-org" }),
    );

    const req = mockRequest({ user: ORGANISER, params: { id: "evt1" } });
    const res = mockResponse();

    await deleteEvent(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("deletes related tickets and the event then returns success", async () => {
    (db.event.findUnique as jest.Mock).mockResolvedValue(makeEvent());
    (db.ticket.deleteMany as jest.Mock).mockResolvedValue({ count: 2 });
    (db.event.delete as jest.Mock).mockResolvedValue(undefined);

    const req = mockRequest({ user: ORGANISER, params: { id: "evt1" } });
    const res = mockResponse();

    await deleteEvent(req, res);

    expect(db.ticket.deleteMany).toHaveBeenCalledWith({
      where: { eventId: "evt1" },
    });
    expect(db.event.delete).toHaveBeenCalledWith({ where: { id: "evt1" } });
    expect(res.json).toHaveBeenCalledWith({ message: "Event deleted" });
  });
});
