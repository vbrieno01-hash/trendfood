

## Correção do botão "Baixar PNG"

O problema é que o componente `QRCodeSVG` da biblioteca `qrcode.react` não encaminha (forward) a `ref` para o elemento SVG interno, então `qrRef.current` fica sempre `null` e o download não acontece.

### Solução

Em `src/components/dashboard/StoreProfileTab.tsx`:

1. Remover o `useRef<SVGSVGElement>` do `qrRef` e remover a prop `ref` do `QRCodeSVG`
2. No `onClick` do botão "Baixar PNG", buscar o SVG diretamente pelo DOM:
   ```ts
   const container = document.getElementById("qr-print-area");
   const svg = container?.querySelector("svg");
   if (!svg) return;
   ```
3. O restante da lógica (serializar SVG → canvas → download PNG) permanece igual

Isso garante que o SVG real renderizado pelo `QRCodeSVG` seja capturado corretamente.

