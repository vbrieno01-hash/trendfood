
# Melhorias no Gerenciar Mural — Ações Rápidas e UX

## Estado atual (o que já existe)

Após revisar o código completo, aqui está o que JÁ funciona:

- Status chips clicáveis (3 botões por card para mudar status) — implementado
- AlertDialog de confirmação para excluir — implementado
- Toasts de feedback — implementados (mas com texto genérico)
- Sincronização dos contadores do HomeTab — JÁ FUNCIONA automaticamente porque ambas as abas usam a mesma chave de cache `["suggestions", orgId]`. Qualquer mudança de status no MuralTab invalida o cache e o HomeTab atualiza na mesma instância

## O que será melhorado

### Mudança 1 — Botões de Ação Rápida explícitos por card

O usuário pediu botões com labels claros: "Mover para Analisando" e "Aprovar para o Cardápio". Atualmente os chips funcionam, mas são compactos e exigem que o lojista entenda que deve clicar neles.

A nova abordagem será um sistema de duas camadas:

**Camada 1 — Badge de status atual** (só exibe, não é clicável):
```
⏳ Pendente   (amarelo, read-only — mostra onde está)
```

**Camada 2 — Botões de ação rápida contextuais** (aparecem conforme o status):

| Status atual | Ações disponíveis |
|---|---|
| `pending` | [🔍 Analisando] [✅ Aprovar para Cardápio] |
| `analyzing` | [⏳ Voltar para Pendente] [✅ Aprovar para Cardápio] |
| `on_menu` | [⏳ Pendente] [🔍 Analisando] |

Isso torna as ações explícitas e contextuais — o lojista vê exatamente o que cada botão faz.

### Mudança 2 — Toast com mensagem correta

Atualizar o texto do toast em `useSuggestions.ts`:
- `useUpdateSuggestion` → `"Status atualizado com sucesso! ✅"` (quando é mudança de status)
- Manter `"Sugestão atualizada!"` para edição de nome/descrição

Para isso, o hook `useUpdateSuggestion` receberá um parâmetro opcional `successMessage` que pode ser customizado pelo chamador.

### Mudança 3 — Layout visual do card reorganizado

O card ficará com um layout limpo em 3 seções:

```
┌─────────────────────────────────────────────┐
│ 🍕 Nome da sugestão        ❤️ 12  ✏️  🗑️   │
│   Descrição opcional                        │
│   ⏳ Pendente                               │
│                                             │
│  [🔍 Mover para Analisando] [✅ Aprovar]    │
└─────────────────────────────────────────────┘
```

- Badge de status: read-only, visual indicator
- Botões de ação rápida: contextuais, com ícone + label curto
- Votos + editar + excluir: no canto superior direito (já existente)

### Mudança 4 — Sincronização dos contadores (confirmar que funciona)

A sincronização JÁ está funcionando corretamente via React Query. Ambas as abas (HomeTab e MuralTab) usam `useSuggestions(organization.id)` que compartilha a chave `["suggestions", orgId]`. Quando `updateMutation` chama `queryClient.invalidateQueries`, ambas as abas recebem os dados frescos ao mesmo tempo.

Não é necessária nenhuma mudança de arquitetura aqui — apenas confirmar que os toasts e botões estão corretos.

## Arquivos modificados

| Arquivo | Mudança |
|---|---|
| `src/hooks/useSuggestions.ts` | Adicionar parâmetro `successMessage` opcional em `useUpdateSuggestion` |
| `src/components/dashboard/MuralTab.tsx` | Substituir chips por badge read-only + botões de ação contextual; toast personalizado por ação |

## Nenhuma mudança de banco de dados necessária

Toda a funcionalidade pedida é puramente de frontend.

## Resultado esperado

| Funcionalidade | Antes | Depois |
|---|---|---|
| Mudança de status | Chips compactos clicáveis | Badge de status + botões "Mover para Analisando" / "Aprovar para o Cardápio" |
| Toast de status | "Sugestão atualizada!" | "Status atualizado com sucesso! ✅" |
| Contadores do dashboard | Já sincronizam | Continuam sincronizando (sem regressão) |
| Confirmação de exclusão | AlertDialog já presente | Mantido com melhoria no texto |
