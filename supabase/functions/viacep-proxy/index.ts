const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/** Strip common Brazilian street prefixes so ViaCEP search is broader */
function stripStreetPrefix(street: string): string {
  return street.replace(/^(Rua|Avenida|Av\.|Travessa|Trav\.|Alameda|Al\.|Praça|Pc\.|Rodovia|Rod\.|Estrada|Est\.)\s+/i, '').trim();
}

/** Search ViaCEP and return parsed array (empty on failure) */
async function viacepSearch(uf: string, city: string, term: string): Promise<any[]> {
  if (!term || term.length < 3) return [];
  try {
    const res = await fetch(
      `https://viacep.com.br/ws/${encodeURIComponent(uf)}/${encodeURIComponent(city)}/${encodeURIComponent(term)}/json/`
    );
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/** Deduplicate and build nearby array from ViaCEP results */
function buildNearby(results: any[], fallbackStreet: string): Array<{ cep: string; street: string; neighborhood: string; label: string }> {
  const nearby: Array<{ cep: string; street: string; neighborhood: string; label: string }> = [];
  const seen = new Set<string>();
  for (const item of results) {
    const key = `${item.cep}-${item.bairro}`;
    if (seen.has(key)) continue;
    seen.add(key);
    nearby.push({
      cep: item.cep,
      street: item.logradouro || fallbackStreet,
      neighborhood: item.bairro || '',
      label: `${item.logradouro || fallbackStreet}, ${item.bairro || 'S/N'} — ${item.cep}`,
    });
    if (nearby.length >= 5) break;
  }
  return nearby;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { cep } = await req.json();
    const cleaned = (cep || '').replace(/\D/g, '');

    if (cleaned.length !== 8) {
      return new Response(JSON.stringify({ error: 'CEP inválido. Digite 8 dígitos.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const res = await fetch(`https://viacep.com.br/ws/${cleaned}/json/`);
    const data = await res.json();

    if (data.erro) {
      return new Response(JSON.stringify({ error: 'CEP não encontrado.' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let nearby: Array<{ cep: string; street: string; neighborhood: string; label: string }> = [];

    if (data.uf && data.localidade) {
      const street = data.logradouro || '';
      const bairro = data.bairro || '';
      const stripped = stripStreetPrefix(street);

      // Search 1: full street name (without prefix)
      let results: any[] = [];
      if (stripped.length >= 3) {
        results = await viacepSearch(data.uf, data.localidade, stripped);
      }

      // Search 2: first word only (if ≤1 result)
      if (results.length <= 1 && stripped.length >= 3) {
        const firstWord = stripped.split(' ')[0];
        if (firstWord.length >= 3 && firstWord !== stripped) {
          results = await viacepSearch(data.uf, data.localidade, firstWord);
        }
      }

      // Search 3: ALWAYS search by neighborhood and merge
      if (bairro.length >= 3) {
        let bairroResults = await viacepSearch(data.uf, data.localidade, bairro);
        // If full neighborhood name returns nothing, try first word
        if (bairroResults.length === 0) {
          const firstWordBairro = bairro.split(' ')[0];
          if (firstWordBairro.length >= 3 && firstWordBairro !== bairro) {
            bairroResults = await viacepSearch(data.uf, data.localidade, firstWordBairro);
          }
        }
        results = [...results, ...bairroResults];
      }

      nearby = buildNearby(results, street);
    }

    return new Response(JSON.stringify({ ...data, nearby }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Erro ao buscar CEP.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
