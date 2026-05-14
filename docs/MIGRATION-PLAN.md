# Plano de Migração — TrendFood (sair do Lovable se preciso)

Plano B documentado. **Não executar agora.** Serve só para garantir que, se um
dia for preciso sair do Lovable, o caminho está mapeado e nenhum dado se perde.

Premissas:

- Hoje o app roda 100% no Lovable Cloud (Supabase gerenciado + Edge Functions
  + AI Gateway + hosting) e em domínios próprios (`trendfood.site`,
  `www.trendfood.site`).
- Backups manuais (CSV + Storage) seguem `docs/BACKUP-PLAYBOOK.md`.
- Hardcodes mapeados em `docs/LOVABLE-DEPENDENCIES.md`.
- Secrets inventariados em `docs/SECRETS-INVENTORY.md`.

A migração é **reversível até a Onda 3**. Enquanto não desligar o projeto
Lovable, dá para voltar atrás.

---

## Onda 1 — Frontend fora do Lovable (1 a 2 dias)

**Objetivo:** servir o React build em Vercel/Netlify, mas continuar usando o
Supabase do Lovable como backend. Risco baixíssimo (dá para reverter o DNS em
5 minutos).

**Pré-requisitos:**
- Repo GitHub conectado e privado ✅
- Conta Vercel ou Netlify (free tier serve)
- Acesso ao painel DNS dos domínios (`trendfood.site`)

**Passos:**
1. Criar projeto na Vercel apontando para o repo GitHub.
2. Configurar variáveis de ambiente na Vercel:
   - `VITE_SUPABASE_URL` = `https://xrzudhylpphnzousilye.supabase.co`
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = (mesma chave do `.env`)
   - `VITE_SUPABASE_PROJECT_ID` = `xrzudhylpphnzousilye`
3. Deploy de teste em URL temporária (`trendfood.vercel.app`).
4. Validar fluxos críticos na URL temporária:
   - Login/cadastro (Google OAuth pode falhar — ver nota abaixo)
   - Criar pedido público em `/unidade/<slug>`
   - Webhook MP funciona normalmente (continua apontando para o Supabase Lovable)
5. **Apontar DNS** de `trendfood.site` para a Vercel (CNAME).
6. Aguardar propagação (~10 min).
7. Manter o Lovable publicando em `trendfood.lovable.app` como fallback por 30
   dias.

**Validação:**
- Pedido real entra no banco
- KDS recebe via Realtime
- Push notification chega no celular do dono
- PIX paga e webhook confirma

**Rollback:** reapontar DNS de volta para o Lovable. 5 minutos.

**⚠️ Nota Google OAuth:** o pacote `@lovable.dev/cloud-auth-js` usa o OAuth
Client ID do **Lovable**. Em domínio próprio fora do Lovable, o login Google
vai exigir trocar para `supabase.auth.signInWithOAuth()` nativo + criar OAuth
Client próprio no Google Cloud Console. Detalhes em
`docs/LOVABLE-DEPENDENCIES.md` seção 3. Se for migrar só o frontend e manter
Lovable como provider de auth, esta troca pode ser adiada — mas o link de
callback precisa ser atualizado no Google Cloud Console.

---

## Onda 2 — Banco e Edge Functions próprios (3 a 5 dias)

**Objetivo:** sair do Supabase gerenciado pelo Lovable e ir para um Supabase
próprio (supabase.com com sua conta) ou self-hosted. Esta é a etapa pesada.

**Pré-requisitos:**
- Onda 1 estável há pelo menos 2 semanas
- Conta supabase.com paga (Pro $25/mês — sem isso, sem `pg_cron` nem backups
  automáticos)
- Todos os secrets do `SECRETS-INVENTORY.md` confirmados no cofre
- VAPID keys salvas (crítico — perdê-las quebra push de todo mundo)
- Pedir ao suporte do Lovable um **dump completo do banco** (ou exportar via
  `pg_dump` se tiverem dado acesso direto)

