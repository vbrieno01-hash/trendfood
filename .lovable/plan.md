## Problema

Toda loja nova está sendo criada com `affiliate_id = null`, mesmo quando o usuário entra pelo link `?aff=CODIGO`. Por isso:
- A indicação não é gravada na `organizations.affiliate_id`
- O `mp-webhook` não cria registro em `affiliate_commissions`
- O bot do Telegram não notifica o afiliado
- O painel mostra 0 lojas / 0 comissões

## Causa raiz

A tabela `public.affiliates` só tem **uma** RLS policy (`Admins manage affiliates`). Não há policy de SELECT para usuário comum/anônimo. Quando alguém acessa `/auth?aff=brenoxxxx` e tenta cadastrar:

```ts
// src/pages/AuthPage.tsx:248
const { data: aff } = await supabase
  .from("affiliates").select("id")
  .eq("code", affParam).eq("active", true).maybeSingle();
```

O RLS bloqueia o SELECT silenciosamente (retorna `data = null`, sem erro), `affiliateId` fica `null` e a org é gravada sem o vínculo.

## Correção

### 1. Migração SQL

Criar uma função `SECURITY DEFINER` que resolve o código → id sem expor a tabela inteira (PIX, telegram_chat_id, comissão, etc. continuam protegidos):

```sql
CREATE OR REPLACE FUNCTION public.resolve_affiliate_code(_code text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.affiliates
  WHERE lower(code) = lower(_code) AND active = true
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_affiliate_code(text) TO anon, authenticated;
```

### 2. AuthPage.tsx

Trocar o `.from("affiliates").select(...)` por:

```ts
if (affParam) {
  const { data: id } = await supabase.rpc("resolve_affiliate_code", { _code: affParam });
  if (id) affiliateId = id as string;
}
```

### 3. Backfill (opcional, recomendado)

Pra recuperar lojas recentes que vieram do link mas não tiveram o vínculo gravado, posso te mostrar uma query que cruza `localStorage`/created_at — porém **não dá pra fazer 100% automático** sem registro de qual link cada usuário acessou. O melhor é você me passar quais lojas das últimas semanas vieram de afiliado e eu rodo um `UPDATE` direto.

## Verificação após aplicar

1. Abrir aba anônima em `https://trendfood.lovable.app/auth?aff=<codigo>`
2. Cadastrar uma loja de teste
3. Conferir no admin → Afiliados que apareceu em "Lojas: 1" pro afiliado correto
4. Quando essa loja assinar Pro, comissão é criada e Telegram dispara

## Arquivos alterados
- Nova migração SQL (função + grant)
- `src/pages/AuthPage.tsx` (1 trecho, ~5 linhas)
