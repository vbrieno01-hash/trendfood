

## Substituir ícone genérico por SVG animado no estado vazio do Cardápio

### Arquivo
- `src/components/dashboard/MenuTab.tsx` (linha 922)

### Implementação
Substituir `<UtensilsCrossed className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />` por um SVG inline animado de talheres cruzados (garfo + faca) com:
- Animação `float` suave (3s ease-in-out infinite)
- Gradiente radial de fundo com pulse
- Estilo consistente com os outros empty states do dashboard (~120x120 viewBox)
- Cores usando `hsl(var(--muted-foreground))` para manter coerência com o tema

