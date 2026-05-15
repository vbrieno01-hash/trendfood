Objetivo
Corrigir o erro ao clicar em cancelar/recusar no dashboard quando o pedido iFood entra em solicitação de cancelamento, ajustando o fluxo para a versão correta da plataforma de negociação e evitando 502 na UI.

Diagnóstico
- O erro atual não é mais “already cancelled”.
- A falha reproduzida foi na ação `deny` do `ifood-handle-cancellation`.
- O backend hoje chama `POST /order/v1.0/orders/{id}/denyCancellation`.
- O iFood responde `400 InvalidParameter: Negotiation platform is only available in version 2`.
- A própria base já documenta que `HANDSHAKE_*` está apenas parcial/manual, então a UI foi ligada a um fluxo que o backend ainda não implementa corretamente para negociação.

O que vou implementar
1. Ajustar a edge function `ifood-handle-cancellation`
- Separar claramente os dois cenários:
  - `accept`: manter o fluxo de aceitação de cancelamento, com tolerância a `already cancelled`.
  - `deny`: trocar o endpoint/payload para o fluxo compatível com a plataforma de negociação v2 do iFood.
- Padronizar o tratamento de erros para não devolver 502 bruto quando o iFood responder erro funcional conhecido.
- Registrar logs mais específicos em `ifood_event_log` para aceitar, recusar e falhas de negociação.

2. Proteger a UI do dashboard
- Atualizar `src/components/dashboard/IFoodOrderChip.tsx` para exibir mensagens mais úteis quando o backend retornar erro funcional do iFood.
- Se o pedido estiver num cenário não suportado pela API atual, mostrar feedback claro em vez de erro genérico.

3. Validar o fluxo real
- Testar o clique de `Recusar` com pedido real novo.
- Confirmar que:
  - não retorna mais 502 por incompatibilidade de versão;
  - o estado local do pedido fica consistente;
  - os logs registram corretamente a operação.

Detalhes técnicos
- Arquivos envolvidos:
  - `supabase/functions/ifood-handle-cancellation/index.ts`
  - `src/components/dashboard/IFoodOrderChip.tsx`
- Evidência usada no diagnóstico:
  - request `POST .../functions/v1/ifood-handle-cancellation` com body `{"order_id":"2d9602e6-da68-498e-bbfe-89b84469da03","action":"deny"}`
  - resposta `502` com erro interno originado por `400 InvalidParameter: Negotiation platform is only available in version 2`
- Estado atual da base confirma a lacuna:
  - `HANDSHAKE_*` está documentado como manual/parcial
  - a edge function usa `denyCancellation` em v1

Resultado esperado
- O botão deixa de quebrar com 502.
- O fluxo de recusa passa a conversar com o modelo correto de negociação do iFood.
- A UI fica resiliente mesmo quando o iFood devolver erro funcional conhecido.