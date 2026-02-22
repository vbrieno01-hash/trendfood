

# Remover tela desnecessaria e recuperar slug automaticamente

## Problema
Quando o motoboy abre o PWA sem o parametro `?org=SLUG` na URL, aparece uma tela pedindo para digitar o identificador da loja. Isso e desnecessario porque o motoboy ja esta cadastrado e tem o `courier_id` salvo no localStorage -- basta buscar a organizacao dele no banco.

## Solucao
Quando nao ha slug na URL nem no localStorage, mas ha um `courier_id` salvo, buscar o slug da organizacao do motoboy automaticamente pelo banco de dados, salvar no localStorage e prosseguir normalmente.

A tela de fallback com input manual so aparecera se o motoboy nunca se cadastrou (sem `courier_id` no localStorage).

## Alteracoes

| Arquivo | O que muda |
|---------|-----------|
| `src/pages/CourierPage.tsx` | Adicionar um `useEffect` que, quando `orgSlug` esta vazio mas `courierId` existe, busca o courier no banco, pega o `organization_id`, busca o slug da organizacao e salva no localStorage. Apos isso, redireciona automaticamente com `window.location.href`. |

## Fluxo

```text
PWA abre sem ?org=SLUG
       |
       v
getSavedOrgSlug() retorna algo?
   SIM --> usa o slug normalmente
   NAO --> courier_id existe no localStorage?
             SIM --> busca courier -> org -> slug no banco
                     salva slug no localStorage
                     redireciona para /motoboy?org=SLUG
             NAO --> mostra tela de input manual (fallback)
```

## Detalhes tecnicos

Novo `useEffect` no `CourierPage`:

```typescript
useEffect(() => {
  if (orgSlug || !courierId) return;
  // Buscar org slug a partir do courier cadastrado
  supabase
    .from("couriers")
    .select("organization_id")
    .eq("id", courierId)
    .single()
    .then(({ data: courierData }) => {
      if (!courierData) return;
      supabase
        .from("organizations")
        .select("slug")
        .eq("id", courierData.organization_id)
        .single()
        .then(({ data: orgData }) => {
          if (orgData?.slug) {
            saveOrgSlug(orgData.slug);
            window.location.href = `/motoboy?org=${encodeURIComponent(orgData.slug)}`;
          }
        });
    });
}, [orgSlug, courierId]);
```

A tela de input manual continua existindo como ultimo recurso, mas na grande maioria dos casos o motoboy sera redirecionado automaticamente.
