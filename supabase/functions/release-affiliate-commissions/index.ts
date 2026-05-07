import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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

    // Busca comissões pending com release_at <= now
    const { data: ready, error } = await supabase
      .from("affiliate_commissions")
      .select("id, affiliate_id")
      .eq("status", "pending")
      .lte("release_at", new Date().toISOString())
      .limit(500);

    if (error) throw error;
    if (!ready?.length) {
      return new Response(JSON.stringify({ ok: true, released: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ids = ready.map((r: any) => r.id);
    await supabase
      .from("affiliate_commissions")
      .update({ status: "released", released_at: new Date().toISOString() })
      .in("id", ids);

    // Notifica cada uma (best-effort)
    for (const r of ready as any[]) {
      try {
        await supabase.functions.invoke("notify-affiliate-telegram", {
          body: { event_type: "released", affiliate_id: r.affiliate_id, commission_id: r.id },
        });
      } catch (e) {
        console.error("[release-affiliate] notify err:", e);
      }
    }

    return new Response(JSON.stringify({ ok: true, released: ids.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[release-affiliate-commissions] erro:", err);
    return new Response(JSON.stringify({ error: String((err as Error).message || err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});