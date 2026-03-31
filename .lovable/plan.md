

## Plano: QR Code do TrendFood nas comandas impressas

### Situação atual
- **Impressão browser** (`printOrder`): O QR code **já é gerado** via `QRCode.toDataURL("https://trendfood.lovable.app/")`, mas se o `try/catch` falhar silenciosamente, cai no fallback de texto puro ("Acesse: https://trendfood.lovable.app/").
- **Impressão Bluetooth/Desktop** (`formatReceiptText`): **Não tem QR code nenhum** — só imprime a linha de texto "Acesse: https://trendfood.lovable.app/". Impressoras térmicas de texto puro não suportam imagens inline facilmente.
- **Preview React** (`ThermalReceipt.tsx`): Usa `<QRCodeSVG>` e funciona corretamente no preview.

### O que será feito

**1. Garantir QR code na impressão browser** (`printOrder.ts`)
- Mover a geração do QR do footer para **antes** de abrir a janela, com log de erro se falhar
- Aumentar tamanho do QR para melhor leitura (100px → 120px)

**2. Impressão Bluetooth/Desktop — sem solução de QR**
- Impressoras térmicas ESC/POS de texto puro não suportam imagens sem comandos ESC/POS específicos
- Manter o link em texto: "ACESSE: HTTPS://TRENDFOOD.LOVABLE.APP/"
- Isso já funciona e é a única opção sem API ESC/POS de imagem

### Arquivos alterados
- `src/lib/printOrder.ts` — garantir que o QR code do footer nunca falhe silenciosamente + aumentar tamanho

