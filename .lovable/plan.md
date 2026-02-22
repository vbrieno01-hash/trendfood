

# PIX Individual por Motoboy - QR Code Inteligente

## Resumo
O dono clica em um motoboy especifico, o QR Code PIX abre so para aquele motoboy. Quando o pagamento e confirmado (baixa manual), o QR some automaticamente em tempo real. Apenas um QR aberto por vez.

## Alteracoes

| Arquivo | O que muda |
|---------|-----------|
| **Migracao SQL** | Adicionar coluna `pix_key` (text, nullable) na tabela `couriers`. Adicionar politica `couriers_update_public` para o motoboy poder salvar sua chave PIX. |
| `src/hooks/useCourier.ts` | Adicionar `pix_key` ao type `Courier`. Criar hook `useUpdateCourierPixKey`. |
| `src/pages/CourierPage.tsx` | Na aba "Resumo", adicionar card para o motoboy cadastrar/editar sua chave PIX. |
| `src/components/dashboard/CourierDashboardTab.tsx` | Substituir o AlertDialog de "Pagar tudo" por um sistema de expansao individual: clicar no motoboy expande o card mostrando QR Code PIX + botao "Copiar Pix Copia e Cola" + botao "Confirmar Pagamento". Apenas um card expandido por vez. Quando o pagamento e confirmado, o card fecha automaticamente via realtime (unpaidTotal volta a 0). Se o motoboy nao tem chave PIX, mostra aviso. |

## Fluxo do dono

1. Ve lista de motoboys com debito pendente
2. Clica no card de UM motoboy - o card expande mostrando QR Code PIX
3. Escaneia o QR no app do banco
4. Clica "Confirmar Pagamento" para dar a baixa
5. O card fecha automaticamente (unpaidTotal = 0, QR some)
6. Se quiser pagar outro, clica no proximo motoboy

## Detalhes tecnicos

### Migracao SQL
```sql
ALTER TABLE public.couriers ADD COLUMN pix_key text;

CREATE POLICY "couriers_update_public" ON public.couriers
  FOR UPDATE USING (true) WITH CHECK (true);
```

### Estado de expansao no dashboard
Usar `useState<string | null>(null)` para guardar o ID do motoboy cujo card esta expandido. Clicar em outro motoboy fecha o anterior e abre o novo. Quando `unpaidTotal` do motoboy expandido chega a 0 (via realtime), o estado limpa automaticamente com `useEffect`.

### QR Code PIX
Usar `buildPixPayload` de `src/lib/pixPayload.ts` com a `pix_key` do motoboy, o valor total e o nome do motoboy. Renderizar com `QRCodeSVG` do `qrcode.react`. Botao para copiar o payload (Pix Copia e Cola).

### Painel do motoboy - campo PIX
Card com Input + botao "Salvar" na aba Resumo. Hook `useUpdateCourierPixKey` faz UPDATE direto na tabela `couriers` pelo ID do motoboy.

### Sem chave PIX
Se o motoboy nao cadastrou chave PIX, o card expandido mostra aviso amarelo "Motoboy nao cadastrou chave PIX" mas ainda permite confirmar pagamento manualmente.

