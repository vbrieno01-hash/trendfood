import { Capacitor } from "@capacitor/core";

/**
 * Uses Capacitor Camera plugin on native platforms to pick a photo
 * without triggering Activity destruction on Android.
 * Returns a File object compatible with the existing upload flow.
 */
export async function pickPhotoNative(): Promise<File | null> {
  if (!Capacitor.isNativePlatform()) return null;

  try {
    const { Camera, CameraResultType, CameraSource } = await import("@capacitor/camera");

    const photo = await Camera.getPhoto({
      resultType: CameraResultType.Base64,
      source: CameraSource.Prompt, // Let user choose camera or gallery
      quality: 85,
      width: 1200,
      height: 1200,
    });

    if (!photo.base64String) return null;

    const mimeType = photo.format === "png" ? "image/png" : "image/jpeg";

    // Manual base64→binary conversion (fetch with data: URI fails silently in Android WebViews)
    const byteString = atob(photo.base64String);
    const bytes = new Uint8Array(byteString.length);
    for (let i = 0; i < byteString.length; i++) {
      bytes[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: mimeType });

    const ext = photo.format === "png" ? "png" : "jpg";
    const file = new File([blob], `photo_${Date.now()}.${ext}`, { type: mimeType });
    console.log(`[nativeCamera] File created: ${file.name}, size: ${file.size} bytes`);
    if (file.size === 0) {
      console.error("[nativeCamera] File has 0 bytes — conversion failed");
      return null;
    }
    return file;
  } catch (err: any) {
    // User cancelled — not an error
    if (err?.message?.includes("User cancelled") || err?.message?.includes("cancelled")) {
      return null;
    }
    console.error("[nativeCamera] Error picking photo:", err);
    throw err;
  }
}

export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}
