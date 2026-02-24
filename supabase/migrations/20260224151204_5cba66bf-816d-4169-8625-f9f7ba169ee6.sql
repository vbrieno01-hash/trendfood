
create table public.client_error_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  error_message text not null,
  error_stack text,
  url text,
  user_agent text,
  user_id uuid,
  organization_id uuid,
  source text default 'unknown',
  metadata jsonb
);

alter table public.client_error_logs enable row level security;

create policy "client_error_logs_insert_public" on public.client_error_logs
  for insert with check (true);

create policy "client_error_logs_select_admin" on public.client_error_logs
  for select using (has_role(auth.uid(), 'admin'));

create policy "client_error_logs_delete_admin" on public.client_error_logs
  for delete using (has_role(auth.uid(), 'admin'));
