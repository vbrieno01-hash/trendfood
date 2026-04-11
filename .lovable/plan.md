

## Substituir emojis básicos por ilustrações animadas em todo o dashboard

### Contexto
Vários componentes do dashboard usam emojis de texto simples (✅, 🛎️, 📝, 📋, 🏷️, 📊) como placeholders de "estado vazio". Após o upgrade do iFood, esses emojis parecem genéricos em comparação. Vamos substituir cada um por SVGs inline animados com o mesmo padrão visual do IFoodTab.

### Arquivos e substituições

| Arquivo | Emoji atual | Conceito SVG animado |
|---|---|---|
| `KitchenTab.tsx` (L420) | ✅ | Check-mark circular com animação de "confetti burst" verde |
| `WaiterTab.tsx` (L255) | 🛎️ | Sino de serviço com animação de "ring/wobble" |
| `ReviewsTab.tsx` (L81) | 📝 | Bloco de notas com caneta animada escrevendo |
| `HistoryTab.tsx` (L292) | 📋 | Clipboard com lupa animada fazendo "scan" |
| `CouponsTab.tsx` (L103) | 🏷️ | Tag de desconto com animação de "bounce/shine" |
| `BestSellersTab.tsx` (L100) | 📊 | Barras de gráfico crescendo com animação sequencial |

### Padrão visual
Cada SVG segue o template do IFoodTab:
- ~120x120 viewBox, inline no JSX
- Wrapper com `animate-[float_3s_ease-in-out_infinite]`
- Cores usando a paleta do tema (primary via Tailwind ou cores fixas adequadas ao contexto)
- Gradiente radial de fundo sutil
- Detalhes animados (sparkles, linhas de movimento, pulso)
- Bloco `<style>` com keyframes customizados por componente

### Sem breaking changes
Apenas substituição visual — nenhuma lógica, prop ou estado alterado.

