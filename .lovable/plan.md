
# Corrigir botao "Voltar" na pagina de Planos

## Problema

Quando um usuario logado clica em "Assinar Pro" no dashboard e vai para `/planos`, o botao "Voltar" sempre redireciona para `/` (pagina inicial/login) em vez de voltar ao dashboard.

## Solucao

Alterar a pagina de Planos (`src/pages/PricingPage.tsx`) para:

1. Usar `useNavigate` do React Router para detectar se o usuario veio de outra pagina do app
2. Se veio do dashboard (ou qualquer outra pagina interna), o botao "Voltar" usa `navigate(-1)` para voltar a pagina anterior
3. Se acessou diretamente (sem historico), volta para `/` como fallback
4. O logo no header tambem segue a mesma logica

## Detalhes tecnicos

**Arquivo:** `src/pages/PricingPage.tsx`

- Importar `useNavigate` e `useLocation` do `react-router-dom`
- Verificar se existe historico de navegacao (o usuario veio de outra pagina do app) usando `window.history.length > 1` ou checando `location.state`
- Trocar o `<Link to="/">` do botao "Voltar" por um `<button onClick={() => navigate(-1)}>` quando houver historico
- Manter o fallback para `/` quando o usuario acessou a pagina diretamente
- Tambem esconder o botao "Entrar" se o usuario ja estiver logado
