
## Pergunta do usuário

1. Quando a assinatura paga (Pro/Enterprise) expira, os dados que o lojista criou usando recursos pagos **somem ou são apagados**?
2. Se sim, **não pode apagar** — manter tudo salvo, só **bloquear o acesso** (igual já é hoje pra plano Free), e voltar a liberar quando pagar de novo.
3. O robô do WhatsApp só funciona pra quem paga.

## Diagnóstico — o que acontece hoje

Investiguei o `usePlanLimits.ts` e o fluxo de expiração:

### Boa notícia: dados NÃO são apagados

Quando uma assinatura expira (`trial_ends_at <= now()` em plano `pro`/`enterprise`), o sistema só muda o `effectivePlan` pra `"free"` na lógica do frontend. **Nada é deletado do banco**:

- Cupons criados continuam na tabela `coupons` (só ficam inacessíveis)
- Programa de fidelidade (`loyalty_config`, `loyalty_points`) permanece intacto
- Histórico completo de pedidos preservado em `orders`
- Bairros de entrega (`delivery_neighborhoods`) salvos
- Adicionais (`menu_item_addons`, `global_addons`) preservados
- Configurações de KDS, garçom, balcão, caixa — tudo persiste no banco

A lógica em `usePlanLimits` apenas **bloqueia o acesso** via `canAccess(feature)` retornando `false`. Quando o lojista pagar de novo, o `effectivePlan` volta pra `pro`/`enterprise` e **tudo reaparece automaticamente** — porque nunca saiu do banco.

### Furos que precisam de blindagem

| Furo | Cenário | Risco |
|---|---|---|
| 1. Limite de itens no Free (30) | Lojista Pro tem 200 itens. Plano expira → vira Free | UI permite editar/deletar, mas o que acontece se ele tentar criar o item 201? `assertMenuItemLimit` bloqueia ✅ — mas os 200 existentes ficam visíveis e editáveis no painel? Precisa confirmar |
| 2. Limite de mesas no Free (1) | Lojista tem 10 QR codes ativos. Vira Free | Cliente escaneia mesa 5 → cardápio abre? Deveria? |
| 3. Cupons ativos | Lojista criou 20 cupons. Vira Free (sem feature `cupons`) | Cliente usa cupom no checkout — backend valida? Hoje `validate_coupon_by_code` não checa plano |
| 4. Programa de fidelidade | Lojista tem 500 clientes com pontos. Vira Free | Pontos continuam acumulando? Resgate funciona? |
| 5. Robô WhatsApp (AI Bot) | Lojista pagou Pro, configurou bot. Vira Free | Edge function `ai-bot-respond` continua respondendo? Não tem checagem de plano |
| 6. KDS/Garçom/Caixa | Telas operacionais já abertas em tablets do salão | Cache local pode permitir uso offline mesmo após expiração |

### Sobre o robô WhatsApp especificamente

Olhando `ai_bot_config` e a edge function `ai-bot-respond`: o bot responde **globalmente** baseado em `enabled = true` na tabela `ai_bot_config` (singleton admin). Não há gate por plano hoje. **Precisa adicionar checagem do plano da org antes de responder.**

## Plano de blindagem (preserva dados, bloqueia acesso)

### Princípio: **nunca deletar, sempre gatear**

Toda blindagem é via verificação de plano antes da ação — nunca via DELETE de dados do lojista.

### 1. Adicionar `feature: "ai_bot"` ao `usePlanLimits`

- Free: `false`
- Pro: `true`  
- Enterprise: `true`
- Lifetime: `true`

Isso é só pra UI. O gate real fica no item 2.

### 2. Edge function `ai-bot-respond` — checar plano da org antes de responder

No início da função, buscar a org pelo telefone/instância, verificar `effectivePlan` (mesma lógica do `usePlanLimits` replicada em SQL via RPC `get_effective_plan(_org_id)`). Se for `free` → não responde, retorna 200 silencioso (pra não quebrar webhook).

### 3. Criar RPC SQL `get_effective_plan(_org_id)` — fonte única da verdade

Replica a lógica de `usePlanLimits` no banco:
- `lifetime` → `lifetime`
- `pro`/`enterprise` com `trial_ends_at <= now()` → `free` (expirou)
- `free` com trial ativo → `pro`
- Senão → o próprio plano

