import { requireNativeModule, Platform } from "expo-modules-core";

type ImpactStyle = "light" | "medium" | "heavy" | "rigid" | "soft";
type NotificationType = "success" | "warning" | "error";

const HapticFeedbackModule =
  Platform.OS === "ios" ? requireNativeModule("HapticFeedback") : null;

export async function impactAsync(
  style: ImpactStyle = "medium",
): Promise<void> {
  await HapticFeedbackModule?.impactAsync(style);
}

export async function notificationAsync(type: NotificationType): Promise<void> {
  await HapticFeedbackModule?.notificationAsync(type);
}
