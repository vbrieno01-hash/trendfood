

# Plano: Limpar lista de gateways PIX — manter apenas os que funcionam

## Problema

A lista de provedores no select inclui bancos (Inter, Sicredi, Bradesco, Itaú, BB, Santander, Caixa, Nubank, C6 Bank, Shipay) que **não possuem integração implementada** — são apenas "toa" (placeholder). Quando o lojista seleciona um desses, recebe erro de "em desenvolvimento". Isso confunde o usuário.

Sobre a **Neon**: a Neon não possui uma API pública de cobranças PIX como gateway de pagamento. Ela é um banco digital mas não oferece SDK/API aberta para gerar QR codes PIX programaticamente como os gateways listados. Portanto, não é possível adicioná-la.

## O que será feito

1. **Remover** todos os provedores que não têm integração real (os bancos)
2. **Manter** apenas os 5 que funcionam: Mercado Pago, PagSeguro, EFI, Asaas e OpenPix
3. Limpar também o `PROVIDER_NAMES` das edge functions que listam os bancos sem suporte

## Seção técnica

```text
Arquivo 1: src/components/dashboard/StoreProfileTab.tsx (linhas 674-690)
  - Remover SelectItems: inter, sicredi, bradesco, itau, bb,
    santander, caixa, nubank, c6bank, shipay
  - Manter apenas: mercadopago, pagseguro, efi, asaas, openpix

Arquivo 2: supabase/functions/verify-pix-payment/index.ts (linhas 11-27)
  - Remover do PROVIDER_NAMES os bancos sem integração:
    inter, sicredi, bradesco, itau, bb, santander, caixa,
    nubank, c6bank, shipay

Arquivo 3: supabase/functions/check-pix-status/index.ts (linhas 11-13)
  - Mesma limpeza do PROVIDER_NAMES
```

Os 5 gateways que ficam são os únicos com API pública de cobranças PIX e que já estão 100% implementados nas edge functions.

