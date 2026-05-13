## Objetivo

Travar impressora térmica para planos pagos (Pro, Enterprise, Vitalício) + trial de 7 dias. Free puro = bloqueado. E alinhar a descrição "20 itens" → "30 itens" no plano Free.

## Mudanças

### 1. Free: descrição "30 itens"
**Arquivo:** dado em `platform_plans` (key='free')
- Trocar feature "Até 20 itens no cardápio" → "Até 30 itens no cardápio"
- Sem código, sem deploy

### 2. Impressora trancada para Pro+

#### 2a. `src/hooks/usePlanLimits.ts`
- Adicionar `thermal_printer` em `Feature`
- `FEATURE_ACCESS`:
  - `free: { thermal_printer: false }`
  - `pro / enterprise / lifetime: { thermal_printer: true }`
- Trial pega de graça automaticamente (já vira `effectivePlan = pro` durante os 7 dias)
- Plano pago expirado → cai pra Free → impressora bloqueia (consistente com a política de preservação de dados)

#### 2b. `src/components/dashboard/PrinterTab.tsx`
- Ler `usePlanLimits(organization).canAccess('thermal_printer')`
- Se `false`: renderizar `LockedFeatureBanner` (variant `free`) no topo, com CTA "Assinar Pro" abrindo o `UpgradeDialog` ou navegando para a aba Assinatura
- Desabilitar botões "Conectar impressora" / "Imprimir teste" / "Reconectar"
- Mostrar mensagem clara: "Disponível em qualquer plano pago (Pro, Enterprise ou Vitalício) e durante o trial de 7 dias"

#### 2c. `src/lib/printOrder.ts` (gate na impressão automática)
- Aceitar plano nas opções (ou ler `organization` direto onde for chamado)
- Se Free puro: não enfileirar/imprimir, retornar silenciosamente
- Garante que loja que pareou no Pro e depois caiu pra Free não tente mais imprimir
- Sem erro, sem toast — só skip

#### 2d. Defesa em outros pontos de chamada
Verificar e gatear (se necessário):
- `KitchenTab` / `OperationsTab` (botão imprimir manual)
- Auto-print em novo pedido (KDS)
- `printQueue.ts` (worker que processa fila local)

Padrão: passar `effectivePlan` ou `canAccess('thermal_printer')` como flag e pular execução no Free.

## O que NÃO mexer

- `src/lib/bluetoothPrinter.ts` (mantém Web Bluetooth genérico)
- `src/lib/checkMenuItemLimit.ts` (segue 30)
- `usePlanLimits.menuItemLimit` (segue 30)
- Triggers SQL `gate_*_paid_plan`, preços, promo, trial, MP, lógica de expiração
- Lógica de fila / reconexão BT em si — só adiciona o gate de plano por cima

## Resultado pro lojista

| Cenário | Impressora |
|---|---|
| Trial 7 dias ativo | ✅ funciona |
| Pro pagante | ✅ funciona |
| Enterprise pagante | ✅ funciona |
| Vitalício | ✅ funciona |
| Free puro (nunca pagou) | 🔒 bloqueado + CTA upgrade |
| Pago expirado → Free | 🔒 bloqueado, dados preservados, volta ao pagar |
