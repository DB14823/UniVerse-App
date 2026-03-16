import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { registerPushToken, unregisterPushToken } from "./notificationsApi";

// Configure notification handling
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Track the current push token
let currentPushToken: string | null = null;

/**
 * Register for push notifications
 * Returns the push token if successful, null otherwise
 */
export async function registerForPushNotifications(): Promise<string | null> {
  try {
    // Check if device supports push notifications
    if (!Device.isDevice) {
      console.log("Push notifications only work on physical devices");
      return null;
    }

    // Check existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request permissions if not granted
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("Push notification permission not granted");
      return null;
    }

    // Get the push token
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: "b565b408-436a-4f93-88e1-78a4db6fad03", // Your EAS project ID
    });

    const token = tokenData.data;
    currentPushToken = token;

    // Register token with backend
    await registerPushToken(token);

    // Configure Android channel
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#6C63FF",
      });
    }

    console.log("Push token registered:", token);
    return token;
  } catch (error) {
    console.error("Error registering for push notifications:", error);
    return null;
  }
}

/**
 * Unregister from push notifications
 */
export async function unregisterForPushNotifications(): Promise<void> {
  try {
    if (currentPushToken) {
      await unregisterPushToken(currentPushToken);
      currentPushToken = null;
    }
  } catch (error) {
    console.error("Error unregistering push token:", error);
  }
}

/**
 * Set up notification listeners
 * Returns cleanup function to remove listeners
 */
export function setupNotificationListeners(
  onNotification?: (notification: Notifications.Notification) => void,
  onNotificationResponse?: (response: Notifications.NotificationResponse) => void
): () => void {
  const subscriptions: Notifications.EventSubscription[] = [];

  // Listen for incoming notifications while app is foregrounded
  if (onNotification) {
    subscriptions.push(
      Notifications.addNotificationReceivedListener(onNotification)
    );
  }

  // Listen for user tapping on notification
  if (onNotificationResponse) {
    subscriptions.push(
      Notifications.addNotificationResponseReceivedListener(onNotificationResponse)
    );
  }

  // Return cleanup function
  return () => {
    subscriptions.forEach((sub) => sub.remove());
  };
}

/**
 * Get the current push token
 */
export function getCurrentPushToken(): string | null {
  return currentPushToken;
}

/**
 * Clear notification badge
 */
export async function clearNotificationBadge(): Promise<void> {
  await Notifications.setBadgeCountAsync(0);
}

/**
 * Schedule a local notification (for testing)
 */
export async function scheduleLocalNotification(
  title: string,
  body: string,
  seconds: number = 2
): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds,
    },
  });
}
