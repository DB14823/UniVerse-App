import { API_URL } from "./api";
import * as SecureStore from "expo-secure-store";
import { AuthError, clearSession } from "./auth";

async function handleResponse(response: Response) {
  const text = await response.text();

  if (!response.ok) {
    let parsed: any | null = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      // ignore
    }

    let message: string;
    if (typeof parsed?.error === "string") {
      message = parsed.error;
    } else if (typeof parsed?.message === "string") {
      message = parsed.message;
    } else if (parsed?.error) {
      message = JSON.stringify(parsed.error);
    } else if (parsed?.message) {
      message = JSON.stringify(parsed.message);
    } else {
      message = `HTTP ${response.status}`;
    }

    if (
      response.status === 401 &&
      message.toLowerCase().includes("token")
    ) {
      await clearSession();
      throw new AuthError(message);
    }

    throw new Error(message);
  }

  if (text.trim() === "") {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch (err) {
    console.error("Failed to parse JSON response (possibly server bug):", text);
    throw new Error("Invalid response format from server");
  }
}

async function fetchWithAuth(url: string, init: RequestInit) {
  const res = await fetch(url, init);
  return await handleResponse(res);
}

async function getAuthToken(): Promise<string | null> {
  return await SecureStore.getItemAsync("authToken");
}

export interface PaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
  currency: string;
}

/**
 * Create a payment intent for a paid event
 * @param eventId - The event ID to create payment for
 * @returns PaymentIntent details including client secret
 */
export async function createPaymentIntent(
  eventId: string
): Promise<PaymentIntentResponse> {
  const token = await getAuthToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  const data = await fetchWithAuth(`${API_URL}/payments/create-intent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ eventId }),
  });

  return data as PaymentIntentResponse;
}
