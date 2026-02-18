
# Cardápio Oficial — Nova funcionalidade completa

## Visão geral

Esta feature adiciona um **Cardápio Oficial** ao sistema, separado do Mural de Sugestões. O dono da lanchonete cadastra seus lanches atuais (com foto, preço e categoria), e a página pública `/unidade/[slug]` ganha duas abas: "Cardápio" (visual de delivery) e "Sugestões" (o mural atual).

---

## Banco de dados — Nova tabela `menu_items`

Uma nova tabela será criada via migration SQL:

```text
menu_items
─────────────────────────────────────────────────────────────────
id             uuid (PK, gen_random_uuid())
organization_id uuid (FK → organizations.id)
name           text (obrigatório)
description    text (nullable)
price          numeric(10,2) (obrigatório)
category       text (default: 'Outros')
image_url      text (nullable)
available      boolean (default: true)
created_at     timestamptz (default: now())
```

**RLS Policies:**
- `SELECT`: `true` (público — clientes veem o cardápio)
- `INSERT`: `auth.uid() = (SELECT user_id FROM organizations WHERE id = organization_id)`
- `UPDATE`: mesma verificação de owner
- `DELETE`: mesma verificação de owner

**Storage:** será criado um novo bucket `menu-images` (público) para upload das fotos dos lanches.

**Realtime:** a tabela será adicionada à publicação `supabase_realtime` para sync automático.

---

## Novo campo na tabela `organizations`

Será adicionada a coluna `whatsapp` (text, nullable) para o botão "Pedir no WhatsApp".

---

## Arquivos a criar

| Arquivo | Descrição |
|---|---|
| `src/hooks/useMenuItems.ts` | Hook React Query para CRUD do cardápio |
| `src/components/dashboard/MenuTab.tsx` | Nova aba do painel do lojista |

## Arquivos a modificar

| Arquivo | Mudança |
|---|---|
| `src/pages/DashboardPage.tsx` | Adicionar aba "Meu Cardápio" no sidebar e no render |
| `src/pages/UnitPage.tsx` | Reformular em 2 abas: Cardápio + Sugestões |
| `src/components/dashboard/StoreProfileTab.tsx` | Adicionar campo WhatsApp |
| `src/integrations/supabase/types.ts` | (auto-gerado — não editar) |

---

## Detalhamento de cada mudança

### 1. `src/hooks/useMenuItems.ts` (novo)

Hook com 4 operações:
- `useMenuItems(orgId)` → lista itens ordenados por categoria, depois nome
- `useAddMenuItem(orgId)` → INSERT com upload de imagem
- `useUpdateMenuItem(orgId)` → UPDATE (preço, disponibilidade, etc.)
- `useDeleteMenuItem(orgId)` → DELETE + remove imagem do storage

### 2. `src/components/dashboard/MenuTab.tsx` (novo)

Layout da aba "Meu Cardápio" no painel do lojista:

```text
┌─────────────────────────────────────────────────────────┐
│  Meu Cardápio                        [+ Novo Item]      │
│  12 itens · 3 categorias                               │
├─────────────────────────────────────────────────────────┤
│  🍔 Hambúrgueres                                        │
│  ┌────────────────────────────────────────────────────┐ │
│  │ [foto] Nome do lanche    R$ 25,90  ✅  [✏️] [🗑️]  │ │
│  │        Descrição breve             ❌              │ │
│  └────────────────────────────────────────────────────┘ │
│  🥤 Bebidas                                             │
│  ...                                                    │
└─────────────────────────────────────────────────────────┘
```

**Modal de cadastro/edição** com campos:
- Nome (obrigatório)
- Descrição (opcional)
- Preço em R$ (obrigatório, numérico)
- Categoria (select: Hambúrgueres, Bebidas, Porções, Sobremesas, Combos, Outros)
- Foto (upload → bucket `menu-images`, máx 5MB)
- Toggle "Disponível" (switch)

### 3. `src/pages/DashboardPage.tsx`

Adicionar novo item de navegação no sidebar:

```text
Antes: Home | Gerenciar Mural | Perfil da Loja | Configurações
Depois: Home | Meu Cardápio | Gerenciar Mural | Perfil da Loja | Configurações
```

Ícone: `UtensilsCrossed` do lucide-react.

### 4. `src/pages/UnitPage.tsx` (reformulação)

A página pública ganhará duas abas usando o componente `Tabs` do shadcn/ui (já instalado):

**Aba 1 — Cardápio** (visual delivery):
```text
┌─────────────────────────────────────────┐
│  🍔 Hambúrgueres                        │
│  ┌─────────────────────────────────┐    │
│  │ [FOTO GRANDE]                   │    │
│  │ Nome do Lanche          R$25,90 │    │
│  │ Descrição do lanche             │    │
│  │ [💬 Pedir no WhatsApp]          │    │
│  └─────────────────────────────────┘    │
│  🥤 Bebidas                             │
│  ...                                    │
└─────────────────────────────────────────┘
```

- Cards com foto grande em aspect-ratio 16:9
- Badge "Indisponível" em vermelho quando `available = false`
- Itens indisponíveis aparecem no final com opacidade reduzida (não ficam ocultos — o cliente vê mas não pede)
- Botão "Pedir no WhatsApp" só aparece se o dono cadastrou o número de WhatsApp no Perfil da Loja
  - Link: `https://wa.me/55{whatsapp}?text=Olá!%20Quero%20pedir%3A%20{nome}%20-%20R%24{preco}`

**Aba 2 — Sugestões** (mural atual — mantido igual, apenas movido para dentro das tabs):

### 5. `src/components/dashboard/StoreProfileTab.tsx`

Adicionar campo WhatsApp (número apenas, sem formatação) com máscara visual:
```text
WhatsApp para pedidos
[55] [11999887766]  ← apenas números, sem espaços ou hífens
Hint: "Usado para o botão 'Pedir no WhatsApp' na página pública"
```

---

## Fluxo de dados

```text
Lojista cadastra item no MenuTab
  → upload foto → bucket menu-images
  → INSERT menu_items
  → invalidateQueries ["menu_items", orgId]

Cliente acessa /unidade/slug
  → useMenuItems(org.id) carrega cardápio
  → itens agrupados por categoria
  → clica "Pedir no WhatsApp"
  → abre wa.me com mensagem pré-preenchida
```

---

## Categorias disponíveis

- Hambúrgueres
- Bebidas
- Porções
- Sobremesas
- Combos
- Outros

O agrupamento por categoria é feito no frontend — sem coluna de ordenação, os grupos aparecem na ordem pré-definida acima.

---

## Resumo do que NÃO muda

- Toda a lógica de Sugestões (MuralTab, useSuggestions, UnitPage suggestions) é preservada
- O sistema de auth e organização não muda
- A landing page não muda
- O HomeTab não muda (métricas de sugestões continuam funcionando)

---

## Resultado esperado

| Feature | Comportamento |
|---|---|
| Aba "Meu Cardápio" no painel | Lojista cadastra/edita/remove itens com foto e preço |
| Toggle "Disponível" | Desativa item sem excluir — aparece com badge "Indisponível" na página |
| Aba "Cardápio" na página pública | Visual de delivery com fotos e preços |
| Botão "Pedir no WhatsApp" | Abre WhatsApp com mensagem pré-preenchida do lanche |
| Aba "Sugestões" na página pública | Mural de ideias existente, sem alteração de funcionalidade |
| Agrupamento por categoria | Hambúrgueres, Bebidas, Porções, etc. |

