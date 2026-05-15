# Limpeza automática — Storage e contas inativas (modo dry-run)

Cria duas rotinas automáticas para reduzir custo do Lovable Cloud, com **modo dry-run ligado por padrão** durante os primeiros 7 dias. Nesse período nada é apagado — só fica registrado o que *seria* apagado, pra você revisar no painel admin.

## O que será criado

### Banco de dados (migration)

- Tabela `cleanup_logs` — registra tudo que foi (ou seria) apagado: tipo, alvo, bucket, tamanho, motivo, modo dry-run sim/não, timestamp.
- Tabela `cleanup_config` — flag global `dry_run` (começa `true`), `dry_run_until` (now() + 7 dias).
- Coluna `cleanup_warning_at` em `organizations` — marca primeira detecção da org como inativa.
- Função `cleanup_inactive_organizations()` — aplica os critérios rígidos abaixo, respeita dry-run.
- Função `cleanup_orphan_users()` — deleta auth.users que ficaram sem nenhuma org (cascata da limpeza).
- 2 jobs pg_cron agendados.
- RLS: só admin lê `cleanup_logs` e `cleanup_config`.

### Edge Function `cleanup-orphan-storage`

- Lista todos os arquivos dos buckets `menu-images`, `logos`, `site-images`, `guide-images` (paginado, 1000 por vez).
- Cruza com URLs referenciadas em `menu_items.image_url`, `organizations.logo_url`, `organizations.banner_url`, `platform_content` (JSONB).
- **NÃO mexe** no bucket `downloads` (APK/EXE controlados manualmente).
- Apaga apenas arquivos com >7 dias E sem nenhuma referência.
- Respeita flag `dry_run` da `cleanup_config`.
- Protegida por `UNIVERSAL_WEBHOOK_SECRET` (`verify_jwt = false`).

### UI Admin — nova aba "Limpeza"

- Banner mostrando status do dry-run e quantos dias faltam.
- Botão "Desativar dry-run agora" (só admin).
- Botão "Rodar limpeza manual agora" (storage + lojas).
- Tabela com últimos 100 registros de `cleanup_logs` (filtros: tipo, dry-run sim/não, período).
- Stats no topo: total de itens marcados, MB que seriam liberados.

## Critérios (relembrando, não muda)

**Imagem órfã:**
- Está em bucket de imagem
- Nenhuma URL no banco aponta pra ela
- Criada há >7 dias

**Loja inativa (todos cumulativos):**
- Criada há >5 meses
- `subscription_plan = 'free'`
- `trial_ends_at` no passado
- Zero pedidos jamais
- Onboarding incompleto OU zero produtos no cardápio
- `user_id` NÃO é admin (`brenojackson30@gmail.com`)
- Sem `referred_by_id` nem `affiliate_id`
- **Janela de aviso:** primeira detecção só marca `cleanup_warning_at`. Só apaga 7 dias depois se ainda continuar nos critérios.

## Agendamento

```text
cleanup-orphan-storage  → diário 03:00 BRT
cleanup-inactive-orgs   → segunda 04:00 BRT
```

## Como você sai do dry-run

Após 7 dias, no painel admin:
- Revisa a aba "Limpeza" → confere a lista
- Se tá tudo certo, clica "Desativar dry-run" → próxima execução começa a apagar de verdade
- Se algo suspeito, me chama e ajustamos critérios antes de ligar

## Arquivos

- `supabase/migrations/<ts>_cleanup_routines.sql`
- `supabase/functions/cleanup-orphan-storage/index.ts`
- `supabase/config.toml` — adicionar `[functions.cleanup-orphan-storage] verify_jwt = false`
- `src/components/admin/CleanupTab.tsx`
- `src/pages/AdminPage.tsx` — adicionar aba "Limpeza"
- Memória: nova entrada `mem://features/storage-and-orgs-cleanup-routine`
