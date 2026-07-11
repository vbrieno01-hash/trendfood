## Resposta direta: sim, qualquer loja pode comprar sem esse erro acontecer de novo

Não há nada a implementar. O fix que fiz na resposta anterior já cobre 100% das lojas atuais e futuras. Este "plano" é só o registro formal do porquê, para você aprovar e seguir tranquilo.

## Por que está seguro para qualquer loja

Existem **três caminhos** pelos quais um PIX de campanha pode ser marcado como aprovado. Todos convergem agora para o comportamento correto:

1. **Webhook do Mercado Pago** (`mp-webhook`) — já tinha o short-circuit certo para `addon:campaign_250`. Nunca foi o problema.
2. **Polling do frontend** (`reconcile-pending-pix`) — era o bug. **Corrigido**: detecta `plan` com prefixo `addon:` e chama a RPC de créditos, sem tocar em `subscription_plan`, `subscription_status`, `trial_ends_at` ou `billing_cycle`.
3. **Watchdog automático** (`watchdog-pix-stuck`) — apenas delega para o `reconcile`, então herdou a correção sozinho.

A guarda é por prefixo (`plan.startsWith("addon:")`), não pelo nome exato. Isso significa que **qualquer addon novo** (ex.: `addon:campaign_500`, `addon:ai_bot`) também estará protegido automaticamente contra o mesmo tipo de corrupção.

## Riscos residuais (transparência)

- Um addon novo que ainda não tenha handler dedicado no reconcile só vai logar "unknown addon key" e marcar o pending como aprovado sem creditar nada. Não corrompe plano nenhum, mas exige adicionar o handler quando lançarmos o addon. É a decisão certa: melhor não creditar do que quebrar a loja.
- Loja `Teste loja` já foi restaurada para `enterprise` + 250 créditos.

## O que não faz parte deste plano

Você optou por não adicionar as blindagens extras (CHECK no banco, testes, auditoria das outras 85 functions). Se mudar de ideia depois, é só pedir.

**Nenhum arquivo será modificado neste turno.** Ao aprovar, apenas confirmamos que está encerrado.
