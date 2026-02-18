
# Implementação Completa do Cardápio Oficial

## Situação atual

Nenhuma das mudanças do plano aprovado foi executada ainda. O banco de dados, os hooks e os componentes precisam ser criados do zero. Abaixo está o plano completo para implementar tudo de uma vez.

---

## Passo 1 — Banco de dados (migração SQL)

Serão executadas as seguintes alterações no banco:

**1a. Adicionar coluna `whatsapp` na tabela `organizations`**
```sql
ALTER TABLE public.organizations ADD COLUMN whatsapp text;
```

**1b. Criar tabela `menu_items`**
```sql
CREATE TABLE public.menu_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name            text NOT NULL,
  description     text,
  price           numeric(10,2) NOT NULL,
  category        text NOT NULL DEFAULT 'Outros',
  image_url       text,
  available       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);
```

**1c. RLS na tabela `menu_items`**
- SELECT: público (clientes veem o cardápio)
- INSERT/UPDATE/DELETE: somente o dono da organização (`auth.uid() = organizations.user_id`)

**1d. Bucket de imagens `menu-images`** (público, com RLS para upload autenticado)

**1e. Realtime** ativado para `menu_items`

---

## Passo 2 — Hook `src/hooks/useMenuItems.ts` (novo arquivo)

Fornece 4 operações:

| Hook | Função |
|---|---|
| `useMenuItems(orgId)` | Lista itens ordenados por categoria → nome |
| `useAddMenuItem(orgId)` | Faz upload da foto no bucket, depois INSERT |
| `useUpdateMenuItem(orgId)` | UPDATE de qualquer campo (preço, available, etc.) |
| `useDeleteMenuItem(orgId)` | DELETE do registro + remove a imagem do storage |

Toast de feedback em cada operação (sucesso e erro).

---

## Passo 3 — Componente `src/components/dashboard/MenuTab.tsx` (novo arquivo)

Layout da aba "Meu Cardápio" no painel do lojista:

```
┌─────────────────────────────────────────────────────────┐
│  Meu Cardápio                        [+ Novo Item]      │
│  12 itens · 3 categorias                               │
├─────────────────────────────────────────────────────────┤
│  🍔 Hambúrgueres                                        │
│  ┌──[foto]──────────────────────────────────────────┐   │
│  │ Nome do lanche         R$ 25,90   ✅  [✏️] [🗑️] │   │
│  │ Descrição breve                                  │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

**Modal de cadastro/edição** com campos:
- Nome (obrigatório)
- Categoria (Select: Hambúrgueres, Bebidas, Porções, Sobremesas, Combos, Outros)
- Preço em R$ (obrigatório)
- Descrição (opcional)
- Foto (upload, máx 5MB)
- Toggle "Disponível / Indisponível" (Switch)

**Confirmação de exclusão** via AlertDialog igual ao padrão já usado no MuralTab.

---

## Passo 4 — `src/pages/DashboardPage.tsx` (edição)

Adicionar aba "Meu Cardápio" no sidebar:

```
Antes:  Home | Gerenciar Mural | Perfil da Loja | Configurações
Depois: Home | Meu Cardápio | Gerenciar Mural | Perfil da Loja | Configurações
```

- Novo TabKey: `"menu"`
- Ícone: `UtensilsCrossed` do lucide-react
- Render condicional: `{activeTab === "menu" && <MenuTab organization={organization} />}`

---

## Passo 5 — `src/pages/UnitPage.tsx` (reformulação com 2 abas)

A página pública ganha duas abas usando o componente `Tabs` já instalado (shadcn/ui):

**Aba "Cardápio"** — visual estilo delivery:
- Cards com foto em aspect-ratio 4:3
- Agrupamento por categoria na ordem: Hambúrgueres → Bebidas → Porções → Sobremesas → Combos → Outros
- Badge vermelho "Indisponível" quando `available = false`; item com opacidade reduzida mas visível
- **Botão "Pedir no WhatsApp"** aparece apenas se `org.whatsapp` estiver preenchido
  - Link: `https://wa.me/55{whatsapp}?text=Olá!%20Quero%20pedir%3A%20{nome}%20-%20R%24{preco}`
- Se o cardápio estiver vazio, exibe estado vazio elegante

**Aba "Sugestões"** — mural existente sem nenhuma alteração de lógica, apenas movido para dentro das Tabs.

---

## Passo 6 — `src/components/dashboard/StoreProfileTab.tsx` (edição)

Adicionar campo WhatsApp antes do botão Salvar:

```
WhatsApp para pedidos (opcional)
[Número com DDD, ex: 11999887766]
Hint: "Ative o botão 'Pedir no WhatsApp' na página pública"
```

- Campo de texto, `inputMode="numeric"`, aceita somente dígitos
- Salvo junto com os outros campos no `handleSave`

---

## Resumo dos arquivos

| Arquivo | Ação |
|---|---|
| Banco de dados | Migração: `whatsapp` em organizations + tabela `menu_items` + bucket `menu-images` |
| `src/hooks/useMenuItems.ts` | Criar (novo) |
| `src/components/dashboard/MenuTab.tsx` | Criar (novo) |
| `src/pages/DashboardPage.tsx` | Editar — adicionar aba "Meu Cardápio" |
| `src/pages/UnitPage.tsx` | Editar — reformular com 2 abas (Cardápio + Sugestões) |
| `src/components/dashboard/StoreProfileTab.tsx` | Editar — adicionar campo WhatsApp |

Nenhuma mudança no sistema de auth, no HomeTab, no MuralTab ou na Landing Page.
