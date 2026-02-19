

# Adicionar botao "Gerenciar Assinatura" no dashboard

## Resumo

Adicionar uma secao de assinatura na aba Configuracoes do dashboard com um botao que chama a edge function `customer-portal` e redireciona o usuario para o portal do Stripe, onde ele pode cancelar, trocar cartao ou mudar de plano.

## O que sera feito

### 1. Atualizar SettingsTab.tsx

Adicionar uma nova secao "Assinatura" entre as informacoes da conta e a alteracao de senha, contendo:

- Exibicao do plano atual (Free, Pro ou Enterprise) obtido via `useAuth`
- Botao "Gerenciar Assinatura" que:
  - Chama `supabase.functions.invoke('customer-portal')` com o token do usuario
  - Exibe estado de loading durante a requisicao
  - Abre a URL retornada em uma nova aba
  - Exibe toast de erro se falhar
- Para usuarios no plano Free (sem customer no Stripe), o botao exibe "Fazer upgrade" e redireciona para `/planos`

### 2. Detalhes tecnicos

No arquivo `src/components/dashboard/SettingsTab.tsx`:

- Importar `organization` do `useAuth()` e `useNavigate` (ja importado)
- Importar icone `CreditCard` do lucide-react
- Adicionar estado `portalLoading` para controle do botao
- Criar funcao `handleManageSubscription` que invoca a edge function
- Renderizar a secao entre "Informacoes da conta" e "Alterar senha"

A edge function `customer-portal` ja esta implementada e deployada, nao precisa de alteracoes.

