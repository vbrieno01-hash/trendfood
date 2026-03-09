

## Plano: Adicionar botão "Deletar todos os itens"

### Funcionalidade
Adicionar um botão de lixeira no header do cardápio para permitir deletar todos os itens de uma só vez, com confirmação via AlertDialog.

### Alterações

**1. `src/hooks/useMenuItems.ts`** — adicionar hook `useDeleteAllMenuItems`:
```typescript
export function useDeleteAllMenuItems(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (items: { id: string; image_url: string | null }[]) => {
      // Remove images from storage
      const imagePaths = items
        .filter(i => i.image_url)
        .map(i => i.image_url!.split("/menu-images/")[1]?.split("?")[0])
        .filter(Boolean);
      if (imagePaths.length > 0) {
        await supabase.storage.from("menu-images").remove(imagePaths);
      }
      // Delete all items
      const { error } = await supabase
        .from("menu_items")
        .delete()
        .eq("organization_id", orgId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["menu_items", orgId] });
      toast.success("Todos os itens foram removidos.");
    },
    onError: () => {
      toast.error("Erro ao remover itens.");
    },
  });
}
```

**2. `src/components/dashboard/MenuTab.tsx`**:
- Importar `useDeleteAllMenuItems`
- Adicionar estado `deleteAllOpen` para controlar o dialog de confirmação
- Adicionar botão de lixeira no header (ao lado de Importar CSV/Excel)
- Adicionar AlertDialog de confirmação

### UI
- Botão aparece apenas quando há itens no cardápio
- Ícone: `Trash2`
- Confirmação obrigatória com texto de aviso

