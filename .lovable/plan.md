

## Substituir ícone genérico por SVG animado no estado vazio do Estoque

### Arquivo
- `src/components/dashboard/StockTab.tsx` (linha ~93)

### Implementação
Substituir `<Package className="w-10 h-10 mx-auto mb-3 opacity-40" />` por um SVG inline animado de caixa/pacote com:
- Animação `float` suave (3s ease-in-out infinite)
- Gradiente radial de fundo com pulse
- Ícone de caixa aberta estilizado (~96x96)
- Cores usando `hsl(var(--muted-foreground))` consistente com os outros empty states

Uma substituição visual, zero mudança de lógica.

