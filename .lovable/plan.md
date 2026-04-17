

## Plano

Vou implementar as 3 melhorias de código que faltavam:

### 1. Mensagem mais clara no card de Pagamento vazio (Cozinha & Pedidos)
Em `OperationsTab.tsx`, ajustar o texto do estado vazio do card "Pagamento" pra deixar explícito que as formas de pagamento aparecem ali quando houver pedidos não pagos. Algo tipo:
> "Tudo em dia! 💸 As formas de pagamento (PIX, Dinheiro, Débito, Crédito) aparecem aqui quando algum pedido estiver aguardando pagamento."

### 2. Liberar Débito/Crédito separados na UnitPage também pro Free
Em `src/pages/UnitPage.tsx` (linhas ~1525-1544), remover o gating `planLimits.canAccess("online_payment")` que esconde Débito/Crédito separados pra plano Grátis. **Manter** o gating só onde realmente é Pro (PIX online automático com QR), mas a *seleção visual* de Débito/Crédito como forma de pagamento na entrega/retirada deve aparecer pra todos.

Investigar primeiro o trecho exato pra garantir que vou separar bem o que é "online payment" (PIX automático Pro) do que é só "selecionar tipo de cartão" (deve ser livre).

### 3. Forçar invalidação de cache PWA
Em `vite.config.ts`, fazer um bump simbólico no manifest (ex: adicionar `version` no name ou trocar `description`) + adicionar `cleanupOutdatedCaches: true` no workbox pra forçar clientes em cache antigo (como a cliente que tá vendo só 3 botões no Balcão) a receberem a versão nova automaticamente no próximo refresh.

### Não mexer
- `CounterTab.tsx` — já tá com 5 botões corretos.
- Estrutura geral de planos — só desbloqueio o Débito/Crédito visual, sem mudar o que é Pro de verdade (PIX automático com QR).

### Risco
Zero. São 3 mudanças isoladas, sem migração de banco, sem tocar em RLS, sem mexer em lógica de pedido/pagamento real — só rótulos, gating de UI e cache.

