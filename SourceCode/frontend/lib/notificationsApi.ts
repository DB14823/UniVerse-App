import { API_URL } from "./api";
import * as SecureStore from "expo-secure-store";

async function getAuthToken(): Promise<string | null> {
  return await SecureStore.getItemAsync("authToken");
}

async function fetchWithAuth(url: string, init: RequestInit): Promise<any> {
  const res = await fetch(url, init);
  const text = await res.text();

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const parsed = JSON.parse(text);
      message = parsed.message || parsed.error || message;
    } catch {}
    throw new Error(message);
  }

  if (text.trim() === "") {
    return null;
  }

  return JSON.parse(text);
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, any> | null;
  read: boolean;
  userId: string;
  userRole: string;
  createdAt: string;
}

/**
 * Register a push notification token
 */
export async function registerPushToken(token: string): Promise<void> {
  const authToken = await getAuthToken();
  if (!authToken) {
    throw new Error("Not authenticated");
  }

  await fetchWithAuth(`${API_URL}/notifications/register-token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({ token }),
  });
}

/**
 * Unregister a push notification token
 */
export async function unregisterPushToken(token: string): Promise<void> {
  const authToken = await getAuthToken();
  if (!authToken) {
    throw new Error("Not authenticated");
  }

  await fetchWithAuth(`${API_URL}/notifications/register-token`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({ token }),
  });
}

/**
 * Get user's notifications
 */
export async function getNotifications(options?: {
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
}): Promise<{ notifications: Notification[]; unreadCount: number }> {
  const token = await getAuthToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  const params = new URLSearchParams();
  if (options?.limit) params.append("limit", options.limit.toString());
  if (options?.offset) params.append("offset", options.offset.toString());
  if (options?.unreadOnly) params.append("unreadOnly", "true");

  const query = params.toString() ? `?${params.toString()}` : "";

  const data = await fetchWithAuth(`${API_URL}/notifications${query}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return {
    notifications: data.notifications,
    unreadCount: data.unreadCount,
  };
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  const token = await getAuthToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  await fetchWithAuth(`${API_URL}/notifications/${notificationId}/read`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsAsRead(): Promise<void> {
  const token = await getAuthToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  await fetchWithAuth(`${API_URL}/notifications/read-all`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

/**
 * Get notification settings
 */
export async function getNotificationSettings(): Promise<{ notificationsEnabled: boolean }> {
  const token = await getAuthToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  const data = await fetchWithAuth(`${API_URL}/notifications/settings`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return { notificationsEnabled: data.notificationsEnabled };
}

/**
 * Update notification settings
 */
export async function updateNotificationSettings(
  notificationsEnabled: boolean
): Promise<{ notificationsEnabled: boolean }> {
  const token = await getAuthToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  const data = await fetchWithAuth(`${API_URL}/notifications/settings`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ notificationsEnabled }),
  });

  return { notificationsEnabled: data.notificationsEnabled };
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId: string): Promise<void> {
  const token = await getAuthToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  await fetchWithAuth(`${API_URL}/notifications/${notificationId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}
