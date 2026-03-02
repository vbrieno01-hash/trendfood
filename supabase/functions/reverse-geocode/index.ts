const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const stateToUf: Record<string, string> = {
  'acre': 'AC', 'alagoas': 'AL', 'amapá': 'AP', 'amazonas': 'AM',
  'bahia': 'BA', 'ceará': 'CE', 'distrito federal': 'DF', 'espírito santo': 'ES',
  'goiás': 'GO', 'maranhão': 'MA', 'mato grosso': 'MT', 'mato grosso do sul': 'MS',
  'minas gerais': 'MG', 'pará': 'PA', 'paraíba': 'PB', 'paraná': 'PR',
  'pernambuco': 'PE', 'piauí': 'PI', 'rio de janeiro': 'RJ', 'rio grande do norte': 'RN',
  'rio grande do sul': 'RS', 'rondônia': 'RO', 'roraima': 'RR', 'santa catarina': 'SC',
  'são paulo': 'SP', 'sergipe': 'SE', 'tocantins': 'TO',
};

function stripStreetPrefix(street: string): string {
  return street.replace(/^(Rua|Avenida|Av\.|Travessa|Trav\.|Alameda|Al\.|Praça|Pc\.|Rodovia|Rod\.|Estrada|Est\.)\s+/i, '').trim();
}

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

function buildCandidates(results: any[], fallbackStreet: string, fallbackNeighborhood: string) {
  const candidates: Array<{ cep: string; street: string; neighborhood: string; label: string }> = [];
  const seen = new Set<string>();
  for (const v of results) {
    const cepClean = (v.cep || '').replace(/\D/g, '');
    const key = `${cepClean}-${v.bairro}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const cepFmt = cepClean.length === 8 ? `${cepClean.slice(0, 5)}-${cepClean.slice(5)}` : cepClean;
    candidates.push({
      cep: cepClean,
      street: v.logradouro || fallbackStreet,
      neighborhood: v.bairro || fallbackNeighborhood,
      label: `${v.logradouro || fallbackStreet}, ${v.bairro || fallbackNeighborhood} - ${cepFmt}`,
    });
    if (candidates.length >= 5) break;
  }
  return candidates;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lat, lon } = await req.json();

    if (!lat || !lon) {
      return new Response(JSON.stringify({ error: 'Coordenadas inválidas.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1&accept-language=pt-BR`;
    const res = await fetch(url, { headers: { 'User-Agent': 'TrendFood/1.0' } });

    if (!res.ok) {
      return new Response(JSON.stringify({ error: 'Erro ao buscar endereço.' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await res.json();
    const addr = data.address || {};

    const stateName = (addr.state || '').toLowerCase();
    const uf = stateToUf[stateName] || addr.state_code?.toUpperCase() || addr['ISO3166-2-lvl4']?.replace('BR-', '') || '';

    const street = addr.road || addr.pedestrian || '';
    const neighborhood = addr.suburb || addr.neighbourhood || addr.city_district || '';
    const city = addr.city || addr.town || addr.village || addr.municipality || '';
    const cepNominatim = (addr.postcode || '').replace(/\D/g, '');

    let finalCep = cepNominatim;
    let finalNeighborhood = neighborhood;
    let candidates: Array<{ cep: string; street: string; neighborhood: string; label: string }> = [];

    if (uf && city && street && street.length >= 3) {
      const stripped = stripStreetPrefix(street);

      // Search 1: full street (without prefix)
      let results: any[] = [];
      if (stripped.length >= 3) {
        results = await viacepSearch(uf, city, stripped);
      }

      // Search 2: first word only
      if (results.length <= 1 && stripped.length >= 3) {
        const firstWord = stripped.split(' ')[0];
        if (firstWord.length >= 3 && firstWord !== stripped) {
          results = await viacepSearch(uf, city, firstWord);
        }
      }

      // Search 3: ALWAYS search by neighborhood and merge
      if (neighborhood.length >= 3) {
        let nResults = await viacepSearch(uf, city, neighborhood);
        // If full neighborhood name returns nothing, try first word
        if (nResults.length === 0) {
          const firstWordN = neighborhood.split(' ')[0];
          if (firstWordN.length >= 3 && firstWordN !== neighborhood) {
            nResults = await viacepSearch(uf, city, firstWordN);
          }
        }
        results = [...results, ...nResults];
      }

      if (results.length > 0 && results[0].cep) {
        finalCep = results[0].cep.replace(/\D/g, '');
        finalNeighborhood = results[0].bairro || finalNeighborhood;
      }

      candidates = buildCandidates(results, street, neighborhood);
    }

    const result = {
      street,
      neighborhood: finalNeighborhood,
      city,
      state: uf,
      cep: finalCep,
      candidates,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Erro interno ao geocodificar.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
