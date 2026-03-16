import { Request, Response } from "express";
import prisma from "../utils/prisma";
import { uploadImage, deleteImage, extractPublicIdFromUrl } from "../services/imageUpload";

const isValidDate = (value: string) => {
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime());
};

export const createEvent = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const {
      title,
      description,
      date,
      location,
      price,
      eventImage,
      category,
    } = req.body;

    if (!title || !date || !location || !price) {
      return res.status(400).json({
        message:
          "Missing required fields: title, date, location, price",
      });
    }

    if (!isValidDate(date)) {
      return res.status(400).json({ message: "Invalid date format" });
    }

    let eventImageUrl: string | null = null;

    if (eventImage) {
      const uploadResult = await uploadImage(eventImage, "universe/events");
      eventImageUrl = uploadResult.url;
    }

    const safeDescription = typeof description === "string" ? description : "";
    const safeCategory = typeof category === "string" ? category : "Other";

    const event = await prisma.event.create({
      data: {
        title,
        description: safeDescription,
        date: new Date(date),
        location,
        price,
        category: safeCategory,
        organiserId: userId,
        eventImageUrl,
      },
      include: {
        organiser: {
          select: {
            id: true,
            name: true,
            location: true,
          },
        },
      },
    });

    const eventWithUrl = {
      ...event,
      organiser: {
        id: event.organiser.id,
        name: event.organiser.name,
        location: event.organiser.location,
      },
    };

    return res.status(201).json({ event: eventWithUrl });
  } catch (error) {
    console.error("Error creating event:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};

export const getAllEvents = async (req: Request, res: Response) => {
  try {
    const { category } = req.query;

    const where: any = {};
    if (category && typeof category === "string" && category !== "All") {
      where.category = category;
    }

    const events = await prisma.event.findMany({
      where,
      orderBy: { date: "asc" },
      include: {
        organiser: {
          select: {
            id: true,
            name: true,
            location: true,
          },
        },
      },
    });

    const eventsWithUrl = events.map((event) => ({
      ...event,
      organiser: {
        id: event.organiser.id,
        name: event.organiser.name,
        location: event.organiser.location,
      },
    }));

    return res.json({ events: eventsWithUrl });
  } catch (error) {
    console.error("Error fetching events:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};

export const getEventsByOrganiser = async (req: Request, res: Response) => {
  try {
    const { organiserId } = req.params;

    if (!organiserId) {
      return res.status(400).json({ message: "Missing organiserId" });
    }

    const events = await prisma.event.findMany({
      where: { organiserId },
      orderBy: { date: "asc" },
      include: {
        organiser: {
          select: {
            id: true,
            name: true,
            location: true,
          },
        },
      },
    });

    const eventsWithUrl = events.map((event) => ({
      ...event,
      organiser: {
        id: event.organiser.id,
        name: event.organiser.name,
        location: event.organiser.location,
      },
    }));

    return res.json({ events: eventsWithUrl });
  } catch (error) {
    console.error("Error fetching organiser events:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};

export const getMyEvents = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const events = await prisma.event.findMany({
      where: { organiserId: userId },
      orderBy: { date: "asc" },
      include: {
        organiser: {
          select: {
            id: true,
            name: true,
            location: true,
          },
        },
        _count: {
          select: { tickets: true },
        },
      },
    });

    const eventsWithUrl = events.map((event) => ({
      ...event,
      ticketCount: event._count.tickets,
      organiser: {
        id: event.organiser.id,
        name: event.organiser.name,
        location: event.organiser.location,
      },
    }));

    return res.json({ events: eventsWithUrl });
  } catch (error) {
    console.error("Error fetching organiser events:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};

export const updateEvent = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params;
    const existing = await prisma.event.findUnique({ where: { id } });

    if (!existing) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (existing.organiserId !== userId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const {
      title,
      description,
      date,
      location,
      price,
      eventImage,
      category,
    } = req.body;

    if (date && !isValidDate(date)) {
      return res.status(400).json({ message: "Invalid date format" });
    }

    const data: Record<string, any> = {};

    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (date !== undefined) data.date = new Date(date);
    if (location !== undefined) data.location = location;
    if (price !== undefined) data.price = price;
    if (category !== undefined) data.category = category;

    if (eventImage === null) {
      // Delete image
      if (existing.eventImageUrl) {
        const publicId = extractPublicIdFromUrl(existing.eventImageUrl);
        if (publicId) {
          await deleteImage(publicId);
        }
      }
      data.eventImageUrl = null;
    } else if (eventImage) {
      // Delete old image if exists
      if (existing.eventImageUrl) {
        const publicId = extractPublicIdFromUrl(existing.eventImageUrl);
        if (publicId) {
          await deleteImage(publicId);
        }
      }

      // Upload new image
      const uploadResult = await uploadImage(eventImage, "universe/events");
      data.eventImageUrl = uploadResult.url;
    }

    const updated = await prisma.event.update({
      where: { id },
      data,
      include: {
        organiser: {
          select: {
            id: true,
            name: true,
            location: true,
          },
        },
      },
    });

    const eventWithUrl = {
      ...updated,
      organiser: {
        id: updated.organiser.id,
        name: updated.organiser.name,
        location: updated.organiser.location,
      },
    };

    return res.json({ event: eventWithUrl });
  } catch (error) {
    console.error("Error updating event:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};

export const deleteEvent = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params;
    const existing = await prisma.event.findUnique({ where: { id } });

    if (!existing) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (existing.organiserId !== userId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    // Delete image from Cloudinary
    if (existing.eventImageUrl) {
      const publicId = extractPublicIdFromUrl(existing.eventImageUrl);
      if (publicId) {
        await deleteImage(publicId);
      }
    }

    // ensure any related tickets are gone before removing the event
    // (DB cascade should handle it but we delete explicitly to keep behaviour
    // consistent even if the foreign key isn't configured correctly).
    await prisma.ticket.deleteMany({ where: { eventId: id } });

    await prisma.event.delete({ where: { id } });
    return res.json({ message: "Event deleted" });
  } catch (error) {
    console.error("Error deleting event:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};

const eventsController = {
  createEvent,
  getAllEvents,
  getEventsByOrganiser,
  getMyEvents,
  updateEvent,
  deleteEvent,
};

export default eventsController;
