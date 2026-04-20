import { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RotateCcw } from "lucide-react";

interface ColorFieldProps {
  label: string;
  description?: string;
  value: string;
  defaultValue: string;
  onChange: (value: string) => void;
  /** Mini-preview 80×40 mostrando exatamente onde a cor é aplicada */
  preview?: ReactNode;
  /** Mensagem de aviso (ex: contraste baixo). Aparece em amarelo abaixo. */
  warning?: string;
}

export default function ColorField({
  label,
  description,
  value,
  defaultValue,
  onChange,
  preview,
  warning,
}: ColorFieldProps) {
  const isDefault = value.toLowerCase() === defaultValue.toLowerCase();

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <Label className="text-sm font-medium text-foreground">{label}</Label>
        {!isDefault && (
          <button
            type="button"
            onClick={() => onChange(defaultValue)}
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            title={`Restaurar padrão (${defaultValue})`}
          >
            <RotateCcw className="w-3 h-3" />
            Padrão
          </button>
        )}
      </div>
      {description && (
        <p className="text-xs text-muted-foreground mt-0.5 mb-2">{description}</p>
      )}
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-14 rounded-lg border border-border cursor-pointer flex-shrink-0"
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-28 h-9 font-mono text-xs"
          placeholder={defaultValue}
        />
        {preview && (
          <div className="ml-auto rounded-md border border-border overflow-hidden flex-shrink-0" style={{ width: 80, height: 36 }}>
            {preview}
          </div>
        )}
      </div>
      {warning && (
        <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1.5 flex items-center gap-1">
          {warning}
        </p>
      )}
    </div>
  );
}

/**
 * Calcula luminância relativa (WCAG) de uma cor hex.
 * Retorna número entre 0 (preto) e 1 (branco).
 */
function getLuminance(hex: string): number {
  const cleanHex = hex.replace("#", "");
  if (cleanHex.length !== 6) return 0.5;
  const r = parseInt(cleanHex.slice(0, 2), 16) / 255;
  const g = parseInt(cleanHex.slice(2, 4), 16) / 255;
  const b = parseInt(cleanHex.slice(4, 6), 16) / 255;
  const adjust = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * adjust(r) + 0.7152 * adjust(g) + 0.0722 * adjust(b);
}

/**
 * Retorna true se o contraste entre foreground e background for considerado ruim
 * (razão WCAG abaixo de 3.0 — limiar amigável, não bloqueia).
 */
export function checkLowContrast(fg: string, bg: string): boolean {
  try {
    const lFg = getLuminance(fg);
    const lBg = getLuminance(bg);
    const lighter = Math.max(lFg, lBg);
    const darker = Math.min(lFg, lBg);
    const ratio = (lighter + 0.05) / (darker + 0.05);
    return ratio < 3;
  } catch {
    return false;
  }
}
