

# Corrigir Calculo de Frete com Fallback Manual

## Problema Identificado

Quando o ViaCEP falha (como esta acontecendo no ambiente atual), os campos Cidade e Estado ficam vazios no state (`customerAddress`). Embora o campo Cidade mostre "Cubatao" na tela, isso e apenas o **placeholder** do input -- o valor real esta vazio.

Consequencia: o endereco enviado ao geocoder fica incompleto (ex: "Rua Jaime Joao Olcese, 100, Brasil"), e o Nominatim nao encontra o endereco, fazendo o frete cair no fallback "A combinar via WhatsApp".

## Solucao

### 1. Manter o CEP digitado no state mesmo quando ViaCEP falha (`src/pages/UnitPage.tsx`)

Atualmente, quando o ViaCEP falha, o `customerAddress.cep` pode estar preenchido (o usuario digitou), mas `city` e `state` ficam vazios. O `fullCustomerAddress` na condicao `customerAddress.cep && customerAddress.city` falha porque `city` esta vazio, e o branch de fallback monta o endereco sem cidade.

**Correcao**: Na funcao `fetchCustomerCep`, quando ViaCEP falha, manter o CEP digitado no state para que o usuario preencha cidade e estado manualmente. A condicao do `fullCustomerAddress` ja lida com ambos os cenarios corretamente -- o problema e que o branch de fallback (sem CEP+city) tambem precisa de city/state para funcionar.

### 2. Incluir cidade e estado no fallback do `fullCustomerAddress`

O branch de fallback (linha 118) ja inclui `customerAddress.city` e `customerAddress.state`, entao funciona **se o usuario preencher esses campos**. O problema e que o usuario pode nao perceber que precisa preencher (pois ve o placeholder).

**Correcao**: Tornar mais obvio que os campos precisam ser preenchidos:
- Quando ViaCEP falha, pre-selecionar o estado com base no CEP quando possivel (os 2 primeiros digitos do CEP identificam a regiao)
- Destacar visualmente os campos Cidade e Estado quando estiverem vazios apos falha do CEP

### 3. Mapeamento de CEP para Estado

Adicionar uma funcao auxiliar que extrai o estado a partir dos 2 primeiros digitos do CEP (tabela de faixas conhecida) e pre-preenche automaticamente o campo Estado quando o ViaCEP falha. Isso reduz fricao para o usuario.

Exemplos de faixas:
- 01-19 = SP
- 20-28 = RJ
- 29 = ES
- 30-39 = MG
- etc.

## Detalhes tecnicos

### Arquivo: `src/pages/UnitPage.tsx`

1. **Nova funcao `getStateFromCep`**: Mapeia os 2 primeiros digitos do CEP para o estado (UF). Funciona para todos os 27 estados brasileiros.

2. **`fetchCustomerCep` (apos falha)**: Quando ambas tentativas do ViaCEP falharem, chamar `getStateFromCep(cep)` e pre-preencher `customerAddress.state` com o resultado. Isso garante que o estado seja preenchido automaticamente mesmo sem ViaCEP.

3. **`fullCustomerAddress`**: O branch de fallback (quando `!customerAddress.cep || !customerAddress.city`) ja inclui city/state na montagem do endereco. Nenhuma mudanca necessaria aqui, pois o problema era que city/state estavam vazios -- agora state sera pre-preenchido e city sera mais evidente para preenchimento manual.

4. **UX dos campos**: Quando ViaCEP falha e os campos estao vazios, adicionar borda de destaque (amarela) nos campos Cidade e Estado para chamar atencao do usuario de que precisa preencher.

### Resumo de arquivos

| Arquivo | Acao |
|---------|------|
| `src/pages/UnitPage.tsx` | Adicionar `getStateFromCep`, pre-preencher estado no fallback, destaque visual em campos vazios |

