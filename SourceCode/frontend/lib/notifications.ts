import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { registerPushToken, unregisterPushToken } from "./notificationsApi";

const EXPO_PROJECT_ID = "b565b408-436a-4f93-88e1-78a4db6fad03";
const PUSH_TOKEN_KEY = "push_token";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    return null;
  }

  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: EXPO_PROJECT_ID,
  });
  const token = tokenData.data;

  const cached = await SecureStore.getItemAsync(PUSH_TOKEN_KEY);
  if (cached !== token) {
    await registerPushToken(token);
    await SecureStore.setItemAsync(PUSH_TOKEN_KEY, token);
  }

  return token;
}

export async function unregisterForPushNotifications(): Promise<void> {
  const token = await SecureStore.getItemAsync(PUSH_TOKEN_KEY);
  if (token) {
    await unregisterPushToken(token);
    await SecureStore.deleteItemAsync(PUSH_TOKEN_KEY);
  }
}

export function setupNotificationListeners(
  onNotification?: (notification: Notifications.Notification) => void,
  onNotificationResponse?: (
    response: Notifications.NotificationResponse,
  ) => void,
): () => void {
  const receivedSub = Notifications.addNotificationReceivedListener(
    (notification) => {
      onNotification?.(notification);
    },
  );

  const responseSub = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      onNotificationResponse?.(response);
    },
  );

  return () => {
    receivedSub.remove();
    responseSub.remove();
  };
}

export function getCurrentPushToken(): string | null {
  // SecureStore is async; callers that need the token should await registerForPushNotifications
  return null;
}

export async function clearNotificationBadge(): Promise<void> {
  await Notifications.setBadgeCountAsync(0);
}

export async function scheduleLocalNotification(
  title: string,
  body: string,
  seconds: number = 2,
): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds,
    },
  });
}
