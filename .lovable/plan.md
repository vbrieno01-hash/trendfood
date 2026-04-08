

## Plano: Remover emoji picker e usar logo como identidade visual da loja

### O que muda
O seletor de emojis ("Emoji da loja") será removido do perfil da loja e de todos os locais onde aparece. Em vez disso, onde antes exibia o emoji, agora exibe a **logo da loja** (já existente via `logo_url`). Se a loja não tiver logo, mostra a inicial do nome em um circle colorido.

### Alterações

**1. `src/components/dashboard/StoreProfileTab.tsx`**
- Remover `EMOJI_OPTIONS` e o bloco de seleção de emoji (linhas 474-493)
- Remover `emoji` do `form` state e do `doSave`/`sharedFields`
- Manter o campo `emoji` no banco (sem migração) — apenas não exibir mais

**2. `src/components/dashboard/OnboardingWizard.tsx`**
- Remover seletor de emoji do Step 1
- Renomear step de "Nome e Emoji" para "Nome e WhatsApp"
- Remover `emoji` do state e do update SQL

**3. `src/pages/UnitPage.tsx`** — Fallback de `org.emoji` → inicial do nome com bg colorido

**4. `src/pages/ReviewPage.tsx`** — Mesmo fallback (inicial do nome)

**5. `src/pages/TableOrderPage.tsx`** — Mesmo fallback (2 locais)

**6. `src/components/dashboard/OrgSwitcher.tsx`** — Fallback emoji → inicial do nome

**7. `src/components/admin/AdminStoreManager.tsx`** — Fallback emoji → logo ou inicial

**8. `src/pages/AdminPage.tsx`** — Já usa inicial como fallback, remover referência ao emoji

**9. Relatórios** (`ReportsTab.tsx`, `CourierReportSection.tsx`) — Remover emoji do cabeçalho impresso, usar só logo + nome

### Sem migração
O campo `emoji` continua no banco (compatibilidade), mas não é mais editável nem exibido.

