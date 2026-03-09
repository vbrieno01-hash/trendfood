

## Plano: Corrigir auto-encerramento de turno do motoboy quando a loja fecha

### Problema identificado

O `businessHours` e `forceOpen` são carregados **uma única vez** no mount da página (useEffect linha 208-226). Isso significa que:
1. Se o dono alterar `force_open` ou o horário de funcionamento enquanto o motoboy está online, a mudança não é detectada
2. A mutação `endShiftMutation.mutate()` pode ser chamada várias vezes seguidas (a cada 60s) antes do `activeShift` ser invalidado, causando toasts duplicados e chamadas repetidas
3. Não há log ou tratamento de erro se a mutação falhar silenciosamente

### Correção

**`src/pages/CourierPage.tsx`** — 3 ajustes:

1. **Refetch periódico dos dados da org**: Trocar o fetch único por um `useQuery` com `refetchInterval` de 2 minutos (ou re-fetch inline no interval) para capturar mudanças em `business_hours` e `force_open`

2. **Guard contra chamadas duplicadas**: Usar uma ref `endingRef` para evitar que `endShiftMutation.mutate()` seja disparado mais de uma vez

3. **Tratar erro na mutação**: Se falhar, logar e tentar novamente no próximo ciclo

### Código da correção

Substituir o fetch único da org (linhas 208-226) por um que use `useQuery` com refetch:

```typescript
// Replace one-time fetch with periodic query
const { data: orgData } = useQuery({
  queryKey: ["courier-org", orgSlug],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("organizations")
      .select("id, name, business_hours, force_open")
      .eq("slug", orgSlug)
      .single();
    if (error) throw error;
    return data;
  },
  enabled: !!orgSlug,
  refetchInterval: 2 * 60_000, // Re-fetch every 2 min
  staleTime: 60_000,
});
```

E derivar `orgId`, `orgName`, `businessHours`, `forceOpen` do `orgData` em vez de estados separados.

Corrigir o useEffect do auto-end shift:

```typescript
useEffect(() => {
  if (!activeShift || !businessHours) return;
  let ended = false;
  const check = () => {
    if (ended) return;
    const status = getStoreStatus(businessHours, forceOpen);
    if (status && !status.open) {
      ended = true;
      endShiftMutation.mutate(activeShift.id, {
        onError: () => { ended = false; }, // retry next cycle
      });
      toast.info("Turno encerrado — loja fechou.");
    }
  };
  check();
  const interval = setInterval(check, 60_000);
  return () => clearInterval(interval);
}, [activeShift, businessHours, forceOpen]);
```

### Arquivos alterados
- `src/pages/CourierPage.tsx`

