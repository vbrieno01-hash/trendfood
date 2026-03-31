

## Plano: Corrigir redirecionamento do link de redefinição de senha

### Problema
Quando o cliente clica no link de redefinição de senha no e-mail, ele é redirecionado para a página de login do Lovable em vez da página `/redefinir-senha` do TrendFood. Isso acontece porque:

1. O `redirectTo` usa `window.location.origin` que no preview aponta para a URL de preview, não para `trendfood.lovable.app`
2. A URL de redirect precisa estar na lista de URLs permitidas do Supabase Auth

### Solução

**1. Fixar a URL de redirect para o domínio publicado** (`src/pages/AuthPage.tsx`)
- Trocar `window.location.origin` por `https://trendfood.lovable.app` no `resetPasswordForEmail`
- Isso garante que o link no e-mail sempre aponte para o site publicado

**2. Configurar redirect URLs no Supabase Auth**
- Adicionar `https://trendfood.lovable.app/**` como URL de redirect permitida nas configurações de autenticação

### Arquivos alterados
- `src/pages/AuthPage.tsx` — fixar URL de redirect para o domínio publicado

