
## Diagnóstico

Preciso verificar **agora mesmo** no banco como está a configuração do "Rei do Burger" e cruzar com a hora atual em Brasília pra ter certeza se o bug ainda existe ou se já foi resolvido.

Plano:
1. Consultar `organizations` filtrando pelo nome "Rei do Burger" → pegar `business_hours` + `force_open`
2. Conferir hora atual em São Paulo (`SELECT now() AT TIME ZONE 'America/Sao_Paulo'`)
3. Simular o que `getStoreStatus` deveria retornar agora
4. Se ainda estiver bugado, investigar onde

## Hipóteses

**A.** A correção do timezone funcionou, mas o lojista deixou `force_open = true` (toggle "Forçar abertura" ligado) → loja aparece aberta mesmo com dia fechado. Esse comportamento é **by design**.

**B.** A storefront pública (`UnitPage`) não revalida `business_hours` em tempo real — usa cache. O cliente que abriu a página antes da meia-noite continua vendo "aberta" mesmo depois de virar pra segunda.

**C.** O `useOrganization` no `UnitPage` não inclui `business_hours` no SELECT (já vimos esse padrão de bug em `useAuth` segundo a memory `auth-persistence-config`).

**D.** Existe outro lugar calculando status de forma independente.

## Próximo passo (precisa sair do read-only)

Como estou em modo plano (read-only), não posso executar SQL nem ler edge functions. Aprovando o plano, eu:

1. **Consulto o banco** e mostro pra você exatamente:
   - Que dias estão configurados como abertos no Rei do Burger
   - Se `force_open` está ligado
   - Hora real em Brasília agora
2. **Verifico o SELECT do `useOrganization`** (e do storefront público) pra garantir que `business_hours` e `force_open` estão sendo carregados
3. **Reproduzo o cálculo** do `getStoreStatus` com os dados reais
4. Se achar o bug, **corrijo na hora** (provavelmente vai ser uma das hipóteses B ou C — campo faltando no select, ou cache antigo)

Sem fazer essa investigação no banco, qualquer correção é chute. Aprova que eu investigo de verdade e mostro o resultado.
