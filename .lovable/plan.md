

# Remover funcionalidade de Sugestoes

A feature de "Sugestoes" sera completamente removida do projeto. Isso envolve limpar varios arquivos.

## Arquivos a remover
- `src/hooks/useSuggestions.ts` -- hook inteiro dedicado a sugestoes
- `src/components/dashboard/MuralTab.tsx` -- aba do dashboard para gerenciar sugestoes

## Arquivos a editar

### 1. `src/pages/UnitPage.tsx` (pagina publica)
- Remover import de `useSuggestions`, `useAddSuggestion`, `useIncrementVote`
- Remover a query `useSuggestions(org?.id)` e variaveis relacionadas (votedIds, sugName, etc.)
- Remover a aba "Sugestoes" do `TabsTrigger`
- Remover todo o `TabsContent value="suggestions"` com o formulario e listagem
- Remover o Drawer de "Nova Sugestao"
- Limpar imports nao utilizados (MessageCircle, Lightbulb, etc.)

### 2. `src/pages/AuthPage.tsx`
- Atualizar texto de marketing: trocar "Mural de sugestoes em tempo real" por algo mais relevante (ex: "Cardapio digital personalizado")
- Atualizar descricao padrao da org de "Bem-vindo ao nosso mural de sugestoes!" para algo como "Bem-vindo a nossa loja!"

### 3. `src/components/dashboard/StoreProfileTab.tsx`
- Remover o botao "Enviar sugestao" do preview da loja

## Detalhes tecnicos

- Nenhuma alteracao no banco de dados -- a tabela `suggestions` pode permanecer sem impacto
- Nenhuma rota nova ou dependencia alterada
- Apenas remocao de codigo e limpeza de imports