**Passos:**

1. **Criar projeto Supabase próprio** em `supabase.com`. Anotar nova URL e
   chaves.

2. **Restaurar schema:** rodar todas as migrations de `supabase/migrations/` no
   novo projeto via `supabase db push`. Validar que tabelas, RLS, triggers,
   funções e `pg_cron` jobs foram criados.

3. **Restaurar dados:** importar o `pg_dump` recebido do Lovable. Inclui
   `auth.users` (hashes bcrypt), o que preserva todas as senhas. Sessões JWT
   ativas serão invalidadas (usuários relogam 1x — aceitável).

4. **Recriar Storage buckets:** `logos`, `menu-images`, `downloads`,
   `guide-images`, `site-images`. Recriar políticas RLS dos buckets via
   migration. Subir arquivos baixados (ver `BACKUP-PLAYBOOK.md` seção 3).

5. **Deploy das Edge Functions** no novo projeto via `supabase functions deploy`.
   Antes, refatorar:
   - Trocar todas as chamadas `https://ai.gateway.lovable.dev` por
     `https://api.openai.com/v1/...` ou Gemini API direta.
   - Trocar `LOVABLE_API_KEY` por `OPENAI_API_KEY` ou `GEMINI_API_KEY`.
   - Lista das 10 functions afetadas em `LOVABLE-DEPENDENCIES.md` seção 4.

6. **Configurar todos os secrets** no novo projeto (Mercado Pago, iFood,
   UAZAPI, Telegram, VAPID, etc).

7. **Recriar `pg_cron` jobs** via migration SQL (não saem no `pg_dump` padrão
   se estiverem em schema gerenciado).

8. **Habilitar Realtime** nas tabelas necessárias (`orders`, `order_items`,
   `kitchen_print_queue`, etc).

9. **Refatorar hardcodes do frontend** (ver `LOVABLE-DEPENDENCIES.md` seções
   1 e 2):
   - Centralizar `VITE_PUBLIC_BASE_URL=https://trendfood.site`
   - Substituir as 17 ocorrências de `trendfood.lovable.app`
   - Substituir as 3 ocorrências de `xrzudhylpphnzousilye.supabase.co`
   - Trocar `@lovable.dev/cloud-auth-js` por `supabase.auth.signInWithOAuth`

10. **Atualizar variáveis na Vercel** com nova `VITE_SUPABASE_URL` e
    `VITE_SUPABASE_PUBLISHABLE_KEY`. Redeploy.

**Validação (checklist obrigatório antes de seguir):**
- [ ] Login email/senha funciona (com hash antigo restaurado)
- [ ] Login Google funciona (novo OAuth Client)
- [ ] Pedido público entra e gera KDS em tempo real
- [ ] PIX gerado, pago e confirmado via webhook MP
- [ ] Push notification chega no celular do dono
- [ ] iFood polling busca pedidos
- [ ] WhatsApp envia notificação via UAZAPI
- [ ] Telegram do admin recebe relatório diário
- [ ] Trial e assinatura Pro continuam válidos
- [ ] Impressora Bluetooth no Android continua funcionando

**Rollback:** apontar `VITE_SUPABASE_URL` na Vercel de volta para o Lovable.
10 minutos. Mas atenção: pedidos criados no Supabase novo não voltam — janela
de risco real.

**Estratégia de corte recomendada:** janela de manutenção de 1h num horário
morto (ex: 4h da manhã de terça). Avisar lojistas no dia anterior.

---

## Onda 3 — Reapontar webhooks externos e desligar Lovable (1 dia)

**Objetivo:** mover todos os webhooks de provedores externos para o novo
Supabase e encerrar o projeto Lovable.

**Pré-requisitos:**
- Onda 2 estável há pelo menos 7 dias
- Zero pedidos novos chegando no Supabase antigo (verificar via SQL)

