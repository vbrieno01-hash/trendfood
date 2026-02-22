
# Corrigir scroll ao navegar entre paginas

## Problema
Ao clicar em links (como "Termos de Uso" ou "Politica de Privacidade"), a pagina abre na posicao de scroll anterior em vez de comecar do topo. Isso acontece porque o React Router nao faz scroll automatico para o topo ao trocar de rota.

## Solucao
Criar um componente `ScrollToTop` que detecta mudancas de rota e rola a pagina para o topo automaticamente.

## Mudancas

### Novo arquivo: `src/components/ScrollToTop.tsx`
- Componente que usa `useLocation` e `useNavigationType` do React Router
- Ao detectar navegacao para frente (nao botao "voltar"), rola a janela para o topo
- Nao renderiza nada visualmente (retorna `null`)

### Arquivo modificado: `src/App.tsx`
- Importar o `ScrollToTop`
- Adicionar `<ScrollToTop />` logo apos o `<BrowserRouter>`, antes das `<Routes>`

Isso corrige o problema para todas as rotas do app de uma vez.
