

## Plano: Melhorar a aba "Ganhe Desconto"

### Problema
A seção atual é funcional mas não deixa claro qual é a recompensa concreta. O lojista precisa entender rapidamente: "o que eu ganho?" e "como funciona?".

### Mudanças no `src/components/dashboard/ReferralSection.tsx`

| # | Melhoria | Detalhe |
|---|----------|---------|
| 1 | **Card de recompensa destacado** | Novo card no topo com fundo gradiente mostrando claramente: "Plano Mensal = +10 dias gratis" e "Plano Anual = +30 dias gratis" |
| 2 | **Passo a passo visual** | Substituir o bloco "Como funciona?" por 3 passos numerados com icones: (1) Copie o link, (2) Amigo se cadastra, (3) Amigo paga e voce ganha dias |
| 3 | **Mensagem motivacional dinamica** | Se count=0: "Comece agora!", se count>0 mas sem bonus: "Seus amigos ainda nao pagaram", se tem bonus: "Parabens! Continue indicando" |
| 4 | **Botao de compartilhar WhatsApp** | Alem do copiar, adicionar botao verde "Enviar no WhatsApp" que abre `wa.me` com mensagem pre-formatada |
| 5 | **Layout dos stats mais limpo** | Reorganizar os 3 cards de estatistica com icones maiores e labels mais claros |

### Detalhes
- 1 arquivo editado (`ReferralSection.tsx`)
- Zero mudancas no banco de dados
- Recompensa exibida de forma clara: "+10 dias (mensal) / +30 dias (anual)" no card principal
- Botao WhatsApp usa `window.open(`https://wa.me/?text=...`)`

