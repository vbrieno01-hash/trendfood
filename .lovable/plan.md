

## Corrigir preço do plano Grátis

O plano "Grátis" na tabela `platform_plans` está com `price_cents = 500` (R$ 5/mês). Precisa ser atualizado para `0` para que exiba "Grátis" corretamente.

### Alteração

**Migration SQL:**
```sql
UPDATE platform_plans SET price_cents = 0 WHERE key = 'free';
```

Nenhuma alteração de código necessária — o `formatPrice` já retorna "Grátis" quando `cents === 0`.

