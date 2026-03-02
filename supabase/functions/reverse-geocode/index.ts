const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Map Brazilian state names to UF codes
const stateToUf: Record<string, string> = {
  'acre': 'AC', 'alagoas': 'AL', 'amapá': 'AP', 'amazonas': 'AM',
  'bahia': 'BA', 'ceará': 'CE', 'distrito federal': 'DF', 'espírito santo': 'ES',
  'goiás': 'GO', 'maranhão': 'MA', 'mato grosso': 'MT', 'mato grosso do sul': 'MS',
  'minas gerais': 'MG', 'pará': 'PA', 'paraíba': 'PB', 'paraná': 'PR',
  'pernambuco': 'PE', 'piauí': 'PI', 'rio de janeiro': 'RJ', 'rio grande do norte': 'RN',
  'rio grande do sul': 'RS', 'rondônia': 'RO', 'roraima': 'RR', 'santa catarina': 'SC',
  'são paulo': 'SP', 'sergipe': 'SE', 'tocantins': 'TO',
};

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

    const res = await fetch(url, {
      headers: { 'User-Agent': 'TrendFood/1.0' },
    });

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

    // Try ViaCEP for precise CEP + bairro + multiple candidates
    let finalCep = cepNominatim;
    let finalNeighborhood = neighborhood;
    let candidates: Array<{ cep: string; street: string; neighborhood: string; label: string }> = [];

    if (uf && city && street && street.length >= 3) {
      try {
        const viaUrl = `https://viacep.com.br/ws/${encodeURIComponent(uf)}/${encodeURIComponent(city)}/${encodeURIComponent(street)}/json/`;
        const viaRes = await fetch(viaUrl);
        const viaData = await viaRes.json();
        if (Array.isArray(viaData) && viaData.length > 0 && viaData[0].cep) {
          finalCep = viaData[0].cep.replace(/\D/g, '');
          finalNeighborhood = viaData[0].bairro || finalNeighborhood;

          // Build candidates list (up to 5)
          candidates = viaData.slice(0, 5).map((v: any) => {
            const cepClean = (v.cep || '').replace(/\D/g, '');
            const cepFmt = cepClean.length === 8 ? `${cepClean.slice(0,5)}-${cepClean.slice(5)}` : cepClean;
            return {
              cep: cepClean,
              street: v.logradouro || street,
              neighborhood: v.bairro || neighborhood,
              label: `${v.logradouro || street}, ${v.bairro || neighborhood} - ${cepFmt}`,
            };
          });
        }
      } catch {
        // ViaCEP failed, keep Nominatim values
      }
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
