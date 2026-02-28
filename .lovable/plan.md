

## Plano: Usar mockups CSS com as novas screenshots

### 1. Copiar as duas imagens para o projeto
- `user-uploads://image-324.png` → `src/assets/dashboard-screenshot.png` (desktop)
- `user-uploads://sasasas.jpeg` → `src/assets/mobile-screenshot.png` (mobile)

### 2. Atualizar `src/components/landing/ShowcaseSection.tsx`
- Remover import da imagem única `showcase-devices.png`
- Importar as duas novas screenshots (`dashboard-screenshot.png` e `mobile-screenshot.png`)
- Restaurar o componente `DashboardMockup` com frames CSS (barra de titulo estilo Mac para o laptop, moldura de celular para o mobile)
- Usar as screenshots reais dentro dos mockups via `<img>` com `object-cover`
- Manter o layout de 3 colunas e todos os textos/badges existentes

