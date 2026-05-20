
# UI iFood — Homologação

Implementar as 4 telas que faltam para o analista do iFood poder gravar os vídeos de homologação. Sem mudanças de backend (já está pronto).

## 1. Código de retirada (Pickup Code)
**Arquivo:** `src/components/dashboard/IFoodOrderChip.tsx`
- Botão "Validar código de retirada" visível quando `ifood_order_type` indica retirada/`TAKEOUT`.
- Modal com input numérico (4 dígitos).
- Chama `supabase.functions.invoke('ifood-validate-pickup-code', { body: { organization_id, ifood_order_id, code } })`.
- Toast verde se válido, vermelho se inválido.

## 2. Painel de Negociações iFood
**Arquivo novo:** `src/components/dashboard/IFoodDisputesPanel.tsx`
- Lista disputas com `status = 'open'` da tabela `ifood_disputes` (filtradas por `organization_id`).
- Cada card mostra: pedido, mensagem do cliente, countdown até `expires_at`.
- 3 botões: **Aceitar**, **Recusar**, **Alternativa** (modal com tempo extra ou valor parcial).
- Chama `ifood-handshake-respond` com a action correspondente.
- Realtime subscription em `ifood_disputes` para refresh automático.
- Integrar na aba existente do iFood no Dashboard (`IFoodTab.tsx`).

## 3. Código de entrega (Delivery Code)
**Arquivo:** `src/pages/CourierPage.tsx`
- Em pedidos iFood na rota, mostrar input "Código de entrega" + botão "Confirmar entrega".
- Chama `ifood-verify-delivery-code`.
- Só libera marcar como entregue se o código for validado.

## 4. Visualizações no KDS
**Arquivo:** `src/components/dashboard/KitchenTab.tsx` (e/ou `OperationsTab.tsx`)
- Badge laranja "PATCHED" quando `ifood_patched_at` não for nulo.
- Chip com `ifood_driver_name` quando preenchido (entregador iFood designado).
- Seção/faixa separada "Agendados" listando pedidos com `ifood_scheduled_for` futuro — sem disparar alarme contínuo até chegar perto do horário.

## Ordem de execução
1. Painel de Negociações (mais crítico para o vídeo)
2. Modal de Pickup Code no `IFoodOrderChip`
3. Input de Delivery Code no `CourierPage`
4. Badges/seção Agendados no KDS

## Riscos
- Sem sandbox iFood real — testes só funcionam end-to-end via o analista. Garantir que todos os botões respondam visualmente (loading, toast) para o vídeo ficar claro.
- Realtime nas disputas precisa da tabela `ifood_disputes` na publicação `supabase_realtime` (verificar e adicionar se faltar via migration mínima).
