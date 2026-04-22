

## Plano — Conectar mais de um Telegram (multi-admin)

Hoje o sistema só permite 1 Chat ID. Vou expandir pra **N destinatários**, cada um com **nome (apelido), Chat ID próprio, ativo/inativo e filtros de eventos individuais** — útil pra ter você + sócio + atendimento recebendo coisas diferentes.

### Como vai ficar a aba "Telegram Admin"

```text
📡 Destinatários conectados
┌───────────────────────────────────────────────┐
│ 👤 Breno (principal)        [✓ Ativo]  [⋯]   │
│    Chat ID: 123456789                         │
│    Recebe: TODOS os eventos                   │
│    [Testar]  [Editar eventos]  [Remover]      │
├───────────────────────────────────────────────┤
│ 👤 Sócio                    [✓ Ativo]  [⋯]   │
│    Chat ID: 987654321                         │
│    Recebe: só Financeiro + Crescimento        │
│    [Testar]  [Editar eventos]  [Remover]      │
├───────────────────────────────────────────────┤
│ 👤 Atendimento              [✗ Pausado]      │
│    Chat ID: 555444333                         │
│    Recebe: só Hot Lead + Trial expirando      │
└───────────────────────────────────────────────┘

[+ Adicionar destinatário]
```

Cada destinatário tem **filtros próprios** — você recebe tudo, sócio só financeiro, atendimento só leads quentes. Quando uma notificação dispara, o sistema envia em paralelo pra todos os destinatários ativos cujo filtro permite o evento.

### Mudanças no banco

**Nova tabela `admin_telegram_recipients`:**
```sql
- id (uuid)
- name (text)            -- apelido: "Breno", "Sócio"
- chat_id (text)         -- Chat ID do Telegram
- active (boolean)       -- pausar sem deletar
- events (jsonb)         -- mesma estrutura de toggles atual
- created_at, updated_at
```

RLS: só admin (`has_role admin`) pode SELECT/INSERT/UPDATE/DELETE.

**Migração de dados:** se já existir `admin_telegram_chat_id` no `platform_config`, criar 1 linha "Principal" automática com os toggles atuais. Os campos antigos (`admin_telegram_chat_id`, `admin_telegram_events`) ficam por compatibilidade mas não são mais usados pela edge function.

### Mudanças na edge function `admin-telegram-notify`

- Em vez de ler 1 chat_id do `platform_config`, busca **todos os recipients ativos**.
- Para cada um, checa o filtro de eventos individual (mesma lógica do toggle atual).
- Envia em paralelo (`Promise.allSettled`) pros que passarem.
- Loga 1 entrada por destinatário em `admin_telegram_log` com novo campo opcional `recipient_name` (pra você ver no histórico quem recebeu).

### Mudanças na UI (`AdminTelegramTab.tsx`)

Reorganizada em 2 cards:

**1. Card "Destinatários"**
- Lista de cards expansíveis (um por destinatário)
- Cada card mostra: nome, chat_id, badge ativo/pausado, resumo de eventos ("Recebe: Todos" / "Recebe: 3 eventos selecionados")
- Botões por destinatário: **Testar** (envia teste só pra ele), **Editar eventos** (abre painel inline com os 13 toggles), **Pausar/Ativar**, **Remover**
- Botão **"+ Adicionar destinatário"** abre dialog com: nome + chat_id + link pro `@userinfobot`

**2. Card "Últimas notificações enviadas"** (igual hoje, mas mostra o nome do destinatário em cada linha)

### Comportamento dos eventos

- Por padrão, **novo destinatário recebe todos os eventos** (toggles default `true`).
- Pausar destinatário = nenhum envio, mas mantém configuração.
- Remover destinatário = exclui permanentemente.
- Se nenhum destinatário ativo existir, edge function loga e retorna `no_recipients` (sem erro).

### Compatibilidade retroativa

- Triggers SQL (`trg_admin_notify_*`), `mp-webhook`, `admin-telegram-watchdog`, `admin-telegram-digest` continuam **chamando a mesma edge function com mesmo payload** — zero mudança nesses lugares.
- A multiplexação acontece **dentro da edge function**.

### Arquivos envolvidos

**Editados:**
- `src/components/admin/AdminTelegramTab.tsx` (UI multi-destinatário)
- `supabase/functions/admin-telegram-notify/index.ts` (loop de envio)

**Migração SQL (1 arquivo):**
- Cria tabela `admin_telegram_recipients` com RLS
- Adiciona coluna `recipient_name` em `admin_telegram_log`
- Backfill: se houver `admin_telegram_chat_id` em `platform_config`, cria linha "Principal"

### Resultado esperado

Você pode adicionar quantos contatos quiser (você, sócio, atendimento, financeiro), cada um recebendo só os eventos que importam pra ele. Tudo controlado por uma UI simples na aba Telegram Admin, sem precisar mexer em código.

