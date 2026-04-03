

## Plano: Subir o balão de chat no mobile para não sobrepor a barra de navegação

### Problema
O botão flutuante do chat de suporte está posicionado em `bottom-5` (20px), o mesmo nível da barra de navegação inferior do mobile (~60px de altura). Os dois se sobrepõem.

### Mudança

| Arquivo | O que |
|---------|-------|
| `src/components/SupportChatWidget.tsx` | Alterar as classes do botão e do painel de chat de `bottom-5` para `bottom-20 lg:bottom-5` — no mobile sobe acima da barra, no desktop mantém a posição atual |

### Detalhes
- Botão flutuante: `bottom-20` no mobile (~80px, acima da nav de ~60px) e `lg:bottom-5` no desktop
- Painel de chat aberto: mesma lógica de posicionamento
- 1 arquivo editado, zero impacto em funcionalidade

