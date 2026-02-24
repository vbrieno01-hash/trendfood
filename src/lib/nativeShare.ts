import { Capacitor } from "@capacitor/core";

/**
 * On native platforms, writes a blob to cache and opens the share sheet.
 * Returns true if handled natively, false if should fallback to web.
 */
export async function shareFileNative(
  blob: Blob,
  fileName: string,
  title: string
): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;

  try {
    const { Filesystem, Directory } = await import("@capacitor/filesystem");
    const { Share } = await import("@capacitor/share");

    // Convert blob to base64
    const base64 = await blobToBase64(blob);

    await Filesystem.writeFile({
      path: fileName,
      directory: Directory.Cache,
      data: base64,
    });

    const { uri } = await Filesystem.getUri({
      directory: Directory.Cache,
      path: fileName,
    });

    await Share.share({
      title,
      url: uri,
      dialogTitle: title,
    });

    // Clean up
    try {
      await Filesystem.deleteFile({ path: fileName, directory: Directory.Cache });
    } catch {
      // ignore cleanup errors
    }

    return true;
  } catch (err) {
    console.error("[nativeShare] Error sharing file:", err);
    return false;
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Remove data URL prefix (data:...;base64,)
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}
