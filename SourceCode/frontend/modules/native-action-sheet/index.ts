import { requireNativeModule, Platform } from "expo-modules-core";

export interface ActionSheetConfig {
  title?: string;
  message?: string;
  options: string[];
  cancelButtonIndex: number;
  destructiveButtonIndex?: number;
}

export interface ActionSheetResult {
  buttonIndex: number;
}

const NativeActionSheetModule =
  Platform.OS === "ios" ? requireNativeModule("NativeActionSheet") : null;

export async function showActionSheetAsync(
  config: ActionSheetConfig,
): Promise<ActionSheetResult> {
  if (!NativeActionSheetModule) {
    // Android fallback — caller should handle this case
    return { buttonIndex: config.cancelButtonIndex };
  }
  return NativeActionSheetModule.showActionSheetAsync(config);
}
