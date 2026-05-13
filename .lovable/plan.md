## Objetivo
Garantir que apenas usuários autenticados pertencentes à organização da entrega possam executar UPDATE em `deliveries`. Couriers continuam atualizando via RPCs `SECURITY DEFINER` (`courier_accept_delivery`, `courier_complete_delivery`).

## Situação atual
- A policy `deliveries_update_operational` mencionada no scan **não existe mais** (o snapshot atual do schema não lista nenhuma policy UPDATE em `deliveries` — atualmente "Can't UPDATE"). O dono não consegue atualizar diretamente, mas o frontend chama `useCancelDelivery` (`update status='cancelada'`) e há fluxos de "marcar como paga". Hoje esses updates falham silenciosamente.
- Não há tabela `profiles` com `organization_id`; o vínculo dono↔org é via `organizations.user_id`.

## Mudanças (apenas RLS — nenhuma alteração de código frontend, schema ou dados)

```sql
-- 1. Remover qualquer resquício da policy pública
DROP POLICY IF EXISTS deliveries_update_operational ON public.deliveries;

-- 2. Policy nominal pedida: só autenticado dono da organização
DROP POLICY IF EXISTS authenticated_users_update_operational ON public.deliveries;
CREATE POLICY authenticated_users_update_operational
ON public.deliveries
FOR UPDATE
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE o.id = deliveries.organization_id
      AND o.user_id = auth.uid()
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE o.id = deliveries.organization_id
      AND o.user_id = auth.uid()
  )
);

-- 3. Garantir UPDATE para admin da plataforma (idempotente)
DROP POLICY IF EXISTS deliveries_update_admin ON public.deliveries;
CREATE POLICY deliveries_update_admin
ON public.deliveries
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
```

## Garantias
- **Anônimos**: bloqueados de qualquer UPDATE em `deliveries`.
- **Donos**: podem cancelar entrega, marcar como paga, etc. (mantém `useCancelDelivery` e fluxos existentes funcionando).
- **Admins da plataforma**: continuam com acesso total.
- **Couriers**: continuam aceitando/completando via funções `SECURITY DEFINER` — não dependem de policy UPDATE.
- Nenhuma coluna alterada, nenhum dado removido, nenhum código de frontend tocado.