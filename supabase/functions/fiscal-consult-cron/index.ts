import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Busca notas travadas em processing entre 5min e 48h
    const now = Date.now();
    const upper = new Date(now - 5 * 60 * 1000).toISOString();
    const lower = new Date(now - 48 * 60 * 60 * 1000).toISOString();

    const { data: stuck, error } = await supabase
      .from("fiscal_invoices")
      .select("id, order_id, organization_id, status, created_at")
      .eq("status", "processing")
      .lt("created_at", upper)
      .gt("created_at", lower)
      .limit(50);

    if (error) {
      console.error("[fiscal-consult-cron] db_error", error.message);
      return new Response(JSON.stringify({ ok: false, error: error.message }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const invoices = stuck || [];
    console.log(`[fiscal-consult-cron] found ${invoices.length} stuck invoices`);

    const internal = Deno.env.get("FISCAL_INTERNAL_TOKEN");
    if (!internal) {
      return new Response(JSON.stringify({ ok: false, error: "FISCAL_INTERNAL_TOKEN not configured" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const results: any[] = [];

    // Processa sequencial para não sobrecarregar Focus (max 50 chamadas)
    for (const inv of invoices) {
      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/fiscal-consult-nfce`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-fiscal-token": internal,
          },
          body: JSON.stringify({ invoice_id: inv.id }),
        });
        const body = await res.json().catch(() => ({}));
        results.push({ invoice_id: inv.id, ok: body?.ok, status: body?.status });
      } catch (e) {
        results.push({ invoice_id: inv.id, ok: false, error: String((e as Error).message) });
      }
    }

    console.log(`[fiscal-consult-cron] processed ${results.length}`, results);
    return new Response(JSON.stringify({ ok: true, processed: results.length, results }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[fiscal-consult-cron] fatal", String((e as Error)?.message || e));
    return new Response(JSON.stringify({ ok: false, error: String((e as Error)?.message || e) }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});