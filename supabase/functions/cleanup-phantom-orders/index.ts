import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    // Find orders older than 5 min that have zero items
    const { data: candidates, error: fetchErr } = await supabase
      .from("orders")
      .select("id, order_items(id)")
      .lt("created_at", fiveMinAgo);

    if (fetchErr) throw fetchErr;

    const phantoms = (candidates || []).filter(
      (o: any) => !o.order_items || o.order_items.length === 0
    );

    if (phantoms.length === 0) {
      return new Response(JSON.stringify({ deleted: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ids = phantoms.map((o: any) => o.id);

    // Clean up related tables first
    for (const id of ids) {
      await supabase.from("fila_impressao").delete().eq("order_id", id);
      await supabase.from("deliveries").delete().eq("order_id", id);
    }

    const { error: delErr } = await supabase.from("orders").delete().in("id", ids);
    if (delErr) throw delErr;

    console.log(`[cleanup-phantom-orders] Deleted ${ids.length} phantom orders`);

    return new Response(JSON.stringify({ deleted: ids.length, ids }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[cleanup-phantom-orders] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
