## Limpeza de logs internos do Postgres

**Objetivo:** liberar ~340 MB do banco (377 MB → ~40 MB) sem tocar em nenhum dado de negócio.

### O que será feito

1. **Migration SQL** criando:
   - Função `public.cleanup_internal_postgres_logs()` — apaga `net._http_response` > 2 dias, `cron.job_run_details` > 3 dias, roda `VACUUM` (não FULL), registra em `cleanup_logs` e atualiza `cron_health`.
   - Job `pg_cron` `cleanup-internal-postgres-logs` diário às 03:30 BRT.
   - RPC admin `run_cleanup_internal_logs_manual()` (apenas `brenojackson30@gmail.com`).
   - Execução imediata da função dentro da própria migration → libera os 340 MB agora.

2. **Card no Admin → aba Limpeza:**
   - Mostra tamanho atual de `net._http_response` e `cron.job_run_details`.
   - Última execução do job (de `cron_health`).
   - Botão "Limpar agora" chamando o RPC.

### O que NÃO é tocado

- `orders`, `order_items`, `organizations`, `platform_counters`, `top_stores_showcase`, cardápios, pagamentos, fidelidade, relatórios — **nenhum dado de negócio.**
- Crons existentes (push, MP, iFood, WhatsApp, Telegram) continuam idênticos.
- Apenas histórico interno do Postgres (`net.*` e `cron.*`) é limpo.

### Resultado

- Banco: **377 MB → ~40 MB** imediatamente.
- Alerta amarelo de storage some.
- Manutenção fica automática daqui pra frente.
