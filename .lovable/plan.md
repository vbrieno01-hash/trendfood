

# Melhorias para Facilitar a Vida dos Lojistas

## ✅ Concluído

### 1. Pausar Loja Temporariamente
- Adicionado campo `paused` na tabela `organizations`
- Toggle no dashboard Home para pausar/reativar
- Banner na página pública (UnitPage) bloqueando pedidos quando pausada

### 2. Duplicar Item do Cardápio
- Botão "Duplicar" (ícone Copy) em cada item do cardápio no MenuTab
- Cria cópia com nome "(Cópia) Nome do Item" no formulário de edição

### 3. Exportar Histórico CSV
- Botão "Exportar CSV" no HistoryTab
- Exporta pedidos filtrados com data, mesa, itens, valor, status e observações

---

## 🔜 Pendente

### 4. Notificações Push de Novos Pedidos
- Usar Web Push API + Service Worker
- Pedir permissão ao usuário no dashboard

### 5. Relatório Diário Automático no WhatsApp
- Edge function agendada (cron) às 23h
- Resumo do dia enviado via WhatsApp
