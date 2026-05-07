## Problema

O arquivo de migration `20260507031500_claim_print_jobs.sql` está no repositório, mas o card de aprovação não apareceu no chat porque ele só é gerado quando eu **executo a migration via ferramenta** (não basta o arquivo existir no disco). Por isso `claimed_at`, `claim_print_jobs` e o cron `reclaim-stuck-prints` continuam ausentes no banco.

## Plano

Ao aprovar este plano e voltar pro modo de execução, vou:

1. **Rodar a migration via ferramenta de banco** (aí sim aparece o card "Aprovar" no chat com o SQL pra você revisar):
   - `ALTER TABLE fila_impressao ADD COLUMN claimed_at timestamptz`
   - `CREATE FUNCTION claim_print_jobs(_org_id uuid)` com `FOR UPDATE SKIP LOCKED LIMIT 50` (claim atômico)
   - `cron.schedule('reclaim-stuck-prints', '* * * * *', ...)` que devolve jobs presos em `imprimindo` há mais de 60s pra `pendente`

2. **Você clica em Aprovar no card** que vai aparecer no chat.

3. **Validar no banco** que a coluna, função e cron foram criados.

4. **Deploy da edge `printer-queue`** (que já está com o código atualizado pra chamar `claim_print_jobs`).

5. Confirmar funcionamento — sem tocar em nada do Bluetooth.

## Observação

O Bluetooth **não usa** essa RPC nem a edge `printer-queue` — ele continua com o fluxo atual intacto. A mudança é só pro robô do cabo USB parar de imprimir o mesmo pedido várias vezes quando há concorrência de polling.