

# Ajuste de RLS - Restringir SELECT em cash_sessions

## Situacao Atual

Apos as correcoes de seguranca anteriores, quase todas as tabelas ja estao com RLS correto. Segue o resumo:

### Tabelas ja protegidas (sem alteracao necessaria)
- **cash_withdrawals**: SELECT restrito ao dono (corrigido anteriormente)
- **coupons**: SELECT restrito ao dono + RPCs publicas para validacao (corrigido anteriormente)
- **organization_secrets**: todas as operacoes restritas ao dono
- **profiles**: todas as operacoes restritas ao proprio usuario
- **user_roles**: SELECT restrito a admins
- **platform_config**: SELECT publico (necessario), UPDATE restrito a admins

### Tabelas com acesso publico por design operacional (sem alteracao)
- **organizations**: SELECT publico necessario para vitrines de clientes
- **menu_items**: SELECT publico necessario para cardapios
- **orders**: SELECT/INSERT publico necessario para paineis de cozinha/garcom e pedidos de clientes; UPDATE ja restrito (campos estruturais protegidos)
- **order_items**: SELECT/INSERT publico necessario para pedidos de clientes
- **tables**: SELECT publico necessario para clientes verem mesas
- **suggestions**: SELECT/INSERT publico necessario para mural de sugestoes

### Problema encontrado
- **cash_sessions**: tem `cash_sessions_select_public` com `USING (true)`, expondo dados de sessoes de caixa (saldos de abertura/fechamento, horarios) para qualquer pessoa. Esse dado so e acessado pelo lojista autenticado no painel de Caixa.

## Correcao

### Migracao SQL

Substituir a politica publica de SELECT por uma restrita ao dono da organizacao:

```sql
DROP POLICY IF EXISTS "cash_sessions_select_public" ON public.cash_sessions;
CREATE POLICY "cash_sessions_select_owner" ON public.cash_sessions
  FOR SELECT USING (
    auth.uid() = (
      SELECT o.user_id FROM organizations o
      WHERE o.id = cash_sessions.organization_id
    )
  );
```

### Impacto
Nenhum. O painel de Caixa e acessado apenas pelo lojista autenticado, que ja passa pela verificacao de `auth.uid()`.

### Alteracoes no frontend
Nenhuma. O codigo em `useCashSession.ts` continua identico.