**Passos:**

1. **Mercado Pago** → painel MP → Webhooks → trocar URL para
   `https://<novo-projeto>.supabase.co/functions/v1/mp-webhook`

2. **iFood** → portal do parceiro → trocar webhook URL

3. **Cakto** → painel → trocar URL de notificação de assinatura

4. **UAZAPI / Evolution** → no servidor Oracle, atualizar `WEBHOOK_URL` no
   `.env` da instância Evolution para apontar para o novo
   `whatsapp-webhook` do Supabase próprio. Reiniciar container.

5. **Telegram BotFather** — webhooks do Telegram são setados via API; rodar
   `setWebhook` apontando para a nova URL.

6. **VAPID:** as chaves precisam ser **as mesmas** no novo Supabase (já
   garantido pelo cofre). Push continua chegando para todos os clientes
   inscritos sem precisar reassinar.

7. **Validar 24h:** ficar 1 dia inteiro monitorando logs do Supabase novo.
   Confirmar que pedidos MP, iFood e WhatsApp estão entrando.

8. **Desligar o Lovable:**
   - Cancelar plano Lovable
   - Manter o GitHub e o cofre de secrets
   - Manter o backup do `pg_dump` final por pelo menos 12 meses

**Validação final:**
- [ ] Nenhum pedido entra no Supabase antigo nas últimas 24h
- [ ] Logs de webhook do MP/iFood mostram entrada no Supabase novo
- [ ] Lojistas reportam normalidade

**Rollback após Onda 3:** **NÃO TEM.** Depois de cancelar o Lovable, é só pra
frente. Por isso a janela de 7 dias na Onda 2 é obrigatória.

---

## Coisas que NÃO migram automaticamente

| Item | Mitigação |
|---|---|
| Sessões JWT ativas | Usuários relogam 1x. Avisar antes. |
| Lovable AI Gateway | Refatorar 10 edge functions na Onda 2. |
| Domínio `trendfood.lovable.app` | Abandonado. `trendfood.site` continua. |
| Custom emails (se usar) | Reconfigurar provider próprio (Resend etc). |
| `pg_cron` jobs | Recriar via migration SQL (não saem no dump padrão). |
| Realtime publications | Recriar via migration. |
| OAuth Google client ID | Criar próprio no Google Cloud Console. |

---

## Custos estimados pós-migração

| Item | Antes (Lovable) | Depois |
|---|---|---|
| Hosting frontend | incluído | Vercel free tier (até ~100GB) |
| Banco + Storage + Auth | incluído | Supabase Pro ~$25/mês |
| Edge Functions | incluído | Supabase Pro inclui |
| AI (gateway) | incluído | OpenAI/Gemini pay-per-use (~$5–30/mês) |
| Domínio | já tem | já tem |
| **Total estimado** | uso Lovable | **~$30–60/mês** |

---

## Janela realista

- **Onda 1:** 1 fim de semana
- **Esperar 2 semanas** para estabilizar
- **Onda 2:** 1 semana de prep + 1 madrugada de execução
- **Esperar 1 semana** para validar
- **Onda 3:** 1 dia

**Total ponta a ponta: ~5 a 6 semanas** se for feito sem pressa.

---

## Quando executar este plano?

**Não executar enquanto:**
- O sistema estiver instável (resolver instabilidade primeiro)
- Não tiver feito pelo menos 4 backups CSV semanais validados
- Não tiver as VAPID keys no cofre
- Não tiver dump completo do banco em mãos

**Considerar executar se:**
- Lovable subir muito de preço
- Limites de Cloud (instância) virarem gargalo recorrente
- Necessidade de controle fino (ex: extensões pg que o Lovable não permite)
- Time crescer e exigir CI/CD próprio + ambientes de staging dedicados

Por enquanto: este documento existe só como **garantia**. O plano A continua
sendo Lovable.