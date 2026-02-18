
# Plano de Implementação — 3 Melhorias Principais

## Diagnóstico do estado atual

Após revisar todo o código, aqui está o status real de cada funcionalidade pedida:

**1. Página Pública + Aparecimento instantâneo no Dashboard**
- A página `/unidade/:slug` já envia sugestões corretamente via `useAddSuggestion`
- O `MuralTab` já busca dados via `useSuggestions`, mas usa polling passivo (React Query com refetch manual)
- Falta: Supabase Realtime na tabela `suggestions` para que a nova sugestão apareça instantaneamente no dashboard sem precisar recarregar a página

**2. Ação de Status com 1 clique**
- O `MuralTab` já tem um `<Select>` para trocar o status, mas ele está dentro de uma `SelectTrigger` pequena e pouco visível
- Falta: Substituir o Select por botões de status clicáveis visualmente claros (chips/badges clicáveis), tornando a troca de status muito mais rápida e intuitiva

**3. Perfil da Loja — Logo e Cor Primária**
- O `StoreProfileTab` JÁ tem tanto o upload de logo quanto o color picker implementados e funcionando
- Portanto, esta funcionalidade está completa. Vamos verificar se há algum problema de UX e polir

## O que será implementado

---

### Mudança 1 — Realtime no MuralTab

Adicionar uma subscription Supabase Realtime na tabela `suggestions` diretamente no `MuralTab`. Quando qualquer cliente enviar uma sugestão na página pública, o dashboard atualiza automaticamente via `postgres_changes`.

Também precisamos habilitar a tabela `suggestions` na publicação Realtime do banco de dados via migration SQL.

**Fluxo técnico:**
```
Cliente envia sugestão na /unidade/:slug
  → INSERT na tabela suggestions
    → Supabase Realtime dispara evento postgres_changes
      → MuralTab recebe o evento
        → queryClient.invalidateQueries(["suggestions", orgId])
          → Lista atualiza instantaneamente ✅
```

**Arquivos modificados:**
- `supabase/migrations/` — Habilitar realtime na tabela `suggestions`
- `src/components/dashboard/MuralTab.tsx` — Adicionar `useEffect` com channel Supabase Realtime

---

### Mudança 2 — Status Chips clicáveis no MuralTab

Substituir o `<Select>` de status por 3 botões visuais de status. Cada botão representa um estado e o atualmente ativo fica destacado. Um clique muda instantaneamente.

Layout do novo componente de status (por card):
```
[ ⏳ Pendente ] [ 🔍 Analisando ] [ ✅ No Cardápio ]
  (amarelo)       (azul)             (verde)
     ↑ ativo = borda grossa + cor de fundo
```

Isso elimina o dropdown e torna a ação de mudar status um clique único, muito mais ágil.

**Arquivo modificado:** `src/components/dashboard/MuralTab.tsx`

---

### Mudança 3 — Polimento do StoreProfileTab

O upload de logo e o color picker já estão implementados. O que vamos melhorar:

- Adicionar um preview ao vivo da cor primária com um mock da página pública (pequeno preview visual mostrando como ficará o botão e o banner da loja)
- Melhorar o layout do color picker para ser mais intuitivo
- Adicionar um botão "Remover logo" para o caso em que o lojista queira voltar a usar o emoji

**Arquivo modificado:** `src/components/dashboard/StoreProfileTab.tsx`

---

## Arquivos a criar/modificar

| Ação | Arquivo | Descrição |
|---|---|---|
| CRIAR | `supabase/migrations/[ts]_enable_realtime_suggestions.sql` | Adiciona suggestions ao realtime |
| MODIFICAR | `src/components/dashboard/MuralTab.tsx` | Realtime subscription + status chips |
| MODIFICAR | `src/components/dashboard/StoreProfileTab.tsx` | Preview da cor + botão remover logo |

## Nenhuma mudança no banco de dados de schema

Apenas uma migration para habilitar a publicação Realtime na tabela `suggestions`. Nenhuma coluna nova.

## Resultado esperado

| Funcionalidade | Antes | Depois |
|---|---|---|
| Sugestão enviada pelo cliente | Aparece após recarregar a página | Aparece instantaneamente no MuralTab |
| Trocar status | Abrir dropdown, escolher opção | Clicar no chip do status desejado |
| Logo da loja | Já funciona | + botão "Remover logo" |
| Cor primária | Já funciona | + preview ao vivo da cor no card |
