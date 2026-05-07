## Corrigir link copiado dos afiliados

### Problema
O botão "Link" do painel admin copia o link usando `window.location.origin`, então quando você está no preview (`...lovableproject.com`) o link enviado vem com domínio errado.

### Mudança
Em `src/components/admin/AffiliatesTab.tsx`, trocar:

```ts
const baseUrl = typeof window !== "undefined" ? `${window.location.origin}/auth` : "";
```

Por:

```ts
const PROD_URL = "https://trendfood.lovable.app";
const baseUrl = `${PROD_URL}/auth`;
```

### Resultado
Botão "Link" sempre vai copiar:  
`https://trendfood.lovable.app/auth?aff=CODIGO`  
não importa de onde você abrir o painel (preview, prod, mobile).

Nenhuma outra alteração necessária — captura do `?aff=` no `AuthPage.tsx` já funciona.