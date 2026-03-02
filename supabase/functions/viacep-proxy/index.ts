const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

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

    // Try to fetch nearby addresses using ViaCEP search API
    let nearby: Array<{ cep: string; street: string; neighborhood: string; label: string }> = [];

    if (data.logradouro && data.uf && data.localidade) {
      try {
        // Extract first word of the street name for broader search
        const streetWords = data.logradouro.replace(/^(Rua|Avenida|Av\.|Travessa|Alameda|Praça)\s+/i, '').trim();
        const searchTerm = streetWords.split(' ').slice(0, 2).join(' ');

        if (searchTerm.length >= 3) {
          const searchRes = await fetch(
            `https://viacep.com.br/ws/${encodeURIComponent(data.uf)}/${encodeURIComponent(data.localidade)}/${encodeURIComponent(searchTerm)}/json/`
          );
          if (searchRes.ok) {
            const searchData = await searchRes.json();
            if (Array.isArray(searchData)) {
              // Filter unique neighborhoods and limit to 5
              const seen = new Set<string>();
              for (const item of searchData) {
                const key = `${item.cep}-${item.bairro}`;
                if (seen.has(key)) continue;
                seen.add(key);
                nearby.push({
                  cep: item.cep,
                  street: item.logradouro || data.logradouro,
                  neighborhood: item.bairro || '',
                  label: `${item.logradouro || data.logradouro}, ${item.bairro || 'S/N'} — ${item.cep}`,
                });
                if (nearby.length >= 5) break;
              }
            }
          }
        }
      } catch {
        // Ignore nearby search errors — main result is still valid
      }
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
