
# Notificacao em Tempo Real para Atualizacao de Plano

## Objetivo
Quando o webhook da Cakto atualizar o `subscription_plan` ou `subscription_status` na tabela `organizations`, o dashboard deve detectar a mudanca automaticamente, atualizar o estado local e exibir um toast de confirmacao -- sem recarregar a pagina.

## Como funciona

1. **Habilitar Realtime na tabela `organizations`** via migracao SQL (`ALTER PUBLICATION supabase_realtime ADD TABLE public.organizations`).

2. **Adicionar um canal Realtime no `useAuth`** (dentro do `AuthProvider`) que escuta eventos `UPDATE` na tabela `organizations`, filtrado pelo `id` da organizacao do usuario logado.

3. Quando o evento chegar:
   - Comparar o `subscription_plan` anterior com o novo.
   - Se mudou, atualizar o estado `organization` com os novos dados.
   - Exibir um `toast.success` com a mensagem apropriada (ex: "Seu plano foi atualizado para Pro!").

## Detalhes Tecnicos

### Migracao SQL
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.organizations;
```

### Alteracao em `src/hooks/useAuth.tsx`
- Importar `toast` de `sonner`.
- Dentro do `useEffect` principal, apos obter a organizacao, abrir um canal Realtime:
  ```
  supabase.channel('org-plan-updates')
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'organizations',
      filter: `id=eq.${orgId}`
    }, (payload) => { ... })
    .subscribe()
  ```
- No callback, verificar se `subscription_plan` mudou comparando `payload.new` com o estado atual (via `useRef` para evitar stale closure).
- Atualizar `setOrganization(payload.new)` e disparar `toast.success(...)`.
- Fazer cleanup do canal no return do `useEffect`.

### Mapa de nomes de planos para o toast
- `free` -> "Gratuito"
- `pro` -> "Pro"
- `enterprise` -> "Enterprise"

Mensagem: `"Seu plano foi atualizado para {nome}! As novas funcionalidades ja estao disponiveis."`
