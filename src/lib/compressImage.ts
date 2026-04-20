export interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

const DEFAULT_OPTIONS: Required<CompressOptions> = {
  maxWidth: 1024,
  maxHeight: 1024,
  quality: 0.75,
};

// Threshold above which we run a second, more aggressive compression pass.
const SECOND_PASS_THRESHOLD_BYTES = 1.5 * 1024 * 1024; // 1.5MB

function supportsWebP(): Promise<boolean> {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const dataUrl = canvas.toDataURL("image/webp");
    resolve(dataUrl.startsWith("data:image/webp"));
  });
}

async function compressOnce(
  file: File,
  maxWidth: number,
  maxHeight: number,
  quality: number,
): Promise<File> {
  const bitmap = await createImageBitmap(file);
  let { width, height } = bitmap;

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
  return new File([blob], `${baseName}.${ext}`, { type: mimeType });
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
    let compressed = await compressOnce(file, maxWidth, maxHeight, quality);

    // Second pass: if still too large, recompress more aggressively.
    if (compressed.size > SECOND_PASS_THRESHOLD_BYTES) {
      console.log(
        `[compressImage] First pass still large (${(compressed.size / 1024).toFixed(0)}KB), running second pass...`,
      );
      try {
        const second = await compressOnce(compressed, 800, 800, 0.65);
        if (second.size < compressed.size) compressed = second;
      } catch (err2) {
        console.warn("[compressImage] Second pass failed, keeping first pass:", err2);
      }
    }

    console.log(
      `[compressImage] ${file.name}: ${(originalSize / 1024).toFixed(0)}KB → ${(compressed.size / 1024).toFixed(0)}KB (${compressed.type})`,
    );

    return compressed;
  } catch (err) {
    console.warn("[compressImage] First pass failed, trying aggressive fallback:", err);
    // Fallback: try aggressive single pass before giving up to original
    try {
      const fallback = await compressOnce(file, 800, 800, 0.65);
      console.log(
        `[compressImage] Fallback ok: ${(originalSize / 1024).toFixed(0)}KB → ${(fallback.size / 1024).toFixed(0)}KB`,
      );
      return fallback;
    } catch (err2) {
      console.warn("[compressImage] All compression failed, using original:", err2);
      return file;
    }
  }
}

/**
 * Detects network-level fetch failures that are worth retrying
 * (vs. permission/mime errors which should fail fast).
 */
export function isRetriableUploadError(err: unknown): boolean {
  if (!err) return false;
  const msg = String((err as any)?.message ?? err).toLowerCase();
  const name = String((err as any)?.name ?? "").toLowerCase();
  return (
    msg.includes("failed to fetch") ||
    msg.includes("network") ||
    msg.includes("load failed") ||
    msg.includes("timeout") ||
    name.includes("storageunknownerror") ||
    name === "typeerror"
  );
}

/**
 * Friendly, actionable upload error message (PT-BR) for end users.
 */
export const UPLOAD_NETWORK_ERROR_MESSAGE =
  "Falha de conexão ao enviar a foto. Tente novamente em uma rede melhor (Wi-Fi) ou use uma foto menor.";

/**
 * Wraps an upload promise with retry + exponential backoff.
 * Only retries on network-style errors. Other errors (permission, mime) fail fast.
 */
export async function uploadWithRetry<T>(
  fn: () => Promise<T>,
  opts: { attempts?: number; baseDelayMs?: number; label?: string } = {},
): Promise<T> {
  const attempts = opts.attempts ?? 3;
  const baseDelay = opts.baseDelayMs ?? 1000;
  const label = opts.label ?? "upload";

  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i === attempts - 1 || !isRetriableUploadError(err)) {
        throw err;
      }
      const delay = baseDelay * Math.pow(2, i);
      console.warn(
        `[${label}] Network error on attempt ${i + 1}/${attempts}, retrying in ${delay}ms...`,
        err,
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}
