

## Melhorar visual do cartão QR Code

Tornar o cartão QR Code mais profissional para impressão, com melhor hierarquia visual, bordas elegantes e espaçamento adequado.

### Alterações em `src/components/dashboard/StoreProfileTab.tsx` (linhas 944-962)

Substituir o container `#qr-print-area` atual por um layout mais refinado:

- **Borda dupla decorativa**: borda externa arredondada com sombra sutil + borda interna pontilhada para efeito de "cartão recortável"
- **Logo maior**: chef logo de 32x32px (era 24x24)
- **Nome da loja**: fonte maior (text-xl, font-extrabold), cor escura
- **QR Code**: tamanho mantido (200px), com padding extra ao redor
- **Texto instrucional**: "Escaneie o QR Code para acessar nosso cardápio digital" — mais descritivo
- **Rodapé**: URL pública da loja em texto pequeno e cinza, para referência
- **Espaçamento**: padding interno de 8 (p-8) em vez de 6, gap de 4 entre elementos
- **Largura**: maxWidth de 360px (era 320px) para respirar melhor

```tsx
<div
  id="qr-print-area"
  className="flex flex-col items-center p-8 bg-white rounded-2xl border-2 border-gray-200 shadow-lg mx-auto"
  style={{ maxWidth: 360 }}
>
  <div className="border border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center gap-4 w-full">
    <div className="flex items-center gap-2">
      <img src={chefLogo} alt="Logo" className="w-8 h-8 object-contain" />
      <span className="text-xl font-extrabold text-gray-900">{form.name}</span>
    </div>
    <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
    <QRCodeSVG value={publicUrl} size={200} level="H" includeMargin />
    <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
    <p className="text-sm text-gray-600 text-center font-medium">
      Escaneie o QR Code para acessar<br/>nosso cardápio digital
    </p>
    <p className="text-xs text-gray-400 text-center break-all">{publicUrl}</p>
  </div>
</div>
```

Uma única alteração no bloco do cartão. Os botões de download e impressão permanecem iguais.

