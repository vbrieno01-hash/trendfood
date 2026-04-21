

## Plano — Corrigir espaçamento do badge "Você está entrando em TrendFood"

### Problema

No header do painel esquerdo do `AuthPage.tsx`, o logo "TrendFood" (esquerda) e o badge "Você está entrando em TrendFood" (direita) estão visualmente grudados/encostando nas bordas, sem respiro adequado.

### Correção

Em `src/pages/AuthPage.tsx`, no header do painel esquerdo:

1. **Aumentar gap entre logo e badge**: adicionar `gap-4` (ou maior) no container flex que agrupa os dois
2. **Adicionar padding interno do header**: garantir `px-2` ou `px-4` extra pra que nem o logo nem o badge encostem nas bordas do painel
3. **Espaçamento interno do badge**: revisar `px-3 py-1.5` do badge pra garantir respiro do texto
4. **Margin-bottom do header**: garantir separação adequada do conteúdo abaixo (form)

### Resultado

- Logo e badge com respiro visual claro entre si
- Ambos afastados das bordas do painel
- Header mais "respirado", combinando com a estética premium do resto da página

### Arquivo
- `src/pages/AuthPage.tsx` (apenas ajustes de spacing/gap no header)

