

## Mover Telegram para aba "Integrações"

### O que muda

O bloco de configuração do Telegram sai do `SettingsTab` e vira uma aba própria dentro do grupo "INTEGRAÇÕES" no sidebar (ao lado do iFood), com explicações claras sobre o que é e como funciona.

### Etapas

**1. Criar `src/components/dashboard/TelegramTab.tsx`**
- Componente dedicado com toda a lógica do Telegram (já existente no SettingsTab)
- Seção explicativa no topo: "Receba notificações instantâneas de novos pedidos diretamente no Telegram. Funciona como um complemento às notificações push — sempre que um cliente fizer um pedido, você recebe uma mensagem no Telegram com o número do pedido."
- Passo a passo visual: 1) Crie um bot ou use @userinfobot, 2) Copie seu Chat ID, 3) Cole aqui e teste
- Campos: input do Chat ID, botões Testar e Salvar (código migrado do SettingsTab)

**2. Atualizar `src/pages/DashboardPage.tsx`**
- Adicionar `"telegram"` ao tipo `TabKey`
- Importar `TelegramTab`
- Adicionar item no grupo "INTEGRAÇÕES": `{ key: "telegram", icon: <Send>, label: "Telegram" }`
- Renderizar `<TelegramTab />` quando `activeTab === "telegram"`

**3. Limpar `src/components/dashboard/SettingsTab.tsx`**
- Remover todo o bloco do Telegram (estados, fetch do chat_id, e o JSX da seção)
- Remover imports não mais usados (Send, etc.)

