import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function isBroken(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "HEAD" });
    // Treat 4xx as broken (400, 403, 404 typical when storage object missing)
    if (res.status >= 400 && res.status < 500) return true;
    return false;
  } catch (e) {
    console.warn("[cleanup-broken-banners] HEAD failed for", url, e);
    // Network error → don't assume broken to avoid false positives
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Optional: limpeza pontual de uma única loja (chamada da vitrine via onError)
    let targetOrgId: string | null = null;
    if (req.method === "POST") {
      try {
        const body = await req.json();
        if (body && typeof body.org_id === "string") {
          targetOrgId = body.org_id;
        }
      } catch {
        // empty body is ok
      }
    }

    let query = supabase
      .from("organizations")
      .select("id, name, banner_url")
      .not("banner_url", "is", null);

    if (targetOrgId) {
      query = query.eq("id", targetOrgId);
    }

    const { data: orgs, error: fetchErr } = await query;
    if (fetchErr) throw fetchErr;

    const cleaned: { id: string; name: string; url: string }[] = [];

    for (const org of orgs || []) {
      const url = (org as any).banner_url as string | null;
      if (!url) continue;
      const broken = await isBroken(url);
      if (broken) {
        const { error: updErr } = await supabase
          .from("organizations")
          .update({ banner_url: null })
          .eq("id", (org as any).id);
        if (updErr) {
          console.error("[cleanup-broken-banners] update failed", org, updErr);
        } else {
          cleaned.push({ id: (org as any).id, name: (org as any).name, url });
        }
      }
    }

    console.log(`[cleanup-broken-banners] Cleaned ${cleaned.length} broken banner(s)`, cleaned);

    return new Response(
      JSON.stringify({ checked: orgs?.length ?? 0, cleaned: cleaned.length, items: cleaned }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[cleanup-broken-banners] Error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
