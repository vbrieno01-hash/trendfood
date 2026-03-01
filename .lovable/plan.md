

## Plano: Substituir "Indique o TrendFood" pelo acesso à aba "Ganhe Desconto"

Existem dois locais com "Indique o TrendFood":

### 1. Sidebar do Dashboard (`DashboardPage.tsx`, linha 785-795)
O botão atualmente abre o WhatsApp para compartilhar. Será alterado para navegar à aba `referral` (Ganhe Desconto), usando o mesmo `setActiveTab("referral")`.

### 2. Seção em Configurações (`SettingsTab.tsx`, linhas 87-130)
A seção "Indique o TrendFood" com link genérico será substituída por um botão que leva à aba "Ganhe Desconto", ou removida completamente já que a aba dedicada já existe.

### Mudanças:
- **`DashboardPage.tsx`**: Trocar o `onClick` do botão "Indique o TrendFood" para `setActiveTab("referral")` e renomear para "Ganhe Desconto"
- **`SettingsTab.tsx`**: Remover a seção "Indique o TrendFood" (redundante com a aba dedicada) ou substituir por um link para a aba referral

