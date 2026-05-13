## Objetivo
Eliminar qualquer exposição pública de leitura na tabela `deliveries` e garantir que apenas membros da organização (dono) e admins da plataforma possam ler entregas.

## Situação atual
Ao inspecionar `pg_policies` para `public.deliveries`, encontrei estas policies de SELECT:

- `deliveries_select_owner` — restrita ao dono da organização (`organizations.user_id = auth.uid()`).
- `deliveries_select_admin` — restrita a `has_role(auth.uid(),'admin')`.

A policy `deliveries_select_public` mencionada no scan **não existe mais** no banco (provavelmente foi removida em migração anterior, mas o scanner ainda referencia o snapshot). Mesmo assim, vou garantir a remoção idempotente e adicionar a policy nominal solicitada para fechar o aviso.

Os entregadores (couriers) **não dependem de policy pública** — eles leem via funções `SECURITY DEFINER` (`get_pending_deliveries`, `get_my_deliveries`), então a remoção do acesso público não os quebra.

Não há tabela `profiles` com `organization_id` neste projeto; o vínculo dono↔org é feito via `organizations.user_id`. A policy nova segue esse padrão (não a sugestão genérica que assume `profiles.organization_id`).

## Mudanças (apenas RLS — nenhuma alteração de schema, dados ou código)

Migration única:

```sql
-- 1. Remover qualquer resquício da policy pública
DROP POLICY IF EXISTS deliveries_select_public ON public.deliveries;

-- 2. Policy nominal pedida pelo usuário (escopo: dono da organização autenticado)
DROP POLICY IF EXISTS users_can_select_their_org_deliveries ON public.deliveries;
CREATE POLICY users_can_select_their_org_deliveries
ON public.deliveries
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE o.id = deliveries.organization_id
      AND o.user_id = auth.uid()
  )
);

-- 3. Garantir policy de admin (idempotente)
DROP POLICY IF EXISTS deliveries_select_admin ON public.deliveries;
CREATE POLICY deliveries_select_admin
ON public.deliveries
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
```

A policy `deliveries_select_owner` pré-existente é equivalente a `users_can_select_their_org_deliveries` e pode coexistir (policies SELECT são OR). Mantida para não quebrar nada.

## Garantias de segurança
- **Anônimos**: zero acesso de SELECT em `deliveries`.
- **Donos**: continuam vendo entregas da própria organização.
- **Admins da plataforma**: continuam vendo tudo.
- **Couriers**: continuam funcionando via RPCs `SECURITY DEFINER` já existentes.
- Coluna `organization_id` preservada, nenhum dado removido, nenhuma alteração de front-end.