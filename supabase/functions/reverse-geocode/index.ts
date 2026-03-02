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

    const result = {
      street: addr.road || addr.pedestrian || '',
      neighborhood: addr.suburb || addr.neighbourhood || addr.city_district || '',
      city: addr.city || addr.town || addr.village || addr.municipality || '',
      state: uf,
      cep: (addr.postcode || '').replace(/\D/g, ''),
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
