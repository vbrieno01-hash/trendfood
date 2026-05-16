# 2ª Via "Entregador" para Pedidos iFood

## Objetivo
Adicionar uma **2ª via opcional**, sanitizada (sem CPF e sem documento), apenas para pedidos vindos do iFood. A comanda padrão do TrendFood permanece **100% intocada** — mesmo layout, mesma fonte, mesmo fluxo.

## Como detectar pedido iFood
Já existe convenção no projeto: `order.gateway_payment_id` começa com `ifood:`. Usamos exatamente esse check — fora dele, nada muda.

## Onde aparece a 2ª via
1. **Toggle por loja** em `PrinterTab` (Configurações → Impressora):
   - "Imprimir 2ª via sem CPF para pedidos iFood (entregador)" — default **desligado**
   - Persistido em `organizations.settings.ifood_courier_copy` (JSONB já existente)
2. **Botão manual** em cada pedido iFood no KDS/Vendas: "2ª via entregador" (só aparece se `gateway_payment_id LIKE 'ifood:%'`)
3. **Automático após a 1ª via**, somente quando o toggle estiver ligado e o pedido for iFood

## O que muda na 2ª via (vs. comanda padrão)
- **Remove**: linha "CPF/CNPJ" do bloco cliente
- **Remove**: campos `CPF`, `CNPJ_INTERMED`, `AUT` se estiverem em notes
- **Mantém**: nome, telefone, endereço, bairro, referência, itens, total, pagamento
- **Adiciona** cabeçalho destacado: `*** VIA DO ENTREGADOR ***`
- Mesmas dimensões (58/80mm), mesma fonte, mesmo template HTML

## Arquivos a tocar (mínimo)

### Novos
- `src/lib/courierReceipt.ts` — função `buildCourierReceiptData(order)` que chama `buildReceiptData` e zera `customer.doc` + filtra metadata sensível

### Modificados (cirúrgico)
- `src/lib/printOrder.ts` — nova export `printCourierCopy(order, ...)` que reusa `buildPrintHtml` mas com flag `isCourierCopy` (só troca o título e oculta CPF). **`printOrder` original continua idêntico.**
- `src/lib/formatReceiptText.ts` — nova função `formatCourierReceiptText` (não altera `formatReceiptText`)
- `src/components/dashboard/PrinterTab.tsx` — toggle novo
- `src/components/dashboard/OperationsTab.tsx` (KDS) — botão "2ª via entregador" condicional
- `src/hooks/useOrders.ts` ou local de auto-print — após print principal, se `ifood + toggle ligado`, dispara `printCourierCopy`

### NÃO toca
- `src/components/shared/ThermalReceipt.tsx` (preview)
- `buildReceiptData` em `src/lib/receiptData.ts`
- Layout/estilos da comanda padrão
- Fluxo de pedidos TrendFood (cardápio, mesa, balcão)

## Detalhe técnico (curto)
```ts
// courierReceipt.ts
export function buildCourierReceiptData(order: PrintableOrder, storeName?: string) {
  const data = buildReceiptData(order, storeName);
  if (data.customer) {
    data.customer = { ...data.customer, doc: undefined };
  }
  // generalObs: remove linhas CPF:/CNPJ_INTERMED:/AUT:/TAXAS_IFOOD: se vazarem
  if (data.generalObs) {
    data.generalObs = data.generalObs
      .split('\n')
      .filter(l => !/^(CPF|CNPJ_INTERMED|AUT|TAXAS_IFOOD):/i.test(l.trim()))
      .join('\n') || undefined;
  }
  return data;
}
```

`printCourierCopy` reusa `buildPrintHtml` adicionando `<div class="bold center">*** VIA DO ENTREGADOR ***</div>` no topo.

## Garantias de não-regressão
1. Toggle default **off** → comportamento atual idêntico
2. Check `gateway_payment_id LIKE 'ifood:%'` antes de qualquer chamada nova
3. Pedidos TrendFood nunca entram em `printCourierCopy`
4. Nenhuma alteração em `buildReceiptData`, `ThermalReceipt`, ou `formatReceiptText` (funções novas, não mexem nas existentes)
5. Testes existentes (`e2e-receipt-sanitization.test.ts`, `receiptData.test.ts`) continuam passando

## Fora de escopo
- Mudar layout da comanda padrão
- Tornar a 2ª via obrigatória
- Remover CPF de pedidos não-iFood
- Privacidade LGPD em outros pontos (separado)
