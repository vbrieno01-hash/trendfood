

# Corrigir Acesso ao Painel Admin

## Problema

O usuario `vendass945@gmail.com` possui a role `admin` na tabela `user_roles`, o que permite acesso ao painel admin. Atualmente existem 2 admins no banco:

- `brenojackson30@gmail.com` (correto)
- `vendass945@gmail.com` (nao deveria ter acesso)

## Solucao

1. **Remover a role admin** do usuario `vendass945@gmail.com` via migration SQL:

```sql
DELETE FROM public.user_roles
WHERE user_id = '50d70a01-2d3a-495b-ba9c-e49794dbd12d'
AND role = 'admin';
```

Isso remove apenas a permissao de admin desse usuario. Ele continua podendo usar a plataforma normalmente como dono de loja.

2. **Nenhuma mudanca de codigo necessaria** -- a verificacao `isAdmin` ja funciona corretamente baseada na tabela `user_roles`. O problema era apenas o dado no banco.

## Detalhes tecnicos

- A funcao `create-admin-user` (edge function) cria admin para `brenojackson30@gmail.com`. Provavelmente a role de admin do `vendass945` foi inserida manualmente ou por teste.
- Apos a migration, apenas `brenojackson30@gmail.com` tera acesso ao `/admin`.

