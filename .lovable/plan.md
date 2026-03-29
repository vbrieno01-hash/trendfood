

## Plano: Adicionar Login com Google

### Abordagem
Este projeto usa Lovable Cloud, que já tem Google OAuth gerenciado automaticamente — não precisa configurar credenciais.

### Alterações

**1. Configurar Social Auth** — usar a ferramenta `Configure Social Login` para gerar o módulo `src/integrations/lovable/` com suporte a Google OAuth.

**2. `src/pages/AuthPage.tsx`** — adicionar botão "Entrar com Google" nas duas abas (Login e Cadastro):

- Importar `lovable` de `@/integrations/lovable/index`
- Criar função `handleGoogleLogin` que chama `lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin })`
- Adicionar botão com ícone do Google antes dos formulários, com separador "ou"
- Estilo: botão outline com ícone SVG do Google, texto "Continuar com Google"

**3. Tratamento pós-login Google** — no `useAuth.tsx`, o `onAuthStateChange` já detecta `SIGNED_IN` e busca a organização. Para novos usuários Google que não têm organização, o fluxo existente já lida (org fica null e o dashboard pode redirecionar para onboarding).

### Layout do botão

```text
┌──────────────────────────────┐
│  [G] Continuar com Google    │  ← botão outline
└──────────────────────────────┘
        ── ou ──
  [formulário normal]
```

### Arquivos alterados
- `src/integrations/lovable/` (gerado pela ferramenta)
- `src/pages/AuthPage.tsx` (botão Google + handler)

