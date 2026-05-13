import { buildPaletteFromBase, quickHash, rgbToHsl, type BrandPalette } from "./colorUtils";

/** Paleta neutra usada como fallback (logos monocromáticas, erro de CORS, etc). */
export const NEUTRAL_PALETTE: BrandPalette = {
  primary: "#1f2937",
  gradient: "#0f172a",
  accent: "#1f2937",
  header_text: "#ffffff",
  logo_hash: "neutral",
};

/** Remove cache-busters como ?t=123 antes de hashear/fetch. */
function normalizeUrl(u: string): string {
  try {
    const url = new URL(u);
    url.search = "";
    return url.toString();
  } catch {
    return u.split("?")[0];
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = url;
  });
}

/**
 * Amostra pixels de uma imagem em canvas e elege a cor dominante "interessante"
 * via histograma HSL. Ignora transparente, quase-branco e quase-preto.
 * Retorna null se nada utilizável foi encontrado.
 */
function dominantColorFromImage(img: HTMLImageElement): string | null {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, size, size);
  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(0, 0, size, size).data;
  } catch {
    // canvas tainted (CORS) → não conseguimos ler
    return null;
  }

  // Buckets: 12 hues × 4 sat × 4 lum = 192 buckets
  const HUE_BINS = 12;
  const SAT_BINS = 4;
  const LUM_BINS = 4;
  const buckets: Record<string, { count: number; r: number; g: number; b: number }> = {};
  let saturatedSamples = 0;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
    if (a < 200) continue;
    const { h, s, l } = rgbToHsl(r, g, b);
    if (l > 95 || l < 8) continue; // ignora branco/preto puros
    const isSat = s >= 15;
    if (isSat) saturatedSamples++;
    const hb = Math.floor((h / 360) * HUE_BINS) % HUE_BINS;
    const sb = Math.floor((s / 100) * SAT_BINS);
    const lb = Math.floor((l / 100) * LUM_BINS);
    // Penaliza cores desaturadas: peso menor
    const weight = isSat ? 1 + s / 50 : 0.2;
    const key = `${hb}-${sb}-${lb}`;
    if (!buckets[key]) buckets[key] = { count: 0, r: 0, g: 0, b: 0 };
    buckets[key].count += weight;
    buckets[key].r += r * weight;
    buckets[key].g += g * weight;
    buckets[key].b += b * weight;
  }

  const entries = Object.values(buckets);
  if (!entries.length) return null;
  entries.sort((a, b) => b.count - a.count);
  const top = entries[0];

  // Se a logo é praticamente monocromática (poucos pixels saturados), retorna null
  // para deixar o caller usar a paleta neutra escura.
  if (saturatedSamples < 20) return null;

  const r = Math.round(top.r / top.count);
  const g = Math.round(top.g / top.count);
  const b = Math.round(top.b / top.count);
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * Extrai uma paleta profissional a partir do URL de uma logo.
 * Roda no browser via Canvas (sem dependências externas). Em caso de erro/CORS, retorna NEUTRAL_PALETTE.
 */
export async function extractBrandPalette(logoUrl: string): Promise<BrandPalette> {
  if (!logoUrl) return NEUTRAL_PALETTE;
  const cleanUrl = normalizeUrl(logoUrl);
  const hash = quickHash(cleanUrl);
  try {
    const img = await loadImage(cleanUrl);
    const dominant = dominantColorFromImage(img);
    if (!dominant) {
      console.info("[extractBrandPalette] no dominant color found, using neutral");
      return { ...NEUTRAL_PALETTE, logo_hash: hash };
    }
    const palette = buildPaletteFromBase(dominant, hash);
    console.info("[extractBrandPalette] dominant=", dominant, "→ palette=", palette);
    return palette;
  } catch (err) {
    console.warn("[extractBrandPalette] failed:", err);
    return { ...NEUTRAL_PALETTE, logo_hash: hash };
  }
}