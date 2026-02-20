

# Corrigir busca de CEP (ViaCEP) via proxy

## Problema
As chamadas ao ViaCEP sao feitas diretamente do navegador do cliente, o que causa erros de CORS em alguns ambientes/dispositivos. O sistema ja tem um fallback (inferir estado pelo prefixo do CEP), mas o ideal e que o preenchimento automatico funcione sempre.

## Solucao
Criar uma funcao backend (edge function) que atua como proxy para o ViaCEP, eliminando o problema de CORS. Depois, atualizar os 3 pontos do codigo que chamam o ViaCEP diretamente.

## Etapas

### 1. Criar edge function `viacep-proxy`
- Recebe o CEP no corpo da requisicao (POST)
- Limpa e valida o formato (8 digitos)
- Faz a chamada ao ViaCEP do lado do servidor (sem CORS)
- Retorna os dados do endereco ou erro apropriado

### 2. Atualizar `src/pages/UnitPage.tsx`
- Trocar a chamada direta `fetch("https://viacep.com.br/...")` por `supabase.functions.invoke("viacep-proxy", { body: { cep } })`
- Manter o fallback existente (inferir estado pelo CEP) caso a edge function tambem falhe

### 3. Atualizar `src/components/dashboard/StoreProfileTab.tsx`
- Mesma alteracao: trocar fetch direto pelo invoke da edge function

### 4. Atualizar `src/components/dashboard/OnboardingWizard.tsx`
- Mesma alteracao: trocar fetch direto pelo invoke da edge function

## Impacto
- Nenhuma alteracao no banco de dados
- Nenhuma nova dependencia
- O fallback por prefixo de CEP continua funcionando como rede de seguranca
- A busca de CEP passara a funcionar de forma confiavel em qualquer navegador/dispositivo

