
## Nova aba "Robô de Atendimento — Em Breve"

### Onde
Adicionar uma nova aba no grupo **Integrações** do dashboard, ao lado de iFood/WhatsApp/Telegram. Mesmo padrão visual do `IFoodTab.tsx` (card "Em Breve" com SVG animado), mas com um **robô animado de verdade** — sem emojis genéricos.

### Componente novo: `src/components/dashboard/AIBotTab.tsx`

Card com fundo gradiente sutil (tons da marca, não roxo neon clichê) contendo:

**Robô SVG animado (~140x140)** — desenhado à mão em SVG inline:
- **Cabeça quadrada arredondada** com cor primária da plataforma
- **Antena** com bolinha pulsante no topo (animação `pulse`)
- **Dois olhos circulares** que piscam periodicamente (animação custom `blink` — escala Y vai a 0.1 por 150ms a cada 4s)
- **Olhos seguem um leve movimento lateral** (left/right) simulando "pensando" — animação `lookAround` de 6s
- **Boca** = barra horizontal que vira sorriso sutil em loop
- **Corpo** retangular com painel frontal mostrando 3 LEDs sequenciais (verde/amarelo/azul piscando em ordem — efeito "processando")
- **Braços** laterais leves com micro-balanço (rotate ±5deg)
- **Sombra elíptica embaixo** que pulsa suavemente
- **Wrapper float 3s** (sobe e desce 8px) — mesmo padrão do IFoodTab

**Badge "EM BREVE"** com ponto pulsante (mesmo componente visual do IFoodTab, mas cor primária da plataforma em vez de vermelho iFood).

**Texto:**
- Título: **"Robô de Atendimento com IA"**
- Subtítulo: "Atendimento automático 24h via WhatsApp. Responde dúvidas dos clientes, mostra cardápio, anota pedidos e transfere pra você quando precisar."
- Estilo limpo, sem emojis, sem ícones decorativos genéricos.

### Integração no dashboard

**`src/pages/DashboardPage.tsx`** (ou onde as abas de Integrações são registradas — vou confirmar lendo o arquivo):
1. Importar `AIBotTab`.
2. Adicionar entrada na lista de abas do grupo Integrações: `{ value: "ai-bot", label: "Robô IA", component: AIBotTab }` (após iFood ou Telegram, posição a definir após inspeção).
3. Manter mesma assinatura `(orgId: string)` do IFoodTab.

### Animações CSS (dentro do `<style>` do componente, padrão IFoodTab)
```css
@keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
@keyframes blink { 0%,92%,100%{transform:scaleY(1)} 95%{transform:scaleY(0.1)} }
@keyframes lookAround { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-2px)} 75%{transform:translateX(2px)} }
@keyframes ledSeq { 0%,100%{opacity:.2} 50%{opacity:1} }
@keyframes armSwing { 0%,100%{transform:rotate(-3deg)} 50%{transform:rotate(3deg)} }
@keyframes shadowPulse { 0%,100%{transform:scaleX(1);opacity:.3} 50%{transform:scaleX(.85);opacity:.5} }
```

### Resultado
Nova aba **Robô IA — Em Breve** no grupo Integrações, com robô SVG genuinamente animado (piscando, olhando ao redor, LEDs processando, braços balançando, flutuando), sem emojis, comunicação direta sobre atendimento automático via WhatsApp.
