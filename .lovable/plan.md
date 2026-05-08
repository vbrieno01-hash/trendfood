## Problemas identificados

Investiguei o banco e o código. Tem **3 bugs** que se somam:

### Bug 1 — Cadastro pelo Google ignora o `?aff=`
`AuthPage.tsx > handleGoogleOnboard` (linhas 78-124) só seta `referred_by_id`, **nunca** seta `affiliate_id`. Como a maioria das lojas entra pelo Google, elas nascem sem vínculo, mesmo entrando pelo link do afiliado.

### Bug 2 — Card "Lojas" só conta quem já pagou
Em `AffiliatesTab.tsx > totalsFor` (linha 100):
```ts
const stores = new Set(list.map(c => c.organization_id)).size;
```
O `list` vem de `affiliate_commissions`. Ou seja, só conta loja **depois** que ela assina o Pro. Loja Free indicada nunca aparece. Por isso o card do EDUARDO mostra "Lojas: 0" mesmo com lojas indicadas.

### Bug 3 — Telegram só dispara em pagamento, nunca em cadastro
`notify-affiliate-telegram` só é chamado pelo `mp-webhook` (`new_payment`/`refunded`) e pelo `release-affiliate-commissions` (`released`). **Não existe** evento `new_signup`. Por isso o afiliado nunca recebe "fulano se cadastrou pelo seu link".

Confirmado no banco: as 15 lojas mais recentes estão todas com `affiliate_id = NULL`.

---

## Correção

### 1. `src/pages/AuthPage.tsx` — Google onboarding
No `handleGoogleOnboard`, resolver o `affParam` e gravar:
```ts
let affiliateId: string | null = null;
if (affParam) {
  const { data: resolvedId } = await supabase.rpc("resolve_affiliate_code", { _code: affParam });
  if (resolvedId) affiliateId = resolvedId as unknown as string;
}
// ...
if (affiliateId) orgPayload.affiliate_id = affiliateId;
```
E no fim do fluxo (depois do insert da org), se `affiliateId`, invocar `notify-affiliate-telegram` com `event_type: "new_signup"`.

Aplicar a mesma chamada `new_signup` também no `handleSignup` (e-mail/senha) — hoje a org é criada com `affiliate_id` mas nada notifica.

### 2. `supabase/functions/notify-affiliate-telegram/index.ts` — novo evento
Adicionar branch `event_type === "new_signup"` que recebe `affiliate_id` + `organization_id`, busca `organizations`, conta `activeStores` e manda:
```
🎉 Nova loja cadastrada pelo seu link!
🏪 Loja: <nome>
📅 Cadastrou agora
📊 Suas lojas indicadas: <n>
💡 Quando ela assinar o Pro você ganha 50% no 1º mês.
```

### 3. `src/components/admin/AffiliatesTab.tsx` — contar lojas reais
Em `load()`, adicionar:
```ts
const { data: orgsByAff } = await supabase
  .from("organizations")
  .select("id, affiliate_id")
  .not("affiliate_id", "is", null);
```
Salvar num `storesCountMap: Record<string, number>` e usar em `totalsFor` no lugar do `new Set` baseado em comissões. O número real = lojas com `affiliate_id = X`, independente de pagamento.

### 4. Backfill manual (opcional)
Se você lembrar quais das 15 lojas recentes vieram de qual afiliado, rodo um `UPDATE organizations SET affiliate_id = ... WHERE id IN (...)` e disparo o `new_signup` retroativo no Telegram. Sem registro de origem não dá pra adivinhar automático.

### 5. Trigger de robustez (recomendado)
Criar trigger `AFTER INSERT ON organizations` que, se `affiliate_id IS NOT NULL`, chama `notify-affiliate-telegram` via `pg_net`. Assim se um dia tiver outro caminho de signup (admin, futuro fluxo) a notificação não some.

---

## Como testar depois

1. Aba anônima → `https://trendfood.lovable.app/auth?aff=eduardocimba7zhn`
2. Entrar com Google → criar loja teste
3. Painel admin → Afiliados → card EDUARDO mostra "Lojas: 1"
4. Telegram do EDUARDO recebe "🎉 Nova loja cadastrada"
5. Quando essa loja assinar Pro, segunda mensagem com a comissão

## Arquivos alterados
- `src/pages/AuthPage.tsx` (Google + email signup chamam notify)
- `src/components/admin/AffiliatesTab.tsx` (contagem real de lojas)
- `supabase/functions/notify-affiliate-telegram/index.ts` (evento `new_signup`)
- Migração SQL nova (trigger opcional + backfill se você passar a lista)
