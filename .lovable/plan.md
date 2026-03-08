

## Plano: Encerrar turno do motoboy automaticamente quando a loja fechar

### Problema
O motoboy inicia o turno e, quando a loja fecha (horário de funcionamento), o turno continua ativo indefinidamente. Deveria encerrar automaticamente.

### Solução
Adicionar um efeito no `CourierPage.tsx` que verifica periodicamente (a cada 60s) se a loja está fechada. Se estiver fechada e houver um turno ativo, encerra o turno automaticamente.

### Mudanças

**1. `src/pages/CourierPage.tsx`**
- Buscar `business_hours` e `force_open` da organização junto com `id` e `name` no useEffect que já faz fetch por slug (linhas ~204-220)
- Importar `getStoreStatus` de `@/lib/storeStatus`
- Adicionar um `useEffect` que roda a cada 60s: se `getStoreStatus()` retornar `{ open: false }` e existir `activeShift`, chamar `endShiftMutation.mutate(activeShift.id)` e mostrar um toast informando que o turno foi encerrado porque a loja fechou
- Guardar `businessHours` e `forceOpen` em estados locais

### Lógica do auto-encerramento

```typescript
useEffect(() => {
  if (!activeShift || !businessHours) return;
  const check = () => {
    const status = getStoreStatus(businessHours, forceOpen);
    if (status && !status.open) {
      endShiftMutation.mutate(activeShift.id);
      toast.info("Turno encerrado — loja fechou.");
    }
  };
  check(); // verifica imediatamente
  const interval = setInterval(check, 60_000);
  return () => clearInterval(interval);
}, [activeShift, businessHours, forceOpen]);
```

| Arquivo | Mudança |
|---------|---------|
| `src/pages/CourierPage.tsx` | Fetch business_hours/force_open, importar getStoreStatus, useEffect de auto-encerramento |

Mudança isolada em um único arquivo.

