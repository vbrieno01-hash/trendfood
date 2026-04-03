
## Plano: Padronizar rodapé da página de Planos

### Problema
A `PricingPage.tsx` é a única página com rodapé desatualizado:
- Mostra "© 2025" em vez de "© 2026"
- Falta o CNPJ e razão social
- Texto "Feito com ❤️" diferente do padrão das outras páginas

### Correção
Atualizar o footer em `src/pages/PricingPage.tsx` para seguir o padrão:

```
© 2026 TrendFood. Todos os direitos reservados.
CNPJ 66.067.207/0001-91 — JACKSON BRENO FRANCELINO DA COSTA
```

### Resultado
- 1 arquivo editado (`PricingPage.tsx`)
- Todas as páginas com rodapé institucional consistente
