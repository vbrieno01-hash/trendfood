## Objetivo
Eliminar os erros nas páginas públicas de loja/pedido para qualquer cliente, inclusive quando ele estiver logado, sem abrir acesso indevido a dados sensíveis.

## O que vou corrigir
1. Ajustar as permissões de leitura da loja pública para funcionar tanto para visitantes anônimos quanto para usuários autenticados.
2. Ajustar a permissão de atualização de `distance_km` para não quebrar checkout/pedido quando o cliente tiver sessão ativa.
3. Revisar todas as consultas usadas nas páginas públicas (`/unidade/:slug`, `/unidade/:slug/mesa/:tableNumber`, `/avaliar/:slug/:orderId`) para garantir compatibilidade com acesso público real.
4. Validar que a correção não afeta painel, cozinha, pagamentos, motoboy nem dados privados.

## Causa provável encontrada
A página pública busca a loja em `organizations`, mas a policy pública atual está liberada só para `anon`. Se o cliente estiver logado, ele entra como `authenticated` e pode receber `null`, o que leva a 404 em lojas públicas.

Também encontrei a policy nova de `deliveries_update_distance_anon` limitada a `anon`, o que pode explicar por que a correção funcionou só para parte dos usuários e não para todos.

## Implementação
- Criar migração aditiva para:
  - permitir leitura pública segura das informações básicas da loja para `public` (ou política equivalente cobrindo `anon` + `authenticated`), sem expor colunas sensíveis;
  - permitir o update restrito de `distance_km` nas mesmas condições atuais, mas cobrindo clientes com ou sem sessão, mantendo os filtros de segurança (`status = 'pendente'` e `courier_id IS NULL`).
- Conferir se há outras tabelas usadas pela vitrine pública que precisem da mesma cobertura de role.
- Manter RLS restritivo em tudo que contém PII ou dados operacionais privados.

## Validação
- Testar carregamento de lojas públicas com sessão anônima e autenticada.
- Testar fluxo de pedido/checkout em página pública.
- Confirmar que dashboard/cozinha/motoboy continuam com acesso isolado.
- Verificar que nenhuma coluna sensível da loja foi exposta por engano.

## Detalhes técnicos
- Arquivos/áreas a revisar na implementação:
  - `src/hooks/useOrganization.ts`
  - `src/pages/UnitPage.tsx`
  - `src/pages/TableOrderPage.tsx`
  - migrações RLS em `supabase/migrations/*`
- A correção deve ser feita no backend via RLS, não com workaround no frontend, porque o bug é de role (`anon` vs `authenticated`) nas páginas públicas.
- A migração será aditiva e visível para aprovação antes de aplicar.