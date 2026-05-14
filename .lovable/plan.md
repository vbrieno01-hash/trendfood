## Esconder o WhatsApp atrás da mesma chave global "Em breve"

A aba **Robô IA** mostra hoje o card "Robô do WhatsApp" + `WhatsAppAutoStatusCard` (mensagens automáticas de status). Como você ainda não pegou a API oficial do WhatsApp, esse card precisa ficar escondido até você liberar.

### Como vai funcionar

- **Padrão: desligado.** Lojistas veem só o card "Robô IA — Em breve" (igual padrão do iFood). O `WhatsAppAutoStatusCard` desaparece.
- **Você (admin) sempre vê tudo** — o card de status fica disponível para você testar.
- **Switch no admin** (mesma seção "Funcionalidades em rollout" da aba Capacidade) para ligar/desligar.
- Quando ligar, todas as lojas Pro/Enterprise voltam a ver o card normalmente em até 30s.

### Mudanças

1. **Migration** — adicionar coluna `whatsapp_enabled boolean NOT NULL DEFAULT false` em `platform_config`.

2. **Hook `usePlatformFeatureFlags`** — incluir `whatsapp_enabled` na interface e no SELECT.

3. **`AIBotTab.tsx`** — no branch não-beta:
   - Se `whatsapp_enabled === false` E não-admin → mostra só o `<ComingSoonBot />` com selo laranja "EM BREVE" (sem o `WhatsAppAutoStatusCard`).
   - Se `whatsapp_enabled === true` ou admin → comportamento atual (mostra o card de status).
   - Vou precisar ler `isAdmin` via `useAuth` dentro do componente (hoje ele só recebe `orgId`).

4. **`CapacityTab.tsx`** — adicionar segundo item no `FeatureFlagsSection`:
   - **Robô do WhatsApp** (ON/OFF) — descrição: "Quando ligado, lojas Pro/Enterprise enxergam o painel de mensagens automáticas. Quando desligado, todos veem só 'Em breve'."

### Detalhes técnicos

- Reutiliza 100% da infra do iFood (mesma tabela, mesmo hook, mesma seção de admin).
- O `BetaPanel` (TrendFood `c9d9db45-...`) **não muda** — você como beta sempre vê tudo.
- Não toco em `usePlanLimits.canAccess('ai_bot')` — a regra de plano continua valendo *depois* do flag global.
- Não toco em `WhatsAppAutoStatusCard.tsx` — só controlo se ele é renderizado.