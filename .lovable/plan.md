

## Plano: Trocar imagem do ShowcaseSection

### 1. Copiar a imagem para o projeto
Copiar `user-uploads://ssss-removebg-preview.png` para `src/assets/showcase-devices.png`

### 2. Atualizar `src/components/landing/ShowcaseSection.tsx`
- Remover imports de `dashboardImg` e `mobileImg`
- Importar nova imagem `showcase-devices.png`
- Substituir o componente `DashboardMockup` (que monta frames fake de laptop e celular) por uma simples `<img>` com a nova imagem
- Manter o layout de 3 colunas (texto esquerda, imagem centro, texto direita) e os textos/badges existentes

