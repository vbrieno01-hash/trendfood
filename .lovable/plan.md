

# Multi-unidade para plano Enterprise

## Visao geral

Permitir que usuarios Enterprise criem e gerenciem multiplas filiais (organizations) a partir de uma unica conta. Cada filial continua totalmente isolada (cardapio, mesas, pedidos, caixa separados), mas o dono alterna entre elas no mesmo dashboard sem precisar fazer logout.

## Como vai funcionar

### Para o lojista

1. No sidebar do dashboard, aparece um seletor de unidade (dropdown) no lugar do bloco fixo atual com nome/logo da loja
2. Ao clicar, ve a lista de todas as suas unidades e um botao "Criar nova unidade"
3. Ao trocar de unidade, todo o dashboard recarrega com os dados daquela filial
4. Ao criar nova unidade, preenche nome, slug e whatsapp -- funciona igual ao cadastro inicial

### Para os pedidos

Nada muda -- cada unidade tem seu proprio slug (`/unidade/loja-centro`, `/unidade/loja-norte`), seus proprios QR Codes, seu proprio KDS. Os pedidos sao 100% separados por `organization_id`.

---

## Mudancas tecnicas

### 1. Banco de dados

**Nenhuma alteracao de schema necessaria.** A tabela `organizations` ja suporta multiplas linhas por `user_id`. O que muda eh so a query no frontend (de `.maybeSingle()` para selecionar multiplas).

Porem, a politica de RLS de INSERT ja permite `auth.uid() = user_id`, entao o usuario ja pode criar mais de uma org. Basta garantir que o frontend so permita isso para Enterprise.

### 2. useAuth.tsx -- Suportar multiplas orgs

- Novo estado: `organizations: Organization[]` (array com todas as orgs do usuario)
- Novo estado: `activeOrganization: Organization | null` (a org selecionada no momento)
- `fetchOrganization` passa a buscar todas as orgs do usuario (sem `.maybeSingle()`) e seleciona a primeira como ativa por padrao
- Novo metodo: `switchOrganization(orgId: string)` para trocar a org ativa
- O campo `organization` existente continua funcionando como alias de `activeOrganization` para nao quebrar nenhum componente existente

### 3. DashboardPage.tsx -- Seletor de unidade no sidebar

- Substituir o bloco "Org info" fixo por um componente `OrgSwitcher`
- `OrgSwitcher` mostra a org ativa com um dropdown (Popover) listando todas as orgs
- Botao "Criar nova unidade" no final da lista (so aparece para Enterprise)
- Ao selecionar outra org, chama `switchOrganization()` e reseta a tab para "home"

### 4. Novo componente: OrgSwitcher.tsx

- Componente que recebe `organizations[]`, `activeOrg`, `onSwitch`, `onCreateNew`
- Mostra logo/emoji + nome da org ativa
- Dropdown com lista de orgs + botao de criar
- Badge "Enterprise" no botao de criar

### 5. Novo componente: CreateUnitDialog.tsx

- Dialog/modal com formulario simples: nome, slug (auto-gerado), whatsapp
- Ao salvar, faz INSERT na tabela organizations com o user_id do usuario logado
- Valida plano Enterprise antes de permitir
- Apos criar, chama `refreshOrganization` e muda para a nova unidade

### 6. usePlanLimits.ts -- Nova feature "multi_unit"

Ja existe no codigo! A feature `multi_unit` ja esta mapeada como `false` para free/pro e `true` para enterprise. So precisamos usar `canAccess("multi_unit")` para condicionar a criacao de novas unidades.

### 7. FeaturesTab.tsx -- Atualizar status do Multi-unidade

Mudar o card "Multi-unidade" de `status: "coming_soon"` para `status: "available"`.

---

## Arquivos afetados

| Arquivo | Tipo de mudanca |
|---|---|
| `src/hooks/useAuth.tsx` | Editar: buscar array de orgs, adicionar switchOrganization |
| `src/pages/DashboardPage.tsx` | Editar: usar OrgSwitcher no sidebar |
| `src/components/dashboard/OrgSwitcher.tsx` | Criar: componente seletor de unidade |
| `src/components/dashboard/CreateUnitDialog.tsx` | Criar: dialog para criar nova filial |
| `src/components/dashboard/FeaturesTab.tsx` | Editar: mudar multi-unidade para "available" |

### Sem migracoes de banco de dados

O schema atual ja suporta multiplas orgs por usuario. Nenhuma alteracao necessaria.

