
# Três Melhorias: Gráfico, Pagamento e Resumo da Conta

## O Problema Atual

O fluxo termina no garçom marcando "Entregue" — mas sem saber o valor total, sem registrar se pagou, e sem como enviar a conta ao cliente. O Home mostra sugestões (que foram removidas do sistema) em vez de dados reais do negócio.

---

## O Que Vai Mudar

### 1. Banco de Dados — Adicionar campo `paid` nos pedidos

A tabela `orders` precisa de uma nova coluna booleana `paid` para registrar se a mesa pagou ou não.

```sql
ALTER TABLE public.orders ADD COLUMN paid boolean NOT NULL DEFAULT false;
```

Sem essa coluna não é possível rastrear pagamentos sem alterar o sistema de status.

---

### 2. HomeTab — Gráfico de Faturamento e Pedidos

O `HomeTab` vai ser refeito para mostrar dados reais de operação do dia/semana:

**Cards de resumo (hoje):**
- Total de pedidos entregues
- Faturamento total (R$)
- Pedidos ainda em aberto (aguardando pagamento)
- Ticket médio por mesa

**Gráfico de barras (últimos 7 dias):**
- Eixo X: dias da semana
- Barras: quantidade de pedidos por dia
- Linha: faturamento por dia

O componente `recharts` já está instalado e é usado no projeto.

---

### 3. WaiterTab — Controle de Pagamento

No painel do garçom, quando um pedido está com status `ready`, além de "Marcar como Entregue", será adicionado o **valor total da mesa** visível no card.

Após marcar como entregue, o pedido vai aparecer numa nova seção **"Aguardando Pagamento"** com:
- Número da mesa
- Lista de itens e quantidades
- **Valor total em destaque**
- Botão **"Confirmar Pagamento"** — que marca `paid = true`
- Botão **"📋 Enviar Conta"** — que abre o WhatsApp com o resumo formatado

**Resumo formatado para WhatsApp (o "prompt único"):**

```
🧾 *Conta da Mesa 3*

1× X-Burguer        R$ 18,00
2× Coca-Cola        R$ 10,00
1× Batata Frita     R$ 12,00
─────────────────
*Total: R$ 40,00*

💳 Formas de pagamento aceitas:
Dinheiro | Pix | Cartão

Obrigado pela visita! 😊
```

O número de WhatsApp do estabelecimento está em `organization.whatsapp` — pode usar para pré-preencher também.

---

## Arquivos Afetados

| Arquivo | Ação |
|---|---|
| Migração SQL | Adicionar coluna `paid boolean DEFAULT false` na tabela `orders` |
| `src/hooks/useOrders.ts` | Adicionar interface `paid` no tipo `Order` + hook `useMarkAsPaid` + query `useDeliveredUnpaidOrders` |
| `src/components/dashboard/HomeTab.tsx` | Reescrever para mostrar gráfico + cards com dados reais de pedidos |
| `src/components/dashboard/WaiterTab.tsx` | Adicionar seção "Aguardando Pagamento" + botão "Confirmar Pagamento" + botão "Enviar Conta" com mensagem WhatsApp formatada |

---

## Fluxo Completo Após a Mudança

```text
Cliente faz pedido
       ↓
Cozinha prepara → marca "Pronto"
       ↓
Garçom entrega → marca "Entregue"
       ↓
Mesa aparece em "Aguardando Pagamento" 
com valor total + botão Enviar Conta
       ↓
Garçom confirma pagamento → mesa sai da lista
       ↓
Home registra o faturamento no gráfico
```

---

## Detalhes Técnicos

- A query de "Aguardando Pagamento" busca `status = 'delivered'` E `paid = false`
- O `useMarkAsPaid` faz `UPDATE orders SET paid = true WHERE id = ?`
- O gráfico usa `recharts` (já instalado) com `BarChart` + `Bar`
- O resumo WhatsApp usa `encodeURIComponent` para montar a URL `wa.me`
- O `HomeTab` vai buscar pedidos com `status = 'delivered'` para calcular faturamento
