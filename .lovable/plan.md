
# PWA Instalável + Horário de Funcionamento — Implementação Completa

## O que será feito

### Parte 1 — PWA (App Instalável)

**Instalar pacote:** `vite-plugin-pwa`

**`vite.config.ts`** — adicionar plugin `VitePWA`:
- Manifest com nome "Snack Hive", cor `#f97316`, display `standalone`
- Ícones `pwa-192.png` e `pwa-512.png`
- Service worker com cache automático dos assets
- `navigateFallbackDenylist: [/^\/~oauth/]` para não quebrar autenticação

**`index.html`** — adicionar:
- `<meta name="theme-color" content="#f97316">`
- `<meta name="mobile-web-app-capable" content="yes">`
- `<meta name="apple-mobile-web-app-capable" content="yes">`
- `<link rel="apple-touch-icon" href="/pwa-192.png">`

**`public/pwa-192.png` e `public/pwa-512.png`** — ícones SVG-based em PNG gerados inline como base64.

---

### Parte 2 — Horário de Funcionamento

**Migração de banco:**
```sql
ALTER TABLE public.organizations
ADD COLUMN business_hours jsonb DEFAULT NULL;
```

**`src/hooks/useOrganization.ts`** — adicionar campo `business_hours` ao tipo `Organization`:
```typescript
business_hours?: {
  enabled: boolean;
  schedule: Record<string, { open: boolean; from: string; to: string }>;
} | null;
```

**`src/components/dashboard/StoreProfileTab.tsx`** — nova seção "Horário de Funcionamento" no formulário:
- Interface local `BusinessHours` com os 7 dias (seg–dom)
- Toggle principal (Switch) "Controlar horário de funcionamento"
- Quando ativado: tabela com 7 linhas, cada uma com checkbox do dia + dois `<input type="time">` (de/até) que ficam desabilitados quando o dia está fechado
- Valores padrão: seg–sex 08:00–22:00 abertos, sab 10:00–23:00 aberto, dom fechado
- Salvo junto com o `handleSave` existente como campo `business_hours` no update do Supabase

**`src/pages/UnitPage.tsx`** — badge de status no banner da loja:
- Função `getStoreStatus(businessHours)` que:
  1. Se `business_hours` for null ou `enabled: false` → retorna `null` (sem badge)
  2. Pega o dia da semana atual (0=dom, 1=seg... → mapeia para "dom", "seg"...)
  3. Verifica se o dia está aberto e se a hora atual está entre `from` e `to`
  4. Retorna `{ open: true }` ou `{ open: false, opensAt: "18:00" }` com o próximo horário de abertura
- Badge renderizado no banner:
  - Verde: `bg-green-500/90 text-white` — "Aberto agora"
  - Vermelho: `bg-red-500/90 text-white` — "Fechado · abre às 18h" (ou "Fechado hoje" se o dia todo estiver fechado)
  - Posicionado como `absolute` no canto superior direito do banner da loja

---

## Ordem de execução

1. Migração SQL (`business_hours` na tabela `organizations`)
2. Atualizar `useOrganization.ts` com o novo tipo
3. Atualizar `StoreProfileTab.tsx` com a seção de horários
4. Atualizar `UnitPage.tsx` com o badge de status
5. Instalar `vite-plugin-pwa` e atualizar `vite.config.ts`
6. Atualizar `index.html` com meta tags PWA
7. Criar ícones PWA em `public/`

Nenhuma mudança em rotas, autenticação ou outras páginas.
