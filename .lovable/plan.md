
# Corrigir domínio antigo nos QR Codes das mesas

## Problema
Os QR Codes das mesas estão sendo gerados com o domínio antigo `snack-hive.lovable.app` em vez do domínio correto `trendfood.lovable.app`.

## Correção
Alterar a constante `PRODUCTION_URL` no arquivo `src/components/dashboard/TablesTab.tsx` (linha 37):

- **De:** `https://snack-hive.lovable.app`
- **Para:** `https://trendfood.lovable.app`

Isso corrige tanto os QR Codes gerados quanto os links copiados pelo botão "Copiar link".
