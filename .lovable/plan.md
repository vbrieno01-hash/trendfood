## Objetivo
Fazer os pedidos de teste do iFood voltarem a aparecer na Cozinha quando você gerar pedidos e clicar em Forçar polling.

## O que vou corrigir
1. Ajustar o fluxo de conexão do iFood para salvar e validar o `merchant_id` correto da loja conectada.
2. Tornar o processamento de eventos mais resiliente quando o webhook receber um `merchantId` diferente do cadastrado manualmente.
3. Reprocessar os eventos que já chegaram, mas ficaram órfãos/duplicados sem virar pedidos internos.
4. Melhorar o feedback da aba Integração iFood para mostrar claramente quando há eventos recebidos sem vínculo com a loja.

## Evidência encontrada
- O polling respondeu `events: 7`, `acked: 7`, `processed: 0`, `duplicates: 7`.
- O webhook registrou `No org for merchantId: 40ea...`.
- Na credencial da loja, o `merchant_id` salvo está diferente (`ffe476df...`).

## Implementação
### Backend
- Revisar `ifood-auth` para obter e persistir o identificador real da loja/merchant retornado pelo iFood.
- Ajustar `ifood-webhook` e `ifood-poll-events` para não perder eventos quando houver divergência de `merchantId` e para permitir recuperação segura dos eventos órfãos.
- Se necessário, adicionar uma migration pequena para suporte ao reaproveitamento/reprocessamento seguro dos logs existentes.

### Frontend
- Atualizar a aba `Integração iFood` para exibir melhor o estado real da conexão e alertar quando o `merchant_id` salvo não bate com o dos eventos recebidos.
- Melhorar a mensagem do botão `Forçar polling` para não parecer sucesso quando os eventos forem todos ignorados por duplicidade ou vínculo incorreto.

## Validação
- Reconectar a loja iFood.
- Gerar novo pedido teste.
- Executar `Forçar polling`.
- Confirmar que o evento entra no log com `internal_order_id` preenchido.
- Confirmar que o card aparece na Cozinha/Produção.
- Validar que webhook + polling não geram duplicação.

## Detalhes técnicos
Arquivos mais prováveis:
- `supabase/functions/ifood-auth/index.ts`
- `supabase/functions/ifood-webhook/index.ts`
- `supabase/functions/ifood-poll-events/index.ts`
- `src/components/dashboard/IFoodTab.tsx`
- possivelmente uma migration em `supabase/migrations/`

```text
Problema atual
Webhook recebe evento -> não encontra org pelo merchantId -> grava log órfão
Polling depois acha o mesmo event.id -> trata como duplicado -> não cria order
Resultado -> nada aparece na cozinha
```