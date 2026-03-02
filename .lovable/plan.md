

## Problema

A edge function `reverse-geocode` usa o Nominatim para geocodificação reversa. O Nominatim retorna a **rua** corretamente, mas o **CEP** e **bairro** frequentemente são imprecisos para endereços brasileiros (postcode genérico da região, suburb/neighbourhood incorreto).

## Solução

Após obter rua, cidade e estado do Nominatim, fazer uma segunda chamada ao **ViaCEP** para buscar o CEP e bairro corretos baseados no logradouro. A API de busca do ViaCEP aceita `/{UF}/{cidade}/{logradouro}/json/` e retorna os dados precisos.

### Alteração em `supabase/functions/reverse-geocode/index.ts`

1. Após extrair `street`, `city` e `state` do Nominatim, chamar ViaCEP: `https://viacep.com.br/ws/{UF}/{cidade}/{logradouro}/json/`
2. Se ViaCEP retornar resultados, usar o `cep` e `bairro` do primeiro resultado
3. Manter os valores do Nominatim como fallback caso o ViaCEP falhe ou não encontre

```text
Fluxo atualizado:
GPS coords → Nominatim (rua, cidade, estado) → ViaCEP (CEP + bairro precisos) → resposta
```

### Detalhes técnicos

- A busca do ViaCEP por endereço exige no mínimo 3 caracteres no logradouro
- O estado precisa estar no formato UF (2 letras) -- já temos o mapeamento
- Se o ViaCEP não encontrar ou falhar, mantemos os dados originais do Nominatim

