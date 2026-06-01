## Objetivo

UI admin completa do sistema de afiliados V8 numa **única aba** (`AffiliatesTab`), sem sub-abas — tudo empilhado em seções colapsáveis/acordeão pra não poluir.

Backend já existe: `affiliate_commission_tiers`, `affiliate_client_goals`, `affiliate_payout_batches`, `affiliate_commissions`.

## Layout da aba (top → bottom)

```text
┌─ Header: "Afiliados" + botão "Novo afiliado"
│
├─ [SEÇÃO 1] KPIs globais (4 cards inline)
│   • Afiliados ativos
│   • Metas ativas
│   • A pagar próximo dia 5
│   • Já pago total
│
├─ [SEÇÃO 2] 💸 Próximo Pagamento — Dia 05/MM (destaque, expansível, aberto por padrão)
│   • Data do próximo dia 5
│   • Tabela: Afiliado | PIX | Parcelas | Valor — com total no rodapé
│   • Botões: [Baixar CSV PIX] [Executar pagamento agora]
│
├─ [SEÇÃO 3] 📊 Tiers V8 (% comissões) — colapsável, fechada por padrão
│   • Grid 6 linhas editáveis: Plano | À Vista % | 3x cada %
│   • Salvar inline por linha
│
├─ [SEÇÃO 4] 👥 Afiliados (cards) — sempre visível
│   • Cada card: nome, código, telegram, PIX
│   • Mini-stats: Lojas | Metas ativas | Aguardando escolha | A pagar dia 5 | Já pago
│   • Ações: Link, Testar TG, Ver metas (abre dialog filtrado), Editar
│
├─ [SEÇÃO 5] 🎯 Metas (clientes trazidos) — colapsável
│   • Filtros chips: Todos / Aguardando / À Vista / 3x / Concluídas / Reembolsadas
│   • Busca por afiliado ou loja
│   • Tabela: Loja | Afiliado | Plano | Modo | Progresso | Comissão | Próxima | Status | Ações
│   • Ações: Ver parcelas (popover), Forçar À Vista, Marcar reembolsado
│
└─ [SEÇÃO 6] 📜 Histórico de batches — colapsável
    • Lista de affiliate_payout_batches desc
    • Click expande as parcelas/afiliados do batch
    • Botão "Baixar CSV" reconstrói CSV
```

Componente de seção: `<details>` estilizado OU `Collapsible` do shadcn com header clicável e chevron.

## Detalhes por seção

### 1. KPIs globais
4 cards `admin-glass` no padrão do `ReferralsTab`. Queries paralelas via React Query.

### 2. Próximo Pagamento Dia 5
- Calcula próximo dia 5 (se hoje ≤ 5, mês atual; senão próximo mês)
- Query: `affiliate_commissions` com `release_at <= próximo_dia_5` AND `paid_in_batch_id IS NULL` AND `status != 'cancelled'`
- Agrupa por afiliado no client
- CSV format: `chave_pix;valor;nome_favorecido;descricao`
- "Executar pagamento agora": confirm dialog → `supabase.functions.invoke('affiliate-monthly-payout', { body: { manual: true } })`

### 3. Tiers V8
- 6 linhas: mensal/trimestral/anual/lifetime/addon_monthly/addon_one_time
- Input numérico 0–100 (1 decimal) pra `upfront_pct` e `installment_pct`
- Botão Salvar por linha; indicador "alterado" antes de salvar
- Header explicativo: "Alterações não afetam metas já criadas."

### 4. Afiliados (refresh do existente)
- **Remove** campo `commission_pct` do form (agora é por tier)
- **Remove** badge de % do card
- **Adiciona** mini-stats novos (metas ativas/aguardando/a pagar/pago)
- Mantém: CRUD, Link copiar, Testar Telegram
- "Ver metas" abre Dialog reaproveitando a tabela da Seção 5 filtrada por aquele afiliado

### 5. Metas (Goals)
- Filtros chips clicáveis no topo
- Busca debounced
- Badge de status colorido (Aguardando = amarelo, Ativo = azul, Concluída = verde, Reembolsada = vermelho)
- Modo badge: Aguardando / À Vista / 3x (1/3, 2/3, 3/3)
- Ações admin com `confirm()`:
  - Forçar À Vista → UPDATE `affiliate_client_goals` SET `mode='upfront'`, recalcula parcela (via edge function `telegram-affiliate-webhook` ou nova RPC)
  - Marcar reembolsado → UPDATE `status='refunded'` + UPDATE parcelas não-pagas para `cancelled`

### 6. Histórico de batches
- Lista de `affiliate_payout_batches` por `paid_at desc`
- Linha clicável expande mostrando `affiliate_commissions` com `paid_in_batch_id = batch.id` agrupadas por afiliado
- Botão "Baixar CSV" reconstrói a partir dessas parcelas

## Arquivos

- `src/components/admin/AffiliatesTab.tsx` — reescrito como composição das seções
- `src/components/admin/affiliates/AffiliateKpis.tsx`
- `src/components/admin/affiliates/NextPayoutSection.tsx`
- `src/components/admin/affiliates/TiersGrid.tsx`
- `src/components/admin/affiliates/AffiliateCards.tsx` (extraído + atualizado)
- `src/components/admin/affiliates/GoalsSection.tsx`
- `src/components/admin/affiliates/BatchesHistory.tsx`
- `src/components/admin/affiliates/csvUtils.ts` — gera CSV PIX
- `src/components/admin/affiliates/useAffiliateData.ts` — hooks React Query compartilhados

Tema: `admin-glass`, `animate-admin-fade-in`, badges semânticos. React Query com `staleTime: 30s`. Sem mexer em edge functions, banco, nem `ReferralsTab`.

## Fora do escopo

- Backend (já pronto)
- Portal afiliado externo
- PIX automático via MP
