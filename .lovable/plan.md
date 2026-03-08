

## Substituir link do rodapé por QR Code na comanda

Trocar o texto "ACESSE: HTTPS://TRENDFOOD.LOVABLE.APP/" por um mini QR Code que aponta para o site, tornando o rodapé mais elegante e funcional.

### Alterações

**1. `src/components/shared/ThermalReceipt.tsx` (linha 109)**
- Importar `QRCodeSVG` de `qrcode.react`
- Substituir a linha de texto pela renderização de um QR Code pequeno (64x64px) centralizado, com o texto "POWERED BY: TRENDFOOD" acima

```tsx
// Antes
<div className="text-center text-[10px] mt-1">ACESSE: HTTPS://TRENDFOOD.LOVABLE.APP/</div>

// Depois
<div className="flex justify-center mt-2">
  <QRCodeSVG value="https://trendfood.lovable.app/" size={64} level="L" />
</div>
```

**2. `src/lib/printOrder.ts` (linha 174)**
- Já importa `QRCode` (lib `qrcode`) — usar para gerar um data URI do QR
- Substituir o texto por uma `<img>` com o QR code gerado via `QRCode.toDataURL`
- A função `buildPrintHtml` precisa ser `async` (ou gerar o QR antes e passar como parâmetro)
- Tamanho pequeno: ~80px

**3. `src/lib/formatReceiptText.ts` (linha 212)**
- Para impressoras Bluetooth/Desktop (texto puro), QR code não é viável
- Manter o texto "Acesse: https://trendfood.lovable.app/" como fallback neste formato

### Resumo
- Preview e impressão browser: QR Code visual no rodapé
- Impressão Bluetooth/Desktop (texto): mantém o link em texto (limitação do formato)

