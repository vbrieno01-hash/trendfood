

# Plano: Webhook por Email (um link para todos os clientes)

## Problema
Hoje o webhook exige `org_id` (UUID) por loja. Isso significa que para cada cliente novo, voce precisa ir no painel, copiar o UUID e montar um link diferente. Isso nao escala --- especialmente com gateways como Cakto/Kiwify que enviam o **email do comprador** no payload, nao um UUID.

## Solucao
Atualizar o webhook para aceitar tambem um parametro `email`. O sistema busca a loja pelo email do dono (campo `user_id` na tabela `organizations` cruzado com `auth.users`). Assim voce usa **um unico link** para todos os clientes:

```text
https://xrzudhylpphnzousilye.supabase.co/functions/v1/universal-activation-webhook?email={email_do_comprador}&days=30&plan=pro&secret=trendfood123
```

O gateway substitui `{email_do_comprador}` automaticamente com o email de quem pagou.

## O que muda

### Webhook aceita `email` OU `org_id`
- Se `org_id` vier, funciona como hoje (busca direto)
- Se `email` vier, busca o `user_id` pelo email no `auth.users`, depois busca a org pelo `user_id`
- Se nenhum dos dois vier, retorna erro
- Se o email tiver mais de uma loja, ativa a primeira (ou todas --- podemos decidir)

### Tambem aceita POST com body JSON
Gateways como Cakto enviam POST com JSON no body. O webhook vai ler tanto query params (GET) quanto body JSON (POST), pegando o email de campos comuns como `email`, `customer.email`, `buyer.email`.

### UI do link na aba Ativacoes
Atualizar a secao de webhook pronto para mostrar o formato com `{email}` como template, alem de manter a opcao por `org_id`.

## Secao tecnica

### Arquivo alterado

```text
EDIT: supabase/functions/universal-activation-webhook/index.ts
  - Aceitar parametro "email" alem de "org_id"
  - Buscar user pelo email via supabase.auth.admin.listUsers() 
  - Buscar org pelo user_id encontrado
  - Aceitar POST com body JSON para compatibilidade com gateways

EDIT: src/components/admin/ActivationLogsTab.tsx
  - Adicionar opcao de gerar link com {email} como template
  - Mostrar os dois formatos: por org_id (especifico) e por email (universal)
```

### Logica do webhook atualizada

```typescript
// Aceitar email OU org_id
let orgId = params.get("org_id") || body?.org_id;
let email = params.get("email") || body?.email || body?.customer?.email;

if (!orgId && !email) {
  return error("org_id ou email e obrigatorio");
}

// Se veio email, buscar org pelo user_id
if (!orgId && email) {
  const { data: users } = await supabase.auth.admin.listUsers();
  const user = users.users.find(u => u.email === email);
  if (!user) return error("Usuario nao encontrado");
  
  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  
  if (!org) return error("Loja nao encontrada para este email");
  orgId = org.id;
}
// ... resto do fluxo igual
```

### Link universal na UI

```text
┌──────────────────────────────────────────────────┐
│  Link Universal (por email)                       │
│                                                   │
│  ...webhook?email={email}&days=30&plan=pro&secret= │
│                                     [Copiar]      │
│                                                   │
│  Use este link no gateway. O {email} sera          │
│  substituido automaticamente pelo email do         │
│  comprador.                                       │
└──────────────────────────────────────────────────┘
```

