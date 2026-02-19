
# Problema: Usuário Admin não existe no sistema

## Causa raiz
O e-mail `brenojackson30@gmail.com` com senha `123@Qpzm` **nunca foi cadastrado** no sistema de autenticação. Por isso o login retorna `invalid_credentials`. O `AdminPage.tsx` está correto — o problema é que o usuário não existe.

## A solução

Criar o usuário admin diretamente via SQL com e-mail já confirmado (sem precisar de verificação por e-mail), usando a função interna do Supabase Auth.

### SQL a executar (migration)

```sql
-- Cria o usuário admin com e-mail e senha já confirmados
SELECT extensions.pgcrypto_gen_random_uuid(); -- apenas para verificar se extensão existe

INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  role,
  aud,
  confirmation_token,
  recovery_token
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'brenojackson30@gmail.com',
  crypt('123@Qpzm', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  now(),
  now(),
  'authenticated',
  'authenticated',
  '',
  ''
)
ON CONFLICT (email) DO NOTHING;
```

Isso cria o usuário com:
- E-mail: `brenojackson30@gmail.com`
- Senha: `123@Qpzm`
- E-mail já confirmado (sem precisar verificar caixa de entrada)
- Papel `authenticated` — necessário para que as políticas RLS permitam as operações do admin

## Fluxo após a correção

```text
Acessa /admin sem login
  → redireciona para /auth?redirect=/admin  ✓ (já implementado)
  → faz login com brenojackson30@gmail.com / 123@Qpzm  ✓ (usuário criado)
  → redireciona automaticamente para /admin  ✓ (já implementado)
  → painel admin abre com lista de lojas e tabela de frete  ✓
```

## Nenhuma alteração de código necessária

O código do `AdminPage.tsx`, `AuthPage.tsx` e o redirect já estão corretos após as últimas correções. O único problema é a ausência do usuário no banco de dados.

## Arquivo modificado

| O que muda | Como |
|---|---|
| Base de usuários (auth.users) | Migration SQL insere o usuário admin com senha criptografada e e-mail confirmado |
