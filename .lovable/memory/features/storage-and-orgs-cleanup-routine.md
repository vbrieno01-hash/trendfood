---
name: storage-and-orgs-cleanup-routine
description: Rotinas pg_cron de limpeza (imagens órfãs no storage + lojas inativas >5 meses), com modo dry-run controlado por cleanup_config.
type: feature
---

## Visão geral
Duas rotinas automáticas reduzem custo do Lovable Cloud:
- **cleanup-orphan-storage** (Edge Function, diária 03h BRT): varre buckets `menu-images`, `logos`, `site-images`, `guide-images`; apaga arquivos sem referência no banco e com >7 dias. Bucket `downloads` nunca é tocado.
- **cleanup_inactive_organizations()** (SQL, segunda 04h BRT): marca + apaga orgs inativas. Critérios cumulativos: criada >5 meses, plano free, sem trial, zero pedidos, sem produtos OU sem onboarding, não-admin, sem referred_by/affiliate. Janela de aviso de 7 dias via `organizations.cleanup_warning_at`.

## Modo dry-run
Tabela `cleanup_config` (id=1) controla `dry_run` (default true por 7 dias). Em dry-run nada é apagado, só registra em `cleanup_logs`. Toggle via RPC `toggle_cleanup_dry_run(_dry_run)`.

## Tabelas
- `cleanup_logs` (kind, target, bucket, size_bytes, reason, dry_run, metadata) — RLS só admin SELECT, INSERTs via SECURITY DEFINER
- `cleanup_config` — singleton

## RPCs admin
- `get_cleanup_stats()` — banner + cards
- `run_cleanup_orgs_manual()` — botão "executar agora" para orgs
- Edge function chamada com `?secret=UNIVERSAL_WEBHOOK_SECRET`

## UI
Aba "Limpeza" no AdminPage (`src/components/admin/CleanupTab.tsx`).
