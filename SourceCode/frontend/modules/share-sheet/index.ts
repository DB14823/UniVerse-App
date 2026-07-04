import { requireNativeModule, Platform } from "expo-modules-core";

export interface ShareContent {
  message?: string;
  url?: string;
}

export interface ShareResult {
  dismissed: boolean;
}

const ShareSheetModule =
  Platform.OS === "ios" ? requireNativeModule("ShareSheet") : null;

export async function shareAsync(content: ShareContent): Promise<ShareResult> {
  if (!ShareSheetModule) return { dismissed: true };
  return ShareSheetModule.shareAsync(content);
}
