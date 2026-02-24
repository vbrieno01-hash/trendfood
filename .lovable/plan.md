

## Restringir o balão de suporte apenas às páginas internas

### Problema
O widget de chat aparece em todas as páginas, incluindo landing page (`/`), login (`/auth`, `/cadastro`), planos (`/planos`), termos, privacidade, etc.

### Solução
Mover o `SupportChatWidget` de fora das rotas para dentro de um wrapper que verifica a rota atual. O balão só aparece nas rotas internas do app:
- `/dashboard`
- `/cozinha`
- `/garcom`
- `/admin`
- `/motoboy`

### Detalhes Técnicos

**Arquivo: `src/App.tsx`**

Substituir a linha:
```
{!Capacitor.isNativePlatform() && <SupportChatWidget />}
```

Por um componente auxiliar que usa `useLocation` do React Router para checar a rota atual e só renderizar o widget nas rotas internas:

```tsx
const ConditionalSupportChat = () => {
  const { pathname } = useLocation();
  const internalRoutes = ["/dashboard", "/cozinha", "/garcom", "/admin", "/motoboy"];
  const show = internalRoutes.some(r => pathname.startsWith(r));
  if (!show) return null;
  return <SupportChatWidget />;
};
```

E no JSX:
```
{!Capacitor.isNativePlatform() && <ConditionalSupportChat />}
```

Importar `useLocation` de `react-router-dom`.

### Resultado
O balãozinho só aparece quando o usuário está logado e dentro do app (dashboard, cozinha, garçom, admin, motoboy). Não aparece na landing page, login, planos, termos, nem privacidade.