Usado por edge functions e triggers.

### 4. Triggers SQL de gate em features pagas (camada definitiva)

Criar triggers `BEFORE INSERT/UPDATE` que bloqueiam ações de plano superior:

- **`coupons`**: bloqueia INSERT se `get_effective_plan` for `free`. UPDATE/DELETE permitidos (lojista pode arrumar a casa, mas não criar novo).
- **`loyalty_config`**: bloqueia UPDATE de `enabled = true` se Free.
- **`delivery_neighborhoods`**: bloqueia INSERT de novos se Free e já tiver algum.
- **`menu_item_addons`** / **`global_addons`**: bloqueia INSERT se Free.

Cupom já criado continua válido no checkout? **Decisão:** sim, respeita até expirar — não pune cliente final por inadimplência do lojista. Mas lojista não pode criar novos.

### 5. UI — modo "somente leitura" nas abas pagas após expiração

Em vez de esconder a aba (que assusta o lojista achando que perdeu dados), mostrar:

- Banner amarelo no topo: **"Assinatura expirada. Seus dados estão salvos. Renove pra voltar a usar este recurso."**
- Botão "Renovar agora" → leva pra `SubscriptionTab`
- Listas/tabelas continuam visíveis em modo leitura (cinza)
- Botões "Adicionar/Editar" desabilitados com tooltip "Disponível no Pro"

Abas afetadas: `CouponsTab`, `LoyaltyTab`, `BestSellersTab`, `WaiterTab`, `AIBotTab`, `OperationsTab` (KDS), `CaixaTab`, `PricingTab`, `ReportsTab` (Enterprise).

### 6. Limite de itens/mesas — **não force shrink**

- Lojista com 200 itens vira Free → mantém os 200 visíveis e vendendo (não esconde nada do cliente final).
- **Não pode criar o 201º** (já bloqueado por `assertMenuItemLimit`).
- Banner no MenuTab: "Você tem 200 itens. Plano Free permite 30. Renove pra continuar adicionando."
- Mesmo pra mesas: 10 QR codes continuam funcionais, mas não cria a 11ª.

### 7. Aviso pré-expiração (proativo)

Card vermelho no `HomeTab` quando `subscriptionDaysLeft <= 3`: "Sua assinatura expira em X dias. Renove agora pra não perder acesso aos recursos premium."

## Arquivos a editar

- **Nova migration** — RPC `get_effective_plan(_org_id)` + 4 triggers de gate (coupons, loyalty_config, delivery_neighborhoods, addons)
- `src/hooks/usePlanLimits.ts` — adicionar feature `ai_bot`
- `supabase/functions/ai-bot-respond/index.ts` — checar plano antes de responder
- `src/components/dashboard/CouponsTab.tsx` — banner readonly + desabilitar criar
- `src/components/dashboard/LoyaltyTab.tsx` — idem
- `src/components/dashboard/BestSellersTab.tsx` — idem
- `src/components/dashboard/WaiterTab.tsx` — idem
- `src/components/dashboard/AIBotTab.tsx` — idem (já existe? verificar)
- `src/components/dashboard/OperationsTab.tsx` — banner KDS readonly
- `src/components/dashboard/CaixaTab.tsx` — idem
- `src/components/dashboard/PricingTab.tsx` — idem
- `src/components/dashboard/ReportsTab.tsx` — idem (Enterprise)
- `src/components/dashboard/MenuTab.tsx` — banner "limite excedido, renove"
- `src/components/dashboard/HomeTab.tsx` — aviso pré-expiração (3 dias)
- `mem://features/subscription/data-preservation-on-expiration` — documentar política

## Resultado esperado

- **Zero perda de dados** quando assinatura expira — tudo continua no banco
- Lojista vê seus dados em modo leitura + CTA claro pra renovar
- Cliente final não é afetado por features já configuradas (cupons válidos, fidelidade)
- Robô WhatsApp deixa de responder automaticamente quando vira Free
- Triggers SQL garantem que mesmo com burla na UI, nada paga é criado
- Quando lojista renova → tudo volta a funcionar instantaneamente, sem refazer nada
