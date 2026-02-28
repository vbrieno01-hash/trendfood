

# Plano: Adicionar Pagamento por Cartão de Crédito

## Contexto
A opção "Cartão" já existe no checkout mas está desabilitada (`opacity-50 pointer-events-none`). A edge function `create-mp-payment` já suporta `card_token`. A secret `MERCADO_PAGO_PUBLIC_KEY` já está configurada. Falta integrar o SDK JS do Mercado Pago no frontend para tokenizar o cartão.

## Arquivos a editar

### 1. `index.html`
- Adicionar `<script src="https://sdk.mercadopago.com/js/v2"></script>` no `<head>`

### 2. `src/vite-env.d.ts`
- Declarar tipo global `MercadoPago` para o SDK (evitar erros TS)

### 3. `src/components/dashboard/SubscriptionTab.tsx`
Mudanças:
- **Desbloquear** a opção Cartão (remover `opacity-50 pointer-events-none` e `disabled`)
- **Adicionar estados** para campos do cartão: `cardNumber`, `cardHolder`, `cardExpiry`, `cardCvv`, `installments`
- **Quando `paymentMethod === "card"`**, renderizar campos:
  - Número do cartão (Input com máscara `0000 0000 0000 0000`)
  - Nome no cartão
  - Validade MM/YY + CVV lado a lado
  - Parcelas (1x por padrão)
- **No submit com cartão**: usar `new window.MercadoPago(publicKey)` → `mp.createCardToken()` para gerar token seguro, depois enviar `card_token` à edge function
- **Botão dinâmico**: mostrar "Pagar com Cartão" quando método é cartão, "Gerar PIX" quando é PIX
- **Buscar a public key** via uma nova edge function simples que retorna a `MERCADO_PAGO_PUBLIC_KEY` (já cadastrada como secret)

### 4. `supabase/functions/get-mp-public-key/index.ts` (novo)
- Edge function simples que retorna `{ public_key: Deno.env.get("MERCADO_PAGO_PUBLIC_KEY") }`
- Requer autenticação (JWT)
- Evita expor a chave no código fonte do frontend

## Fluxo

```text
Lojista seleciona "Cartão"
  → Campos de cartão aparecem no formulário
  → Preenche número, nome, validade, CVV + CPF/CNPJ
  → Clica "Pagar com Cartão"
  → Frontend busca public key via get-mp-public-key
  → mp.createCardToken({...}) → card_token
  → Envia token + plan + org_id para create-mp-payment
  → MP processa → se approved, org atualizada imediatamente
  → Webhook confirma assíncrono também
```

## Observações
- O SDK do Mercado Pago usa `createCardToken` (método direto, sem iframes) — mais simples de integrar
- A edge function `create-mp-payment` já tem toda a lógica de cartão (token, installments, etc.)
- Se o pagamento for aprovado instantaneamente (comum em cartão), o plano é ativado na hora

