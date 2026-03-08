

## Plano: Mover link do grupo WhatsApp para o menu lateral

O card do WhatsApp foi adicionado dentro do `ReferralSection`, mas o correto é colocá-lo como item do menu lateral do dashboard, entre "Ganhe Desconto" e "Ver página pública".

### Alterações

**1. `src/pages/DashboardPage.tsx` (linhas ~818-819)**
- Inserir um botão/link do grupo WhatsApp entre o botão "Ganhe Desconto" e o link "Ver página pública"
- Estilo: ícone `MessageCircle`, texto "Comunidade WhatsApp", cor verde (emerald), abre link em nova aba
- Mesma estrutura visual dos outros itens do menu

**2. `src/components/dashboard/ReferralSection.tsx`**
- Remover o card "Comunidade TrendFood" com o link do WhatsApp que foi adicionado dentro da seção de indicações

