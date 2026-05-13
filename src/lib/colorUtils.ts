// Utilitários de cor: HEX <-> HSL, contraste WCAG, hash simples.

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "").trim();
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const num = parseInt(full, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn: h = ((gn - bn) / d + (gn < bn ? 6 : 0)); break;
      case gn: h = ((bn - rn) / d + 2); break;
      default: h = ((rn - gn) / d + 4);
    }
    h *= 60;
  }
  return { h, s: s * 100, l: l * 100 };
}

export function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  const sn = s / 100, ln = l / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r1 = 0, g1 = 0, b1 = 0;
  if (hp >= 0 && hp < 1) { r1 = c; g1 = x; }
  else if (hp < 2) { r1 = x; g1 = c; }
  else if (hp < 3) { g1 = c; b1 = x; }
  else if (hp < 4) { g1 = x; b1 = c; }
  else if (hp < 5) { r1 = x; b1 = c; }
  else { r1 = c; b1 = x; }
  const m = ln - c / 2;
  return { r: (r1 + m) * 255, g: (g1 + m) * 255, b: (b1 + m) * 255 };
}

export function hexToHsl(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHsl(r, g, b);
}

export function hslToHex(h: number, s: number, l: number) {
  const { r, g, b } = hslToRgb(h, s, l);
  return rgbToHex(r, g, b);
}

/** Luminância relativa WCAG. */
export function relativeLuminance(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** Retorna #fff ou #000 com base na luminância de um fundo. */
export function pickContrastText(bgHex: string): "#ffffff" | "#000000" {
  return relativeLuminance(bgHex) > 0.5 ? "#000000" : "#ffffff";
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * "Profissionaliza" uma cor: clampa S/L para uma faixa segura
 * (contraste OK em fundo claro/escuro, sem berrante e sem lavado).
 * Cores quase monocromáticas (S < 10) viram cinza-escuro neutro.
 */
export function professionalize(hex: string): string {
  const { h, s, l } = hexToHsl(hex);
  if (s < 10) return "#1f2937"; // cinza-zinc-800 elegante
  return hslToHex(h, clamp(s, 45, 75), clamp(l, 42, 55));
}

/** Hash simples (djb2) → string base36. Usado pra detectar mudança de logo. */
export function quickHash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

export interface BrandPalette {
  primary: string;
  gradient: string;
  accent: string;
  header_text: string;
  logo_hash: string;
}

/**
 * A partir de uma cor base, deriva paleta completa profissional.
 */
export function buildPaletteFromBase(baseHex: string, logoHash: string): BrandPalette {
  const primary = professionalize(baseHex);
  const { h, s, l } = hexToHsl(primary);
  const gradient = hslToHex(h, s, clamp(l - 15, 18, 45));
  return {
    primary,
    gradient,
    accent: primary,
    header_text: pickContrastText(gradient),
    logo_hash: logoHash,
  };
}