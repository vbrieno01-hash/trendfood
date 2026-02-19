

# Adicionar 15 opcoes de gateways PIX

## Resumo

Expandir o dropdown de provedores de gateway PIX de 2 opcoes (Mercado Pago e PagSeguro) para 15 opcoes, cobrindo os principais bancos e fintechs do Brasil. Os gateways que ja tem integracao real (Mercado Pago e PagSeguro) continuarao funcionando normalmente. Os demais gateways serao adicionados no dropdown e teremos a estrutura preparada nas edge functions para receber novas integracoes no futuro.

## Gateways que serao adicionados

| Provedor | Valor interno | Integracao real |
|----------|--------------|-----------------|
| Mercado Pago | mercadopago | Sim (ja existe) |
| PagSeguro / PagBank | pagseguro | Sim (ja existe) |
| EFI (Gerencianet) | efi | Sim (API PIX bem documentada) |
| Asaas | asaas | Sim (API simples) |
| Inter (Banco Inter) | inter | Preparado |
| Sicredi | sicredi | Preparado |
| Bradesco | bradesco | Preparado |
| Itau | itau | Preparado |
| Banco do Brasil | bb | Preparado |
| Santander | santander | Preparado |
| Caixa | caixa | Preparado |
| Nubank (Precash) | nubank | Preparado |
| C6 Bank | c6bank | Preparado |
| Shipay | shipay | Preparado |
| OpenPix (Woovi) | openpix | Sim (API simples) |

"Preparado" significa que o provedor aparece no dropdown, o token e salvo, mas na edge function retorna um erro amigavel dizendo que a integracao com aquele provedor ainda esta em desenvolvimento.

## Detalhes tecnicos

### 1. StoreProfileTab.tsx

- Substituir os 2 SelectItems por uma lista de 15 provedores com nome amigavel
- Atualizar o placeholder do campo de token para mostrar instrucoes baseadas no provedor selecionado
- Atualizar as instrucoes/links de onde pegar o token para os provedores que ja tem integracao (Mercado Pago, PagSeguro, EFI, Asaas, OpenPix)
- Para os demais, mostrar uma mensagem generica "Use o token/credencial fornecido pelo seu banco"

### 2. Edge Function - verify-pix-payment

- Adicionar integracao real para EFI (Gerencianet), Asaas e OpenPix (Woovi)
- Para os demais provedores, retornar erro 400 com mensagem: "Integracao com [provedor] em desenvolvimento. Use Mercado Pago, PagSeguro, EFI, Asaas ou OpenPix."

### 3. Edge Function - check-pix-status

- Adicionar verificacao de status para EFI, Asaas e OpenPix
- Para os demais, retornar erro amigavel

### Arquivos modificados

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/dashboard/StoreProfileTab.tsx` | Expandir dropdown para 15 provedores, ajustar placeholders e instrucoes |
| `supabase/functions/verify-pix-payment/index.ts` | Adicionar integracao EFI, Asaas, OpenPix + fallback para provedores em desenvolvimento |
| `supabase/functions/check-pix-status/index.ts` | Adicionar verificacao de status para EFI, Asaas, OpenPix |

