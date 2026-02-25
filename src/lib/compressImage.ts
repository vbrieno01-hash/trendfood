export interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

const DEFAULT_OPTIONS: Required<CompressOptions> = {
  maxWidth: 1200,
  maxHeight: 1200,
  quality: 0.8,
};

function supportsWebP(): Promise<boolean> {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const dataUrl = canvas.toDataURL("image/webp");
    resolve(dataUrl.startsWith("data:image/webp"));
  });
}

export async function compressImage(file: File, opts?: CompressOptions): Promise<File> {
  // Skip non-image files
  if (!file.type.startsWith("image/")) {
    console.log("[compressImage] Not an image, skipping:", file.type);
    return file;
  }

  const { maxWidth, maxHeight, quality } = { ...DEFAULT_OPTIONS, ...opts };
  const originalSize = file.size;

  try {
    const bitmap = await createImageBitmap(file);
    let { width, height } = bitmap;

    // Calculate new dimensions maintaining aspect ratio
    if (width > maxWidth || height > maxHeight) {
      const ratio = Math.min(maxWidth / width, maxHeight / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas context unavailable");
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const useWebP = await supportsWebP();
    const mimeType = useWebP ? "image/webp" : "image/jpeg";
    const ext = useWebP ? "webp" : "jpg";

    const blob: Blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
        mimeType,
        quality,
      );
    });

    const baseName = file.name.replace(/\.[^.]+$/, "");
    const compressed = new File([blob], `${baseName}.${ext}`, { type: mimeType });

    console.log(
      `[compressImage] ${file.name}: ${(originalSize / 1024).toFixed(0)}KB → ${(compressed.size / 1024).toFixed(0)}KB (${mimeType}, ${width}x${height})`,
    );

    return compressed;
  } catch (err) {
    console.warn("[compressImage] Compression failed, using original:", err);
    return file;
  }
}
