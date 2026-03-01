

## Problema Identificado

O link de indicação está usando `window.location.origin` (linha 25 do `ReferralSection.tsx`), que no ambiente de preview retorna a URL longa do Lovable (`https://id-preview--4930409c-...lovable.app`). Isso gera dois problemas:

1. O link fica extenso e feio para compartilhar
2. Não mostra a marca "TrendFood"
3. Se alguém abrir esse link, pode cair numa sessão de preview, não no site publicado

## Solução

Trocar `window.location.origin` por um domínio fixo apontando para o site publicado (`https://trendfood.lovable.app`). Assim o link ficará:

```
trendfood.lovable.app/cadastro?ref=UUID
```

### Alteração

**Arquivo:** `src/components/dashboard/ReferralSection.tsx`

- Linha 25: substituir `window.location.origin` por uma constante com o domínio publicado
- Usar `const BASE_URL = "https://trendfood.lovable.app"` no topo do componente
- O link gerado passará a ser `https://trendfood.lovable.app/cadastro?ref={orgId}`

Isso é uma alteração de 2 linhas, rápida e direta.

