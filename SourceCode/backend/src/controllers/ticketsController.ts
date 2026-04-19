import { Request, Response } from "express";
import prisma from "../utils/prisma";
import { sendNotificationToUser } from "../services/notifications";
import { verifyPaymentIntent } from "../utils/stripe";

// create a ticket for an event (student only)
export const createTicket = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;

    if (!userId || role?.toUpperCase() !== "STUDENT") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { eventId, paymentIntentId } = req.body;
    if (!eventId) {
      return res.status(400).json({ message: "Missing eventId" });
    }

    // ensure event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        _count: { select: { tickets: true } },
      },
    });
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Check capacity
    if (event.capacity !== null && event._count.tickets >= event.capacity) {
      return res.status(400).json({ message: "Event is fully booked" });
    }

    // Parse price
    const price =
      typeof event.price === "number"
        ? event.price
        : parseFloat(String(event.price)) || 0;

    // If event has a price, require payment verification
    if (price > 0) {
      if (!paymentIntentId) {
        return res.status(400).json({
          message: "Payment required for this event",
          requiresPayment: true,
          price: price,
        });
      }

      // Verify the payment succeeded
      const verification = await verifyPaymentIntent(paymentIntentId);
      if (!verification.succeeded) {
        return res
          .status(400)
          .json({ message: "Payment has not been completed" });
      }

      // Verify the payment is for this event
      if (verification.eventId !== eventId) {
        return res
          .status(400)
          .json({ message: "Payment is for a different event" });
      }
    }

    // avoid duplicate tickets
    const existing = await prisma.ticket.findUnique({
      where: { studentId_eventId: { studentId: userId, eventId } },
    });
    if (existing) {
      return res.status(409).json({ message: "Ticket already exists" });
    }

    const ticket = await prisma.ticket.create({
      data: {
        studentId: userId,
        eventId,
        paymentIntentId: price > 0 ? paymentIntentId : null,
      },
    });

    // Notify student of ticket confirmation + org of new booking
    try {
      await Promise.all([
        sendNotificationToUser(
          userId,
          "STUDENT",
          "TICKET_CONFIRMED",
          "Ticket Confirmed!",
          `Your ticket for "${event.title}" has been booked.`,
          { eventId, ticketId: ticket.id },
        ),
        sendNotificationToUser(
          event.organiserId,
          "ORGANISATION",
          "TICKET_CONFIRMED",
          "New ticket booked",
          `A student just booked a ticket for "${event.title}".`,
          { eventId, ticketId: ticket.id },
        ),
      ]);
    } catch (notifError) {
      console.error("Error sending ticket notification:", notifError);
    }

    // return event details rather than raw ticket to match front-end expectations
    const payload = {
      id: event.id,
      ticketId: ticket.id,
      title: event.title,
      description: event.description,
      date: event.date,
      location: event.location,
      price: `£${Number(event.price).toFixed(2)}`,
      organiserId: event.organiserId,
      createdAt: event.createdAt,
      eventImageUrl: event.eventImageUrl,
      used: ticket.used,
      usedAt: ticket.usedAt,
      organiser: null as any, // will fill later
    };

    // fetch organiser info
    const organiser = await prisma.organisation.findUnique({
      where: { id: event.organiserId },
      select: { id: true, name: true, location: true },
    });
    payload.organiser = organiser;

    return res.status(201).json({ ticket: payload });
  } catch (error) {
    console.error("Error creating ticket:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};

export const getMyTickets = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;

    if (!userId || role?.toUpperCase() !== "STUDENT") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const raw = await prisma.ticket.findMany({
      where: { studentId: userId },
      include: {
        event: {
          include: {
            organiser: { select: { id: true, name: true, location: true } },
          },
        },
      },
    });

    const tickets = raw.map((t) => {
      const ev = t.event;
      return {
        id: ev.id,
        ticketId: t.id,
        title: ev.title,
        description: ev.description,
        date: ev.date,
        location: ev.location,
        price: `£${Number(ev.price).toFixed(2)}`,
        organiserId: ev.organiserId,
        createdAt: ev.createdAt,
        eventImageUrl: ev.eventImageUrl,
        organiser: ev.organiser,
        used: t.used,
        usedAt: t.usedAt,
      };
    });

    return res.json({ tickets });
  } catch (error) {
    console.error("Error fetching tickets:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};

export const deleteTicket = async (req: Request, res: Response) => {
  try {
    // optional route: student may cancel ticket
    const userId = req.user?.id;
    const role = req.user?.role;

    if (!userId || role?.toUpperCase() !== "STUDENT") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { id } = req.params;
    // id is event id in our mapping
    const ticket = await prisma.ticket.findUnique({
      where: { studentId_eventId: { studentId: userId, eventId: id } },
    });
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    await prisma.ticket.delete({
      where: { id: ticket.id },
    });

    return res.json({ message: "Ticket deleted" });
  } catch (error) {
    console.error("Error deleting ticket", error);
    return res.status(500).json({ message: "Server error", error });
  }
};

// Validate and mark ticket as used (organisation only)
export const validateTicket = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;

    if (!userId || role?.toUpperCase() !== "ORGANISATION") {
      return res
        .status(403)
        .json({ message: "Forbidden - Organisation access required" });
    }

    const { ticketId, eventId } = req.body;
    if (!ticketId) {
      return res.status(400).json({ message: "Missing ticketId" });
    }

    // Find the ticket with event and student info
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        event: {
          include: { organiser: { select: { id: true } } },
        },
        student: { select: { id: true, name: true, email: true } },
      },
    });

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    // Verify this organisation owns the event
    if (ticket.event.organiserId !== userId) {
      return res
        .status(403)
        .json({ message: "This ticket is not for your event" });
    }

    // If eventId provided, verify ticket matches the specific event
    if (eventId && ticket.eventId !== eventId) {
      return res.status(400).json({ message: "Ticket is not for this event" });
    }

    // Check if already used
    if (ticket.used) {
      return res.status(400).json({
        message: "Ticket already used",
        ticket: {
          id: ticket.id,
          used: true,
          usedAt: ticket.usedAt,
          event: { title: ticket.event.title, date: ticket.event.date },
          student: ticket.student,
        },
      });
    }

    // Mark as used
    const updated = await prisma.ticket.update({
      where: { id: ticketId },
      data: { used: true, usedAt: new Date() },
    });

    return res.json({
      success: true,
      ticket: {
        id: updated.id,
        used: updated.used,
        usedAt: updated.usedAt,
        event: {
          title: ticket.event.title,
          date: ticket.event.date,
          location: ticket.event.location,
        },
        student: ticket.student,
      },
    });
  } catch (error) {
    console.error("Error validating ticket:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};

const ticketsController = {
  createTicket,
  getMyTickets,
  deleteTicket,
  validateTicket,
};

export default ticketsController;
