
# PWA Instalável + Horário de Funcionamento por Loja

## Visão Geral

Duas melhorias independentes que se complementam:

1. **PWA (App Instalável)** — o cliente consegue adicionar o TrendFood/Snack Hive na tela inicial do celular como se fosse um app de verdade, sem precisar da loja de apps
2. **Horário de Funcionamento** — cada loja define os dias e horários que está aberta. A página pública mostra "Aberto agora" ou "Fechado · abre às 18h" em tempo real

---

## Parte 1 — PWA Instalável

### O que muda para o usuário final
- Ao visitar qualquer página do app pelo celular, o navegador exibe um banner "Adicionar à tela inicial"
- O app abre sem barra de endereço, em tela cheia, como um app nativo
- Funciona em iPhone (Safari → Compartilhar → Adicionar) e Android (Chrome → instalar automaticamente)

### Implementação técnica

**Pacote a instalar:** `vite-plugin-pwa`

**Arquivos novos/modificados:**

| Arquivo | O que muda |
|---|---|
| `vite.config.ts` | Adicionar plugin `VitePWA` com manifest, ícones e configuração de cache. Incluir `/~oauth` no `navigateFallbackDenylist` para não quebrar autenticação |
| `public/pwa-192.png` | Ícone 192×192 (gerado a partir do favicon existente) |
| `public/pwa-512.png` | Ícone 512×512 |
| `index.html` | Tags `<meta theme-color>` e `<link rel="apple-touch-icon">` para suporte iOS |

**Configuração do manifest:**
```
Nome: Snack Hive
Cor tema: #f97316 (laranja padrão)
Display: standalone (sem barra do navegador)
Start URL: /
```

O service worker é gerado automaticamente pelo plugin e faz cache dos assets principais para carregamento offline.

---

## Parte 2 — Horário de Funcionamento

### Banco de dados

Nova coluna na tabela `organizations`:

```sql
ALTER TABLE public.organizations
ADD COLUMN business_hours jsonb DEFAULT NULL;
```

Formato do JSON armazenado:
```json
{
  "enabled": true,
  "schedule": {
    "seg": { "open": true, "from": "08:00", "to": "22:00" },
    "ter": { "open": true, "from": "08:00", "to": "22:00" },
    "qua": { "open": true, "from": "08:00", "to": "22:00" },
    "qui": { "open": true, "from": "08:00", "to": "22:00" },
    "sex": { "open": true, "from": "08:00", "to": "23:00" },
    "sab": { "open": true, "from": "10:00", "to": "23:00" },
    "dom": { "open": false, "from": "10:00", "to": "20:00" }
  }
}
```

Se `business_hours` for `null` ou `enabled: false`, a loja é tratada como sempre aberta (sem restrição).

### Dashboard — Aba Perfil da Loja (`StoreProfileTab.tsx`)

Nova seção "Horário de Funcionamento" com:
- Toggle principal "Controlar horário de funcionamento" (liga/desliga a funcionalidade)
- Tabela com os 7 dias da semana, cada linha com:
  - Checkbox para ativar/desativar o dia
  - Dois inputs `time` (de/até) quando o dia está ativo
- Salvo junto com o restante do perfil

### Página Pública — `UnitPage.tsx`

Badge de status no banner superior da loja:

- **Verde "Aberto agora"** — dentro do horário configurado
- **Vermelho "Fechado · abre às 18h"** — fora do horário, mostra quando reabre
- **Sem badge** — se horário não estiver configurado (sempre aberto)

Lógica de verificação em JavaScript no frontend: compara hora atual do navegador com o JSON de horários. Sem chamada extra ao backend.

### Arquivos afetados

| Arquivo | Mudança |
|---|---|
| `vite.config.ts` | PWA plugin |
| `index.html` | Meta tags PWA |
| `public/pwa-192.png` e `pwa-512.png` | Ícones PWA |
| `src/components/dashboard/StoreProfileTab.tsx` | Seção de horários |
| `src/pages/UnitPage.tsx` | Badge de status aberto/fechado no banner |
| `src/hooks/useOrganization.ts` | Incluir `business_hours` no tipo |
| Migração SQL | `ADD COLUMN business_hours jsonb` na tabela `organizations` |
