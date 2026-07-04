import { requireNativeModule, Platform } from "expo-modules-core";

export interface ImagePickerResult {
  canceled: boolean;
  uri: string | null;
}

const NativeImagePickerModule =
  Platform.OS === "ios" ? requireNativeModule("NativeImagePicker") : null;

export async function pickImageAsync(): Promise<ImagePickerResult> {
  if (!NativeImagePickerModule) return { canceled: true, uri: null };
  return NativeImagePickerModule.pickImageAsync();
}
