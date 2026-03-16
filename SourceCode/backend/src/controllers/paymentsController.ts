import { Request, Response } from "express";
import prisma from "../utils/prisma";
import { createPaymentIntent } from "../utils/stripe";

/**
 * Create a PaymentIntent for a paid event
 * POST /payments/create-intent
 * Body: { eventId }
 */
export const createPaymentIntentController = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;

    if (!userId || role?.toUpperCase() !== "STUDENT") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { eventId } = req.body;
    if (!eventId) {
      return res.status(400).json({ message: "Missing eventId" });
    }

    // Get the event
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Parse price - ensure it's a number
    const price =
      typeof event.price === "number"
        ? event.price
        : parseFloat(String(event.price)) || 0;

    // Free events don't need payment
    if (price <= 0) {
      return res.status(400).json({
        message: "This event is free, no payment required",
        isFree: true,
      });
    }

    // Check if user already has a ticket
    const existingTicket = await prisma.ticket.findUnique({
      where: {
        studentId_eventId: {
          studentId: userId,
          eventId,
        },
      },
    });

    if (existingTicket) {
      return res.status(409).json({ message: "You already have a ticket for this event" });
    }

    // Convert to pence (Stripe expects smallest currency unit)
    const amountInPence = Math.round(price * 100);

    // Create PaymentIntent
    const result = await createPaymentIntent(amountInPence, eventId);

    if (!result) {
      return res.status(500).json({ message: "Failed to create payment intent" });
    }

    return res.json({
      clientSecret: result.clientSecret,
      paymentIntentId: result.paymentIntentId,
      amount: amountInPence,
      currency: "gbp",
    });
  } catch (error) {
    console.error("Error creating payment intent:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};

const paymentsController = {
  createPaymentIntent: createPaymentIntentController,
};

export default paymentsController;
