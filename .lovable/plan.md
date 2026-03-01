

## Efeito Neon no Card de Estoque Baixo

O `animate-pulse` do Tailwind apenas altera opacidade, o que é sutil demais. A solução é criar uma animação customizada com `box-shadow` neon vermelho pulsante.

### Alterações

**1. `tailwind.config.ts`** — Adicionar keyframe e animation customizados:
- Keyframe `neon-pulse`: alterna entre `box-shadow` vermelho intenso (glow expandido) e glow reduzido
- Animation `animate-neon-pulse`: aplica o keyframe em loop infinito de ~1.5s

**2. `src/components/dashboard/HomeTab.tsx`** — Trocar `animate-pulse` por `animate-neon-pulse` e adicionar `shadow-lg shadow-red-500/30` como base no card quando `lowStockCount > 0`.

O resultado será um brilho vermelho neon pulsante ao redor do card, muito mais visível que a animação anterior.

