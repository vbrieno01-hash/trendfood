
# Onboarding Guiado — Wizard Passo a Passo para Novas Lojas

## Objetivo

Criar um modal de onboarding exibido automaticamente no primeiro acesso da loja ao dashboard, guiando o usuário por 4 etapas para configurar as informações essenciais. Ao final, atualizar o status do card "Onboarding Guiado" no `/admin` de `"soon"` para `"available"`.

---

## Como identificar o "primeiro acesso"

A tabela `organizations` não tem uma coluna `onboarding_done`. A estratégia será **adicionar uma coluna `onboarding_done` (boolean, default false)** via migração de banco de dados. O modal aparece quando `onboarding_done = false`. Ao concluir ou pular, marca `true` no banco — garantindo que nunca mais apareça.

Alternativa sem migração (localStorage) foi descartada pois não persiste entre dispositivos/browsers.

---

## As 4 Etapas do Wizard

```text
ETAPA 1 — Nome e Emoji
  └── Campo: Nome da loja (required)
  └── Seletor: Emoji (grid de 12 opções)
  └── Dados salvos em: organizations.name, organizations.emoji

ETAPA 2 — Endereço de Entrega
  └── Campo: CEP (auto-preenche via ViaCEP)
  └── Campos: Rua, Número, Complemento, Bairro, Cidade, Estado
  └── Dados salvos em: organizations.store_address (formato estruturado já existente)

ETAPA 3 — Horários de Funcionamento
  └── Toggle: Ativar controle de horário
  └── Tabela: Dias da semana com checkboxes e horários de/até
  └── Reutiliza o componente: BusinessHoursSection (já existente)
  └── Dados salvos em: organizations.business_hours (JSONB)

ETAPA 4 — Primeiro Item do Cardápio
  └── Campo: Nome do item (required)
  └── Campo: Preço (required)
  └── Select: Categoria (reutiliza CATEGORIES do useMenuItems)
  └── Textarea: Descrição (opcional)
  └── Dados salvos em: menu_items (INSERT)
```

---

## Lógica de persistência de cada etapa

- Etapas 1, 2 e 3: Um único `UPDATE` em `organizations` ao navegar para a próxima etapa (auto-save progressivo)
- Etapa 4: `INSERT` em `menu_items` com `organization_id` da org
- Ao finalizar: `UPDATE organizations SET onboarding_done = true` + `refreshOrganization()` para recarregar o contexto

---

## Onde exibir o modal

No `DashboardPage.tsx`, após carregar o usuário e a organização:

```typescript
// Mostrar o onboarding se onboarding_done === false
const showOnboarding = organization && !(organization as any).onboarding_done;
```

O modal usa `Dialog` do Radix (já importado no projeto via `src/components/ui/dialog.tsx`) e **não pode ser fechado clicando fora** (`modal={true}`, sem `DialogClose` no overlay) — só com o botão "Pular" ou "Concluir".

---

## Arquivos a criar/modificar

| Arquivo | Ação | Descrição |
|---|---|---|
| `supabase/migrations/` | Criar migração | `ALTER TABLE organizations ADD COLUMN onboarding_done boolean NOT NULL DEFAULT false;` |
| `src/components/dashboard/OnboardingWizard.tsx` | Criar | Componente do modal com os 4 steps |
| `src/pages/DashboardPage.tsx` | Modificar | Importar e renderizar `OnboardingWizard` condicionalmente |
| `src/hooks/useAuth.tsx` | Modificar | Incluir `onboarding_done` na interface `Organization` |
| `src/pages/AdminPage.tsx` | Modificar | Status `"soon"` → `"available"` no card "Onboarding Guiado" |

---

## Estrutura do componente OnboardingWizard

```
OnboardingWizard
  ├── Props: organization, onComplete
  ├── Estado: step (1-4), form por step
  │
  ├── STEP 1 — Nome & Emoji
  │     Input: nome (required), grid de emojis
  │     Botão: "Próximo →" (salva name+emoji na org)
  │
  ├── STEP 2 — Endereço
  │     Input CEP (com busca ViaCEP), rua, número, complemento, bairro, cidade, estado
  │     Botões: "← Voltar" | "Próximo →" (salva store_address na org)
  │
  ├── STEP 3 — Horários
  │     Reutiliza <BusinessHoursSection> existente
  │     Botões: "← Voltar" | "Próximo →" (salva business_hours na org)
  │
  └── STEP 4 — Primeiro Item
        Inputs: nome, preço, categoria, descrição
        Botões: "← Voltar" | "Concluir ✓" (insere item + marca onboarding_done=true)
```

### Barra de progresso

```
[●●●○]  Etapa 3 de 4 — Horários de Funcionamento
```

Indicador visual com 4 círculos, preenchidos conforme o passo atual. Abaixo, título e subtítulo da etapa.

### Botão "Pular configuração" (link discreto no footer do modal)

Ao clicar, pergunta "Tem certeza? Você poderá configurar isso depois em Perfil da Loja." com um `AlertDialog`, e se confirmado, marca `onboarding_done = true` sem salvar nada.

---

## Migração de banco de dados

```sql
ALTER TABLE public.organizations 
ADD COLUMN onboarding_done boolean NOT NULL DEFAULT false;
```

- Sem impacto nas políticas RLS existentes (a coluna é atualizada via `organizations_update_own` que já permite o dono atualizar sua org)
- Lojas existentes receberão `onboarding_done = false` por padrão — mas como são lojas já configuradas, podemos na mesma migração marcar todas as existentes como `true`:

```sql
ALTER TABLE public.organizations 
ADD COLUMN onboarding_done boolean NOT NULL DEFAULT false;

-- Marcar lojas já existentes como onboarded (possuem name diferente do padrão ou já têm store_address)
UPDATE public.organizations SET onboarding_done = true;
```

Isso garante que apenas **novas lojas criadas após essa migração** vejam o wizard.

---

## Mudança no card do AdminPage

```typescript
// ANTES
{
  icon: <Sparkles className="w-5 h-5" />,
  title: "Onboarding Guiado",
  description: "Wizard passo a passo para novas lojas configurarem cardápio, horários e pagamentos em minutos.",
  status: "soon",
},

// DEPOIS
{
  icon: <Sparkles className="w-5 h-5" />,
  title: "Onboarding Guiado",
  description: "Wizard passo a passo para novas lojas configurarem nome, endereço, horários e primeiro item do cardápio.",
  status: "available",
  actionLabel: "Ver no dashboard",
  actionHref: "/dashboard",
},
```

---

## Resumo

- 1 migração SQL (adiciona coluna + marca existentes como onboarded)
- 1 componente novo: `OnboardingWizard.tsx`
- 3 arquivos modificados: `DashboardPage.tsx`, `useAuth.tsx`, `AdminPage.tsx`
- Zero novas dependências
- Reutiliza `BusinessHoursSection`, `CATEGORIES`, `Dialog`, `AlertDialog`, e a lógica de ViaCEP já existentes
