

## Plano: Corrigir gerenciamento de lojas no painel admin

### Problema
O `AdminStoreManager` constrói um objeto `orgForComponents` com dados mínimos (sem `whatsapp`, `business_hours`, `pix_key`, `store_address`, `delivery_config`, `banner_url`, etc.). Isso faz com que componentes como `StoreProfileTab` inicializem formulários vazios e não consigam salvar corretamente.

### Solução
Buscar os dados completos da organização diretamente do banco ao abrir o gerenciador de loja.

### Arquivos alterados

**1. `src/components/admin/AdminStoreManager.tsx`**
- Adicionar `useQuery` para buscar todos os campos da organização via `supabase.from("organizations").select("*").eq("id", org.id)`
- Substituir o `orgForComponents` estático pelo resultado da query completa
- Mostrar loading skeleton enquanto carrega
- Passar o objeto completo para `MenuTab`, `StoreProfileTab`, `TablesTab`, etc.

**2. `src/pages/AdminPage.tsx`** (ajuste menor)
- Expandir `OrgRow` ou a query de listagem para incluir campos extras necessários (como `primary_color`, `logo_url`, `pix_key`, `delivery_config`, etc.) — ou delegar isso inteiramente ao fetch interno do `AdminStoreManager` (abordagem preferida, sem alterar AdminPage)

### Abordagem técnica
O `AdminStoreManager` já recebe o `org.id`. Basta fazer:
```ts
const { data: fullOrg, isLoading } = useQuery({
  queryKey: ["admin-org-full", org.id],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", org.id)
      .single();
    if (error) throw error;
    return data;
  },
});
```
E usar `fullOrg` como base para `orgForComponents` — preenchendo todos os campos que `StoreProfileTab` e outros componentes esperam.

As políticas de RLS já permitem `SELECT` público na tabela `organizations` e `UPDATE` para admin, então não há mudança no banco.

