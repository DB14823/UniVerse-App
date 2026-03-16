import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  console.warn("STRIPE_SECRET_KEY not set - payment features will be disabled");
}

export const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: "2025-02-24.acacia",
    })
  : null;

/**
 * Create a PaymentIntent for an event ticket
 * @param amountInPence - The amount in pence (GBP)
 * @param eventId - The event ID for metadata
 * @returns The PaymentIntent client secret and ID
 */
export async function createPaymentIntent(
  amountInPence: number,
  eventId: string
): Promise<{ clientSecret: string; paymentIntentId: string } | null> {
  if (!stripe) {
    throw new Error("Stripe is not configured");
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountInPence,
    currency: "gbp",
    metadata: {
      eventId,
    },
    automatic_payment_methods: {
      enabled: true,
    },
  });

  return {
    clientSecret: paymentIntent.client_secret!,
    paymentIntentId: paymentIntent.id,
  };
}

/**
 * Verify that a PaymentIntent has succeeded
 * @param paymentIntentId - The PaymentIntent ID to verify
 * @returns Whether the payment succeeded and the event ID if so
 */
export async function verifyPaymentIntent(
  paymentIntentId: string
): Promise<{ succeeded: boolean; eventId?: string; amount?: number }> {
  if (!stripe) {
    throw new Error("Stripe is not configured");
  }

  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

  if (paymentIntent.status === "succeeded") {
    return {
      succeeded: true,
      eventId: paymentIntent.metadata.eventId,
      amount: paymentIntent.amount,
    };
  }

  return { succeeded: false };
}
