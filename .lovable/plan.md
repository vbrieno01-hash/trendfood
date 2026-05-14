## Esconder a integração iFood atrás de uma chave global "Em breve"

Hoje a aba **iFood** aparece para qualquer loja Pro/Enterprise (DashboardPage.tsx renderiza `IFoodTab` ou `UpgradePrompt`). Como ainda está em homologação, ela precisa ficar escondida com selo "Em breve" até você ligar manualmente no admin.

### Como vai funcionar

- **Padrão: desligado.** Lojistas veem um placeholder "🛵 iFood — Em breve" (sem campos de Merchant ID, sem botão Conectar, sem listagem de eventos).
- **Você liga no admin** (aba Capacidade ou Configurações da Plataforma) com um switch "Liberar integração iFood para os lojistas".
- **Quando ligar:** todas as lojas Pro/Enterprise voltam a ver a tela de conexão normal, em tempo real (React Query refetch).
- **Admin (você) sempre vê tudo** — a aba "iFood Homologação" no painel admin continua igual, sem trava, pra você seguir testando.

### Mudanças

1. **Migration** — adicionar coluna `ifood_enabled boolean NOT NULL DEFAULT false` em `platform_config`. Sem mudança de RLS (a policy de SELECT já é pública).

2. **Hook novo `usePlatformFeatureFlags`** (`src/hooks/usePlatformFeatureFlags.ts`) — lê `ifood_enabled` de `platform_config` com `staleTime: 30s`.

3. **`DashboardPage.tsx`** — na aba `ifood`:
   - Se `ifood_enabled === false` → renderiza um card "Integração iFood — Em breve" (ícone 🛵, badge laranja "EM BREVE", texto curto: "Estamos finalizando a homologação oficial com o iFood. Em breve você poderá receber pedidos automaticamente aqui."). Sem inputs, sem botões de conexão.
   - Se `ifood_enabled === true` → comportamento atual (`UpgradePrompt` para Free, `IFoodTab` para Pro/Enterprise).
   - O item da aba na sidebar continua aparecendo (com badge "Em breve" quando desligado) — assim os lojistas sabem que vem aí.

4. **Admin (`CapacityTab.tsx` ou nova mini-seção em `PlatformConfigSection.tsx`)** — adicionar um card "Funcionalidades em rollout" com switch:
   - **iFood** (ON/OFF) — descrição: "Quando ligado, todas as lojas Pro/Enterprise enxergam a tela de conexão iFood. Quando desligado, veem só 'Em breve'."
   - Mutation chama `update platform_config set ifood_enabled = ...` e invalida a query.
   - Toast confirmando + aviso "Mudança aplicada para todos os lojistas em até 30s".

### Detalhes técnicos

- A coluna fica em `platform_config` (singleton) — não precisa por loja.
- `IFoodTab` em si **não muda** — só o gate na DashboardPage.
- O selo "Em breve" reusa o estilo do banner laranja já visto no print do "Robô de Atendimento".
- Admin é detectado via `has_role(auth.uid(), 'admin')` — quando você acessa o dashboard como sua própria loja, você também enxerga a tela completa mesmo com flag desligado (override por `is_admin`).
- Não vou mexer em `usePlanLimits.canAccess('ifood')` — a lógica de plano continua valendo *depois* do flag global.