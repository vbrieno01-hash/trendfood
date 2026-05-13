import { Vibrant } from "node-vibrant/browser";
import { buildPaletteFromBase, quickHash, type BrandPalette } from "./colorUtils";

/** Paleta neutra usada como fallback (logos monocromáticas, erro de CORS, etc). */
export const NEUTRAL_PALETTE: BrandPalette = {
  primary: "#1f2937",
  gradient: "#0f172a",
  accent: "#1f2937",
  header_text: "#ffffff",
  logo_hash: "neutral",
};

/**
 * Extrai uma paleta profissional a partir do URL de uma logo.
 * Roda no browser via Canvas. Em caso de erro/CORS, retorna NEUTRAL_PALETTE.
 */
export async function extractBrandPalette(logoUrl: string): Promise<BrandPalette> {
  if (!logoUrl) return NEUTRAL_PALETTE;
  try {
    const palette = await Vibrant.from(logoUrl).getPalette();
    const swatch =
      palette.Vibrant ||
      palette.DarkVibrant ||
      palette.Muted ||
      palette.DarkMuted ||
      palette.LightVibrant ||
      palette.LightMuted;
    if (!swatch) return { ...NEUTRAL_PALETTE, logo_hash: quickHash(logoUrl) };
    const hex = swatch.hex;
    return buildPaletteFromBase(hex, quickHash(logoUrl));
  } catch (err) {
    console.warn("[extractBrandPalette] failed:", err);
    return { ...NEUTRAL_PALETTE, logo_hash: quickHash(logoUrl) };
  }
}