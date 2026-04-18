
## Pedido

Trocar o ícone do robô de ajuda (chat de suporte flutuante que aparece em todas as lojas + dashboard).

## Investigação

Localizei: `src/components/SupportChatWidget.tsx`. Hoje usa `MessageCircle` (balão de mensagem) em **dois lugares**:
- Botão flutuante (canto inferior direito, quando chat está fechado)
- Header do painel (ao lado de "TrendFood Suporte", quando chat está aberto)

Ambos importados de `lucide-react`.

## Sugestões de ícone

| Ícone | Vibe |
|---|---|
| `Bot` | Robô clássico com antena — literal, combina com "robô de ajuda" |
| `Sparkles` | Estrelinhas mágicas — passa ideia de IA |
| `Headphones` | Suporte/atendimento humano |
| `LifeBuoy` | Boia salva-vidas — universal pra "ajuda" |

**Minha recomendação:** `Bot` — você chama de "robô", então o ícone literal de robô faz mais sentido e é mais memorável que um balão genérico.

## Mudança

Em `SupportChatWidget.tsx`:
1. Trocar import: `MessageCircle` → ícone escolhido (mantém `X, Send, Loader2`)
2. Substituir as 2 ocorrências de `<MessageCircle ... />` pelo novo ícone (mesmas classes, mesmo tamanho)

## Risco
Mínimo. Apenas troca visual, sem mexer em lógica de chat/SSE.

## Pergunta antes de executar
Vai com `Bot` (recomendado) ou prefere outro da lista? Se não responder, assumo `Bot`.
