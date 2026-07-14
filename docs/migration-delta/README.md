# Migration Delta — 2026-07-09 → hoje

Sincronização do espelho `eqyklkrigshbjuneuxrz` (Supabase próprio) com o
projeto Lovable atual. Cutoff do backup: **2026-07-09 23:55 UTC**
(`trendfood_260709-2.backup`).

## Arquivos

- `schema-delta.sql` — as 9 migrations desde o cutoff, concatenadas em ordem cronológica. Cole no SQL Editor do espelho e clique em **Run**.
- `functions-delta.md` — lista de edge functions e como redeployar.
- `storage-delta.md` — bucket `support-attachments` e policies.
- `checklist.md` — passo a passo pra marcar conforme aplica.

## Ordem de execução

1. Confirmar que está logado no projeto certo (`eqyklkrigshbjuneuxrz`).
2. Rodar `schema-delta.sql` no SQL Editor.
3. Criar bucket `support-attachments` (ver `storage-delta.md`).
4. Redeployar edge functions (ver `functions-delta.md`).
5. Marcar o checklist.

Zero impacto no Lovable Cloud atual — tudo é aplicado só no espelho.
