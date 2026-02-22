

# Corrigir impressao automatica para pedidos de clientes

## Problema
A tabela `fila_impressao` so permite INSERT por usuarios autenticados (dono da loja). Quando um cliente nao-autenticado faz um pedido pela vitrine publica, o pedido e criado com sucesso (tabela `orders` aceita INSERT publico), mas o registro na fila de impressao falha silenciosamente por causa do RLS restritivo. O `usePlaceOrder` tem um try/catch que engole o erro sem avisar.

## Solucao
Adicionar uma politica de INSERT publico na tabela `fila_impressao`, similar ao que ja existe nas tabelas `orders` e `order_items`.

## Etapas

### 1. Migracão de banco de dados
Criar uma nova politica RLS na tabela `fila_impressao` que permita INSERT publico:

```sql
CREATE POLICY "fila_impressao_insert_public"
  ON public.fila_impressao
  FOR INSERT
  WITH CHECK (true);
```

Isso segue o mesmo padrao ja usado em `orders` (`orders_insert_public`) e `order_items` (`order_items_insert_public`).

### 2. Nenhuma alteracao de codigo necessaria
O codigo em `usePlaceOrder` ja chama `enqueuePrint()` corretamente. O problema e exclusivamente a politica de segurança do banco. Uma vez corrigida, os pedidos de clientes nao-autenticados tambem gerarao registros na fila de impressao automaticamente.

## Seguranca
- A politica existente de SELECT/UPDATE/DELETE permanece restrita ao dono da organizacao
- O INSERT publico so permite criar novos registros, nao ler ou modificar existentes
- O robo de impressao usa `service_role` key via Edge Function, entao nao e afetado pelo RLS
- Este padrao e identico ao usado nas tabelas `orders` e `order_items`

