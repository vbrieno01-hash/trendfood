

# Estatisticas do Motoboy + Controle de Pagamento

## O que sera feito

### 1. Nova coluna no banco de dados
Adicionar `courier_paid` (boolean, default false) na tabela `deliveries` para rastrear se o dono ja pagou o motoboy por aquela entrega.

### 2. Painel do Motoboy (`CourierPage.tsx`) - Nova aba "Resumo"
Adicionar uma terceira aba no painel do motoboy com:
- Total de entregas realizadas (todas, nao so do dia)
- Total faturado (soma de fees de entregas concluidas)
- Total a receber (entregas concluidas onde `courier_paid = false`)
- Total ja recebido (entregas concluidas onde `courier_paid = true`)
- Dados atualizados em tempo real via Realtime ja configurado

### 3. Dashboard do Dono (`CourierDashboardTab.tsx`) - Dividas por motoboy
Na secao "Motoboys cadastrados", cada card do motoboy passa a mostrar:
- Quantidade de entregas pendentes de pagamento
- Valor total devido
- Botao "Pagar tudo" que marca todas as entregas daquele motoboy como `courier_paid = true`

Tudo em tempo real (ja tem Realtime configurado para deliveries).

## Alteracoes

| Arquivo | O que muda |
|---------|-----------|
| **Migracao SQL** | Adicionar coluna `courier_paid` boolean default false na tabela `deliveries`. Politica de UPDATE publica ja existe. |
| `src/hooks/useCourier.ts` | Novo hook `useCourierStats` que busca todas as entregas concluidas de um motoboy com totais. Novo hook `usePayCourier` para marcar entregas como pagas. |
| `src/pages/CourierPage.tsx` | Adicionar aba "Resumo" com cards de estatisticas (total entregas, faturado, a receber, recebido). |
| `src/components/dashboard/CourierDashboardTab.tsx` | Na lista de motoboys, mostrar debito pendente por motoboy e botao "Pagar tudo". |

## Detalhes tecnicos

### Migracao
```sql
ALTER TABLE public.deliveries
ADD COLUMN courier_paid boolean NOT NULL DEFAULT false;
```

### Hook `useCourierStats`
Busca todas as entregas com `status = 'entregue'` e `courier_id = X`, retorna:
- `totalDeliveries`: contagem
- `totalEarned`: soma de fees
- `totalPending`: soma de fees onde `courier_paid = false`
- `totalPaid`: soma de fees onde `courier_paid = true`

Usa Realtime ja existente para atualizacao automatica.

### Hook `usePayCourier`
Mutation que faz UPDATE em deliveries SET `courier_paid = true` WHERE `courier_id = X` AND `courier_paid = false` AND `status = 'entregue'`.

### Aba "Resumo" no painel do motoboy
Terceira aba nas Tabs existentes com 4 cards:
- Entregas realizadas (icone CheckCircle2)
- Total faturado (icone DollarSign)  
- A receber (icone Clock, destaque amarelo)
- Ja recebido (icone CheckCircle2, destaque verde)

### Dividas no dashboard do dono
Para cada motoboy cadastrado, calcula a soma de fees das entregas com `courier_paid = false`. Exibe valor e botao de confirmacao com AlertDialog.

