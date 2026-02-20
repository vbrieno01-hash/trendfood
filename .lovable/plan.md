

# Mover Chave PIX para o Backend

## Resumo

A chave PIX (`pix_key`) hoje e retornada pela query publica `useOrganization` e usada no frontend para gerar QR codes estaticos via `buildPixPayload()`. Embora seja um dado de pagamento compartilhavel por natureza, a chave ficara protegida no backend -- o frontend recebera apenas o payload PIX ja montado, sem acesso a chave bruta.

## Situacao Atual

- `pix_key` e consultado via `useOrganization` (query publica, sem autenticacao)
- O frontend usa `buildPixPayload(pixKey, amount, storeName)` para gerar QR codes
- Locais que usam a chave no cliente: `PixPaymentScreen`, `TableOrderPage`, `UnitPage`, `printOrder`, `KitchenTab`
- O dono edita a chave via `StoreProfileTab` (autenticado)

## Estrategia

Criar uma Edge Function que recebe `organization_id` e `amount`, busca a `pix_key` internamente via service role, gera o payload PIX no servidor e retorna apenas o payload pronto. O frontend nunca mais recebe a chave bruta.

## Alteracoes

### 1. Nova Edge Function: `generate-pix-payload`

Recebe `{ organization_id, amount }`, busca a `pix_key` da tabela `organizations` usando service role, executa a logica de `buildPixPayload` no servidor e retorna `{ payload }`. Nao requer autenticacao (clientes anonimos precisam gerar o QR).

### 2. Remover `pix_key` da query publica `useOrganization.ts`

Retirar `pix_key` do `select(...)` da query publica. A chave deixa de ser retornada para visitantes. O campo `pix_confirmation_mode` permanece (necessario para decidir o fluxo de pagamento).

Adicionar um campo booleano derivado `has_pix_key` para que o frontend saiba se a loja tem PIX configurado, sem expor a chave. Isso sera feito via uma query separada ou um campo computado.

Na pratica, como nao podemos adicionar colunas computadas facilmente, a edge function `generate-pix-payload` retornara erro se nao houver chave -- o frontend tratara esse caso.

### 3. Atualizar `PixPaymentScreen.tsx`

Em vez de receber `pixKey` como prop e chamar `buildPixPayload` localmente:
- Remover a prop `pixKey`
- Quando `pixConfirmationMode !== "direct"` (modo estatico), chamar a edge function `generate-pix-payload` para obter o payload
- Usar o payload retornado para renderizar o QR code

### 4. Atualizar `TableOrderPage.tsx`

Substituir a chamada local `buildPixPayload(org.pix_key, ...)` por uma chamada a edge function. O QR code sera gerado a partir do payload retornado pelo backend.

### 5. Atualizar `UnitPage.tsx`

Remover a passagem de `pixKey={org.pix_key}` para `PixPaymentScreen`. Passar apenas `orgId`.

### 6. Atualizar `printOrder.ts` e componentes de cozinha

A funcao `printOrder` hoje recebe `pixKey` e gera o QR localmente. Sera alterada para:
- Receber `pixPayload?: string` (ja montado) em vez de `pixKey`
- Quem chama `printOrder` (KitchenTab, KitchenPage, DashboardPage) buscara o payload via edge function quando necessario, ou passara `undefined` para imprimir sem QR PIX

Alternativa mais simples: como a impressao e uma acao do dono autenticado, o dono pode consultar sua propria `pix_key` via uma query autenticada separada. Mas para manter consistencia, usaremos a edge function.

### 7. Manter `pix_key` acessivel ao dono em `StoreProfileTab`

O `StoreProfileTab` ja faz query autenticada (`organization` vem do contexto auth). A query em `useAuth.tsx` sera atualizada para incluir `pix_key` -- como e filtrada por `user_id = auth.uid()`, apenas o dono ve sua propria chave.

### 8. Atualizar `supabase/config.toml`

Adicionar configuracao para a nova edge function com `verify_jwt = false` (clientes anonimos precisam gerar QR).

## Fluxo Apos a Mudanca

```text
Cliente abre checkout
  |
  v
Frontend chama edge function generate-pix-payload
  com { organization_id, amount }
  |
  v
Edge function busca pix_key via service role
  gera payload EMV/QRCPS
  retorna { payload } (sem a chave)
  |
  v
Frontend renderiza QR code com o payload
```

## O que NAO muda

- Tabelas e colunas do banco (conforme solicitado)
- Fluxo de pagamento via gateway (ja usa edge functions)
- Edicao da chave PIX pelo dono (StoreProfileTab)
- RLS policies existentes
- Navegacao entre paginas

