

## Corrigir aba Melhorias vazia

### Diagnóstico
Os 10 registros de melhorias **existem no banco de dados** e o usuário tem a role `admin`. A query da API retorna `[]` (vazio) com status 200, o que indica que o RLS está bloqueando.

Possível causa: o código usa `"improvement_tasks" as any` desnecessariamente (o tipo já existe no `types.ts`). Isso pode causar problemas na tipagem da resposta. Além disso, o componente não captura erros da query.

### Alterações

1. **Corrigir `ImprovementsTab.tsx`**
   - Remover todos os `as any` — usar tipagem nativa do Supabase (já que `improvement_tasks` existe em `types.ts`)
   - Adicionar captura de erro na `fetchTasks` com log e toast
   - Adicionar `console.log` temporário para debug do retorno da query

2. **Verificar/recriar RLS policies** (se necessário)
   - Confirmar que as policies estão aplicadas corretamente na tabela
   - Se o problema persistir, recriar as policies usando `TO public` (mesmo padrão das outras tabelas do projeto) em vez de `TO authenticated`

### Arquivos alterados
- `src/components/admin/ImprovementsTab.tsx` — remover `as any`, adicionar tratamento de erro
- Possível migração SQL para recriar policies com `TO public`

