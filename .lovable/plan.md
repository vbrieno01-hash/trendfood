

## Bug: theme_config não persiste entre sessões

### Causa raiz
Em `src/hooks/useAuth.tsx` linha 82, a query `fetchOrganization` lista todas as colunas da organização, mas **`theme_config` não está incluída** na lista do `.select()`. Isso faz com que quando o usuário sai e volta (ou dá refresh), o dado da organização volta sem `theme_config`, e o componente inicializa com `{}` (padrão).

### Correção
**`src/hooks/useAuth.tsx`** — Adicionar `theme_config` na string do `.select()` na função `fetchOrganization` (linha 82), junto com as outras colunas.

Mudança de uma única linha, zero risco de quebrar algo.

