// Stub notifications module - push notifications require paid Apple Developer account
// This provides no-op implementations to prevent build errors

/**
 * Register for push notifications (stub - does nothing)
 */
export async function registerForPushNotifications(): Promise<string | null> {
  console.log("Push notifications disabled - requires paid Apple Developer account");
  return null;
}

/**
 * Unregister from push notifications (stub)
 */
export async function unregisterForPushNotifications(): Promise<void> {
  // No-op
}

/**
 * Set up notification listeners (stub)
 */
export function setupNotificationListeners(
  onNotification?: (notification: any) => void,
  onNotificationResponse?: (response: any) => void
): () => void {
  // Return empty cleanup function
  return () => {};
}

/**
 * Get the current push token (stub)
 */
export function getCurrentPushToken(): string | null {
  return null;
}

/**
 * Clear notification badge (stub)
 */
export async function clearNotificationBadge(): Promise<void> {
  // No-op
}

/**
 * Schedule a local notification (stub)
 */
export async function scheduleLocalNotification(
  title: string,
  body: string,
  seconds: number = 2
): Promise<void> {
  console.log(`[Local Notification] ${title}: ${body}`);
}
