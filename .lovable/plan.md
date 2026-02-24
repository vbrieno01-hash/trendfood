

## Sistema de Logs de Erro do Cliente em Tempo Real

### O que será feito

Criar uma tabela `client_error_logs` no banco, capturar erros automaticamente no frontend (crashes do ErrorBoundary, unhandled rejections, erros de console) e enviar pro banco. No painel admin, adicionar uma nova aba "Logs" para visualizar os erros em tempo real.

### Arquivos afetados

| Arquivo | Ação |
|---------|------|
| Migration SQL | Criar tabela `client_error_logs` com RLS |
| `src/lib/errorLogger.ts` | **Novo** — função para enviar erros pro banco |
| `src/components/ErrorBoundary.tsx` | Chamar `logClientError()` no `componentDidCatch` |
| `src/App.tsx` | Capturar `unhandledrejection` e `error` globais e enviar pro banco |
| `src/components/admin/ErrorLogsTab.tsx` | **Novo** — aba no painel admin com lista de erros |
| `src/pages/AdminPage.tsx` | Adicionar aba "Logs" na sidebar e renderizar `ErrorLogsTab` |

### Detalhes técnicos

**1. Tabela `client_error_logs`**
```sql
create table public.client_error_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  error_message text not null,
  error_stack text,
  url text,
  user_agent text,
  user_id uuid,
  organization_id uuid,
  source text default 'unknown', -- 'error_boundary', 'unhandled_rejection', 'global_error'
  metadata jsonb
);

-- RLS: insert público (qualquer cliente pode registrar), select apenas admin
alter table public.client_error_logs enable row level security;

create policy "client_error_logs_insert_public" on public.client_error_logs
  for insert with check (true);

create policy "client_error_logs_select_admin" on public.client_error_logs
  for select using (has_role(auth.uid(), 'admin'));
```

**2. `src/lib/errorLogger.ts`** — Função fire-and-forget que faz insert na tabela. Inclui debounce (máximo 5 erros por minuto) para não spammar o banco. Captura `window.location.href`, `navigator.userAgent`, e tenta pegar `user_id`/`organization_id` se disponíveis.

**3. ErrorBoundary** — No `componentDidCatch`, chamar `logClientError({ message, stack, source: 'error_boundary' })`.

**4. App.tsx** — No handler de `unhandledrejection` e num novo `window.addEventListener('error')`, chamar `logClientError()` com source `'unhandled_rejection'` ou `'global_error'`.

**5. Aba "Logs" no Admin** — Tabela com colunas: Data/Hora, Erro, URL, Navegador, Source. Com botão de refresh e filtro por source. Realtime opcional (pode começar com polling manual via botão).

**6. Tipo da aba** — `AdminTab` passa a incluir `"logs"`. Nav item com ícone `AlertCircle`.

