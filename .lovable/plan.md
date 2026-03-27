
## Plano de correção: bloquear pedidos fora do horário (todas as lojas antigas e novas)

### 1) Diagnóstico do problema atual
- O bloqueio de horário está **incompleto**:
  - `UnitPage` já calcula fechado/aberto, mas depende de cache de dados.
  - `TableOrderPage` finaliza pedido sem validar horário da loja.
  - `usePlaceOrder` grava direto no banco sem validação de loja aberta.
  - No backend, `orders` ainda aceita `INSERT` público sem regra de horário.
- Resultado: em alguns fluxos (principalmente mesa/fluxos com dados defasados), pedido passa mesmo com loja fechada.

### 2) Correção obrigatória no backend (fonte da verdade global)
Criar migration com validação de horário no banco para impedir qualquer pedido fora de horário, independente da tela:
1. **Função de validação** (considerando `paused`, `force_open`, `business_hours`, horário de Brasília e turno cruzando meia-noite).
2. **Trigger `BEFORE INSERT` em `orders`** chamando essa função e lançando erro amigável quando a loja estiver fechada.
3. Mensagem de erro padronizada para a UI:  
   `Loja fechada no momento. Pedidos só podem ser feitos no horário de funcionamento.`

Isso garante cobertura para:
- lojas antigas,
- lojas novas,
- qualquer fluxo atual/futuro que tente inserir em `orders`.

### 3) Atualização de dados para lojas antigas e padrão para novas
Na mesma migration:
1. **Backfill para lojas antigas** com `business_hours` nulo:
   - preencher com grade padrão semanal.
   - deixar `enabled: true` para já entrar no controle de horário.
2. **Default para novas lojas**:
   - definir `DEFAULT` de `business_hours` com a mesma grade padrão (`enabled: true`), para novas contas já nascerem com controle ativo.

> Não criaremos novas tabelas nem mudaremos colunas existentes; apenas regra de validação + default/backfill.

### 4) Ajustes no frontend para UX consistente
#### 4.1 `usePlaceOrder` (camada comum dos pedidos)
- Antes do insert, fazer **revalidação rápida** da organização (aberta/fechada).
- Se fechada, abortar com erro amigável (sem tentar inserir).
- Se backend bloquear (trigger), mapear erro para toast legível.

#### 4.2 `TableOrderPage`
- Implementar a mesma lógica visual de status da loja:
  - calcular `isClosed` com `getStoreStatus(...)` + `paused`.
  - desabilitar botão “Finalizar Pedido” quando fechada.
  - mostrar aviso “Loja fechada” com horário de próxima abertura quando existir.
- Isso evita tentativa desnecessária e alinha comportamento com `UnitPage`.

### 5) Arquivos que serão alterados
- `supabase/migrations/<nova_migration>.sql`  
  (função + trigger + backfill + default)
- `src/hooks/useOrders.ts`  
  (revalidação pré-insert + tratamento de erro de loja fechada)
- `src/pages/TableOrderPage.tsx`  
  (bloqueio visual e de ação ao finalizar pedido)
- (opcional, se necessário) `src/lib/storeStatus.ts`  
  (extração de helper compartilhado para evitar duplicação de regra)

### 6) Validação final (E2E)
1. Loja com horário configurado para fechar em 1–2 min:
   - `UnitPage`: botão deve bloquear ao fechar.
   - `TableOrderPage`: botão deve bloquear ao fechar.
2. Tentar forçar insert de pedido fora do horário:
   - backend deve rejeitar.
3. Loja com `force_open = true`:
   - pedido deve continuar permitido.
4. Loja `paused = true`:
   - pedido sempre bloqueado.
5. Conferir uma loja antiga (com backfill aplicado) e uma conta nova (default novo) para garantir cobertura total.
