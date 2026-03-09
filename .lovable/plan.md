

## Correções Seguras (Sem Tocar em Dados)

Entendi sua preocupação! **Todas as correções serão apenas em código TypeScript/React** — nenhuma migração de banco ou alteração de dados.

---

### O Que Vou Corrigir

| Correção | Tipo | Risco aos Dados |
|----------|------|-----------------|
| Warning de `forwardRef` no AlertDialogFooter | Código React | ❌ Zero |
| Melhorar tipagem em componentes | Código TypeScript | ❌ Zero |

---

### Arquivo a Modificar

**`src/components/ui/alert-dialog.tsx`** (linhas 51-54)

Converter `AlertDialogFooter` de function component simples para `React.forwardRef` para eliminar o warning no console.

**Antes:**
```tsx
const AlertDialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />
);
```

**Depois:**
```tsx
const AlertDialogFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />
));
AlertDialogFooter.displayName = "AlertDialogFooter";
```

---

### Garantias

1. **Nenhuma migração SQL** será executada
2. **Nenhum dado será deletado** ou modificado
3. Apenas arquivos `.tsx` serão editados
4. As políticas RLS permanecem intactas

