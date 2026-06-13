## Tarefa 1 — Teste de renovação na mcd (Pro vencido)

**Estado atual no banco:** mcd está em `pro / active` com `trial_ends_at = 2026-06-13`.

**Passos:**
1. `UPDATE organizations SET trial_ends_at='2026-06-10' WHERE slug='mcd'` (joga validade pro passado → `subscriptionExpired = true`)
2. Abrir o preview da mcd e validar nos 3 lugares:
   - Aba **Assinatura** → card do Pro mostra "Renovar agora" clicável (não "Plano atual" travado)
   - Abrir aba bloqueada (ex: Cupons) → modal `UpgradeDialog` → cards Pro/Enterprise clicáveis
   - Página `/planos` → cards Pro/Enterprise com "Renovar agora"
3. **Restaurar:** `UPDATE organizations SET trial_ends_at='2026-06-13 02:55:55.05+00' WHERE slug='mcd'`

Sem alterar `subscription_plan` para não disparar triggers de gate.

## Tarefa 2 — Fix do upload de banners

**Bug identificado em `StoreProfileTab.tsx` (handleBannerUpload, linha 409):**

O caminho do arquivo no Storage usa **índice do array** como slot:
```ts
const path = `banners/${organization.id}-${slot}.${ext}`;
```

Com `upsert: true`, isso causa dois problemas:
1. **Sobrescrita silenciosa:** após remover o banner do meio, o próximo upload usa `slot = bannerUrls.length` → sobrescreve o arquivo de outro banner ainda referenciado no array.
2. **Extensão variável:** se o usuário enviar `.png` no slot 0 e depois `.webp` no mesmo slot, fica `org-0.png` E `org-0.webp` no Storage (arquivos órfãos) e a URL pode apontar para a errada.

Hoje a mcd tem 3 banners no banco e os arquivos estão lá — então "não salva" provavelmente significa: ao enviar um novo, a foto antiga reaparece (cache do CDN do arquivo sobrescrito) ou some.

**Fix:**
- Trocar o path por nome único por upload: `banners/${organization.id}-${Date.now()}-${random}.${ext}` (sem upsert).
- Continuar gravando o array `banner_urls` no banco como fonte da verdade.
- Opcional: ao remover, tentar deletar o arquivo correspondente do Storage (best-effort, ignora erro).
- Resultado: cada upload é arquivo novo → sem colisão, sem cache stale, e o array do banco sempre reflete o que aparece na UI.

**Arquivo alterado:** apenas `src/components/dashboard/StoreProfileTab.tsx` (funções `handleBannerUpload` e `handleRemoveBannerAt`).

## Status das mudanças de ontem (pronto pra publicar)

- ✅ Migração SQL (`payment_methods` + `category_layout`) já aplicada
- ✅ `UnitPage` (carrossel opcional, pagamentos dinâmicos, sem CTA WhatsApp duplicado)
- ✅ `StoreProfileTab` (checkboxes de pagamento)
- ✅ `MenuTab` (toggle carrossel por categoria)
- ✅ `useOrganization` (campos novos no select)
- ✅ Fix renovação após expiração (hoje)
- ⏳ Fix banner upload (esta tarefa)

Depois das 2 tarefas acima, tudo coeso para publicar.

## Pergunta antes de publicar

Posso publicar **logo após** confirmar visualmente o teste de renovação e o fix do banner? Ou prefere validar você antes do "Atualizar"?