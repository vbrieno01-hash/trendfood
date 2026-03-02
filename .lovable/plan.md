

## Plano: Melhorar busca de bairros próximos para cidades pequenas

### Problema identificado

Testei o fluxo e os cards **funcionam corretamente** — para o CEP 01001-000 (São Paulo) aparecem 4+ cards. Porém, para o CEP 11510-170 (Cubatão), o ViaCEP só retorna 1 resultado porque a busca usa o nome exato da rua, que é muito específica para cidades pequenas.

### Solução

Melhorar a lógica de busca no `viacep-proxy` e no `reverse-geocode` para tentar buscas mais amplas quando a primeira retornar poucos resultados.

### Alterações

**1. `supabase/functions/viacep-proxy/index.ts`**
- Se a busca pelo logradouro retornar ≤1 resultado, fazer uma segunda busca usando apenas a **primeira palavra** do nome da rua (ex: "Jaime" em vez de "Jaime João")
- Se ainda retornar ≤1, tentar buscar pelo **bairro** em vez da rua
- Isso garante que cidades pequenas também retornem candidatos de bairros vizinhos

**2. `supabase/functions/reverse-geocode/index.ts`**
- Mesma lógica: se ViaCEP retornar ≤1 resultado com a rua completa, tentar busca mais genérica
- Garantir que os candidatos apareçam imediatamente quando o GPS finalizar

**3. `src/pages/UnitPage.tsx`**
- Nenhuma mudança necessária — a UI já funciona corretamente, o problema é a quantidade de dados retornados pelo backend

### Lógica de fallback

```text
Busca 1: /{UF}/{cidade}/{rua completa sem prefixo}/json/
  → Se ≤1 resultado:
Busca 2: /{UF}/{cidade}/{primeira palavra da rua}/json/
  → Se ≤1 resultado:
Busca 3: /{UF}/{cidade}/{bairro}/json/
  → Usa o que retornar
```

