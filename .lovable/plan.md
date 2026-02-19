

# Corrigir imagem do desktop cortada no mockup

## Problema

A imagem do dashboard dentro do mockup de notebook esta sendo cortada porque o container tem uma altura fixa de 300px com `object-cover object-top`, que corta o conteudo inferior.

## Solucao

1. Copiar as imagens para `src/assets/` (resolve o cache) e importar como modulos ES6
2. Aumentar a altura do container da imagem do notebook e ajustar o `object-fit` para mostrar mais conteudo

## Mudancas

### `src/assets/dashboard-screenshot.png`
- Copiar `user-uploads://image-32.png` (a imagem nova do dashboard)

### `src/assets/mobile-screenshot.png`
- Copiar `user-uploads://fasfasdasfasdasf.jpeg` (a imagem nova do mobile)

### `src/components/landing/ShowcaseSection.tsx`

- Adicionar imports no topo:
```typescript
import dashboardImg from "@/assets/dashboard-screenshot.png";
import mobileImg from "@/assets/mobile-screenshot.png";
```

- Trocar a altura fixa do container de `height: 300` para `height: 340` para mostrar mais da imagem
- Trocar `object-cover object-top` por `object-contain` para nao cortar o conteudo
- Substituir os caminhos das imagens pelos imports

| Arquivo | Mudanca |
|---|---|
| `src/assets/dashboard-screenshot.png` | Novo - imagem importada como modulo |
| `src/assets/mobile-screenshot.png` | Novo - imagem importada como modulo |
| `src/components/landing/ShowcaseSection.tsx` | Imports ES6 + altura maior + object-contain |

