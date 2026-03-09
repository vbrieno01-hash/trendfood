

## Plano: Corrigir parsePrice para suportar ponto e vírgula

### Problema
A função `parsePrice` atual remove **todos** os pontos (`.replace(/[R$\s.]/g, "")`), o que quebra valores como `15.50` — transforma em `1550` ao invés de `15.50`.

### Lógica correta
1. Remover `R$`, espaços e separadores de milhar
2. Detectar se o último separador é vírgula ou ponto (decimal)
3. Converter para float

### Alteração

**`src/components/dashboard/ImportMenuDialog.tsx`** — substituir `parsePrice` (linhas 42-48):

```typescript
function parsePrice(raw: unknown): number | null {
  let s = String(raw ?? "").replace(/[R$\s]/g, "").trim();
  if (!s) return null;
  // If both . and , exist, the last one is the decimal separator
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma > lastDot) {
    // e.g. "1.500,50" or "15,50" → remove dots (thousands), replace comma with dot
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (lastDot > lastComma) {
    // e.g. "1,500.50" or "15.50" → remove commas (thousands)
    s = s.replace(/,/g, "");
  }
  // If only one type exists with no thousands context, already handled above
  const num = parseFloat(s);
  return isNaN(num) || num <= 0 ? null : num;
}
```

Exemplos:
- `"15.50"` → `15.5` ✓
- `"15,50"` → `15.5` ✓
- `"R$ 1.500,00"` → `1500` ✓
- `"1,500.00"` → `1500` ✓
- `"R$ 25"` → `25` ✓

