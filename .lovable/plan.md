

## Capturar o cartão completo (logo + nome + QR) no download PNG

O problema: o botão "Baixar PNG" captura apenas o SVG do QR Code. O cartão inteiro (logo, nome, texto "Escaneie...") é ignorado.

### Solução

Usar `html2canvas` (já instalado no projeto) para capturar o container `#qr-print-area` inteiro como imagem, em vez de serializar apenas o SVG.

### Alteração em `src/components/dashboard/StoreProfileTab.tsx`

1. Importar `html2canvas` no topo do arquivo
2. Substituir a lógica do `onClick` do botão "Baixar PNG" (linhas 968-988) por:

```ts
onClick={async () => {
  const container = document.getElementById("qr-print-area");
  if (!container) return;
  const canvas = await html2canvas(container, { scale: 2, backgroundColor: "#ffffff" });
  const a = document.createElement("a");
  a.href = canvas.toDataURL("image/png");
  a.download = `qrcode-${form.slug}.png`;
  a.click();
}}
```

Isso captura todo o conteúdo visual do cartão — logo do chef, nome da loja, QR code e texto — em uma única imagem PNG.

