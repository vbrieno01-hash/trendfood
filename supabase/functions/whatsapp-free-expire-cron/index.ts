import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FREE_TABLE = "whatsapp_free_instances";

function getFreeCfg() {
  const serverUrl = (Deno.env.get("UAZAPI_FREE_SERVER_URL") || "https://free.uazapi.com").replace(/\/$/, "");
  const adminToken = Deno.env.get("UAZAPI_FREE_ADMIN_TOKEN") || null;
  return { serverUrl, adminToken };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { serverUrl, adminToken } = getFreeCfg();

    const nowIso = new Date().toISOString();
    const { data: expired } = await supabase.from(FREE_TABLE)
      .select("id, organization_id, instance_token, instance_name, trial_expires_at")
      .eq("trial_expired", false)
      .not("trial_expires_at", "is", null)
      .lte("trial_expires_at", nowIso)
      .limit(200);

    const results: Array<{ org: string; ok: boolean; err?: string }> = [];
    for (const row of expired ?? []) {
      const r: { org: string; ok: boolean; err?: string } = { org: (row as any).organization_id, ok: true };
      const token = (row as any).instance_token;
      if (token) {
        try {
          await fetch(`${serverUrl}/instance/disconnect`, {
            method: "POST",
            headers: { "Content-Type": "application/json", token },
            body: JSON.stringify({}),
          });
        } catch (e) { r.ok = false; r.err = `disconnect: ${(e as Error).message}`; }
        if (adminToken) {
          try {
            await fetch(`${serverUrl}/instance/delete`, { method: "DELETE", headers: { admintoken: adminToken, token } });
          } catch (e) { r.err = (r.err ? r.err + " | " : "") + `delete: ${(e as Error).message}`; }
        }
      }

      await supabase.from(FREE_TABLE).update({
        trial_expired: true,
        status: "expired",
        instance_token: null,
        phone_connected: null,
        connected_at: null,
        webhook_configured: false,
      }).eq("id", (row as any).id);

      // Notifica admin no Telegram (best-effort)
      try {
        const { data: org } = await supabase.from("organizations").select("id, name, slug, whatsapp").eq("id", (row as any).organization_id).maybeSingle();
        await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/admin-telegram-notify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event_type: "critical_error",
            payload: {
              kind: "wa_free_trial_expired",
              org_id: (row as any).organization_id,
              org_name: (org as any)?.name,
              org_slug: (org as any)?.slug,
              whatsapp: (org as any)?.whatsapp,
            },
          }),
        });
      } catch {}

      results.push(r);
    }

    return new Response(JSON.stringify({ ok: true, processed: results.length, results }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("whatsapp-free-expire-cron err:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});