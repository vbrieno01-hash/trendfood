

# Plano: Corrigir erro após finalização do pedido e visibilidade do troco

## Problemas identificados

### 1. `paymentMethod` não é salvo no banco de dados (fluxo não-PIX)
Na linha 410 do `UnitPage.tsx`, ao chamar `placeOrder.mutate`, os campos `paymentMethod` e `paid` não são passados. Resultado: o pedido fica com `payment_method: "pending"` em vez de `"Dinheiro"`, `"Cartão de Débito"`, etc. Isso pode confundir o dashboard e causar comportamentos inesperados.

### 2. Seção de troco pode ficar oculta (abaixo da área visível)
A seção "Precisa de troco?" aparece abaixo do `Select` de pagamento dentro do Drawer de checkout. Em telas menores, o usuário precisa rolar para vê-la. Vou adicionar um scroll automático quando "Dinheiro" for selecionado.

### 3. Geocoding (Nominatim) falhando — `Failed to fetch`
A requisição para calcular o frete via Nominatim está falhando (`Failed to fetch`). Isso já é tratado graciosamente ("A combinar via WhatsApp"), mas o retry pode travar o fluxo. Vou melhorar o tratamento para evitar tentativas excessivas.

## O que será feito

### `src/pages/UnitPage.tsx`

1. **Passar `paymentMethod` e `paid` na mutação não-PIX** (~linha 410):
   - Adicionar `paymentMethod: effectivePayment.toLowerCase()` e `paid: false` no objeto passado ao `placeOrder.mutate`

2. **Auto-scroll quando "Dinheiro" for selecionado** (~linha 1116):
   - Criar um `ref` para a div de troco
   - No `onValueChange` do Select de pagamento, quando o valor for "Dinheiro", fazer `scrollIntoView({ behavior: "smooth", block: "center" })` com um pequeno delay (100ms) para garantir que o DOM renderizou

## Seção técnica

```text
Arquivo: src/pages/UnitPage.tsx

Mudança 1 — linhas 410-421:
  placeOrder.mutate({
    ...existente,
+   paymentMethod: effectivePayment.toLowerCase(),
+   paid: false,
  })

Mudança 2 — novo ref + scroll:
  const trocoRef = useRef<HTMLDivElement>(null);
  // No onValueChange do Select de pagamento:
  if (v === "Dinheiro") {
    setTimeout(() => trocoRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 150);
  }
  // Na div de troco (linha 1132):
  <div ref={trocoRef} ...>
```

