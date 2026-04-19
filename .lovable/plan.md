
## Pedido

Remover o card de atualização da página de vendas (storefront público `/unidade/[slug]`) e manter só dentro do sistema/dashboard. O prompt flutuante "Nova versão disponível" tá aparecendo pra clientes finais também, e isso não faz sentido.

## Análise

O `PWAUpdatePrompt` (canto inferior direito, flutuante) é montado globalmente em `App.tsx`, então aparece em **todas** as rotas — incluindo storefront público (`/unidade/:slug`), página de mesa, checkout, review, etc. Cliente final não precisa ver isso.

O `VersionCheckCard` (dentro do dashboard) já tá no lugar certo — só lojista vê. Esse não mexo.

## Solução

Restringir o `PWAUpdatePrompt` pra renderizar **apenas em rotas internas** do sistema:
- `/dashboard`
- `/admin`
- `/cozinha`
- `/garcom`
- `/motoboy`
- `/caixa`

E **não renderizar** em:
- `/` (landing)
- `/unidade/*` (storefront)
- `/mesa/*` (cardápio mesa)
- `/auth`, `/instalar`, `/precos`, `/privacidade`, `/termos`, `/avaliar/*`, `/reset-password`, `/docs/*`

### Implementação

Dentro do próprio `PWAUpdatePrompt.tsx`, usar `useLocation()` do react-router e fazer um early return se a rota não começar com um dos prefixos internos. Mais simples e isolado do que mexer no `App.tsx`.

```tsx
const INTERNAL_PREFIXES = ['/dashboard', '/admin', '/cozinha', '/garcom', '/motoboy', '/caixa'];
const location = useLocation();
const isInternal = INTERNAL_PREFIXES.some(p => location.pathname.startsWith(p));
if (!isInternal || !showPrompt) return null;
```

## Arquivo

- `src/components/PWAUpdatePrompt.tsx` — adicionar guarda de rota
