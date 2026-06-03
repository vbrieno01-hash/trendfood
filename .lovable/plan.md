## Problema

Ao abrir a aba **iFood Merchant API** no /admin, o componente `IFoodMerchantHomologTab` seleciona automaticamente a primeira loja conectada e dispara 4 chamadas (`get_merchant`, `get_status`, `get_opening_hours`, `list_interruptions`) para a edge function `ifood-merchant-api`. Se o `merchant_id` ainda não foi aprovado em produção pelo iFood (caso comum em homologação), a API responde **403 Forbidden** e o overlay de erro do Lovable captura a exceção interna do `supabase.functions.invoke`, mesmo a gente já tratando ela.

## Solução (apenas frontend, em `src/components/admin/IFoodMerchantHomologTab.tsx`)

1. **Remover o auto-load no mount**: tirar o `useEffect` que chama `loadAll()` sempre que `orgId` muda.
2. **Carregamento sob demanda**: o botão **"Recarregar"** continua existindo (renomear para **"Carregar dados da loja"** quando ainda não houve carga). O usuário decide quando chamar.
3. **Silenciar 403 explicitamente**: no `call()`, quando `error?.context?.status === 403` (ou message contém "Forbidden"), pular o `throw` e ir direto pro `setLoadError({ code: "Forbidden", message: ... })` — assim a exceção não escapa pro overlay do preview.
4. Manter o card amarelo de aviso ("iFood retornou Forbidden...") já existente.
5. Sem mudanças no backend / edge function / banco.

## Resultado

- Abrir a aba não dispara mais chamadas → sem 403 → sem overlay de erro.
- O admin clica em "Carregar dados" quando quiser inspecionar; se vier 403, aparece o aviso amarelo limpo.
