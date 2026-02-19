

# Corrigir acesso ao painel Admin

## Problema encontrado

O usuario `vendass945@gmail.com` (ID: `50d70a01-2d3a-495b-ba9c-e49794dbd12d`) nao possui a role `admin` na tabela `user_roles`. A role admin esta atribuida a outro usuario antigo (ID: `ccdbec3f-...`). Por isso, ao acessar `/admin`, o sistema redireciona para a pagina inicial.

## Solucao

Criar uma migration SQL que insere a role `admin` para o usuario correto na tabela `user_roles`.

## Detalhes tecnicos

### Migration SQL

```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('50d70a01-2d3a-495b-ba9c-e49794dbd12d', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
```

Apos a migration ser aplicada, basta fazer logout e login novamente (ou recarregar a pagina) para que o hook `useAuth` busque a role atualizada e libere o acesso ao painel admin.

Nenhuma alteracao de codigo necessaria -- apenas a insercao do dado no banco.

