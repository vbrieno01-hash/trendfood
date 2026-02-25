

# Plano: Substituir a logo em todas as páginas

A nova logo (chapéu de chef) será colocada em dois arquivos que alimentam todas as páginas do sistema.

## Arquivos de logo substituídos

### 1. `src/assets/logo-icon.png`
- Substituir pela nova logo (chapéu de chef)
- Esse arquivo é importado em **7 páginas**:
  - Página inicial (`Index.tsx`)
  - Login (`AuthPage.tsx`)
  - Planos (`PricingPage.tsx`)
  - Dashboard (`DashboardPage.tsx`)
  - Admin (`AdminPage.tsx`)
  - Termos (`TermsPage.tsx`)
  - Privacidade (`PrivacyPage.tsx`)

### 2. `public/logo-trendfood.png`
- Substituir pela nova logo
- Usado em:
  - Página de pedidos do cliente / delivery (`UnitPage.tsx`)
  - Marca d'água nos relatórios (`ReportsTab.tsx`, `CourierReportSection.tsx`)

## O que NÃO muda
- Nenhum código será alterado — só os dois arquivos de imagem são substituídos
- Todas as referências no código já apontam para esses arquivos
- Layout, tamanhos e posicionamento permanecem iguais

## Seção técnica
```text
Arquivos modificados: 2 (substituição de imagem)
Código alterado: 0 linhas
Risco: zero — apenas troca de arquivo de imagem
Páginas afetadas: ~10 (todas que mostram a logo)
```

