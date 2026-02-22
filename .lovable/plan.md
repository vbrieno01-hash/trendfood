

# QR Code PIX no Pagamento do Motoboy

## Problema
O diálogo de "Pagar tudo" mostra apenas texto de confirmação, sem o QR Code PIX do motoboy. A funcionalidade de QR Code foi planejada mas nunca implementada.

## Alterações

| Arquivo | O que muda |
|---------|-----------|
| `src/hooks/useCourier.ts` | Adicionar `pix_key?: string` ao interface `Courier` |
| `src/components/dashboard/CourierDashboardTab.tsx` | Substituir o `AlertDialog` simples por um card expansível: ao clicar no motoboy, expande mostrando QR Code PIX (gerado com `buildPixPayload`), botão "Copiar Pix Copia e Cola", e botão "Confirmar Pagamento". Se o motoboy não tem `pix_key`, mostra aviso amarelo mas permite confirmar mesmo assim. Auto-fecha quando `unpaidTotal` chega a 0. |

## Detalhes técnicos

### Interface Courier
Adicionar `pix_key?: string | null` ao type existente.

### Card expansível (substituindo AlertDialog)
- Estado `expandedCourierId: string | null` controla qual motoboy está expandido
- Clicar no card do motoboy com débito expande/colapsa
- Apenas um card expandido por vez
- Quando expandido, mostra:
  - QR Code gerado via `buildPixPayload(courier.pix_key, unpaidTotal, courier.name)` usando `QRCodeSVG`
  - Botão "Copiar Pix Copia e Cola" com o payload
  - Botão "Confirmar Pagamento" (mesmo comportamento atual do `payMutation`)
  - Se `pix_key` ausente: aviso amarelo "Motoboy não cadastrou chave PIX"
- `useEffect` que auto-fecha o card quando `unpaidTotal` do motoboy expandido chega a 0

### Imports adicionais
- `import { QRCodeSVG } from "qrcode.react"` (já instalado)
- `import { buildPixPayload } from "@/lib/pixPayload"` (já existe)
- `import { Copy } from "lucide-react"` para o botão de copiar

