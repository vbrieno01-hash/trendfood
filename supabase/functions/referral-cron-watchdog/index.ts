import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const alerts: Array<{ type: string; detail: string }> = [];

    // 1) cron_health: release_pending_referral_bonuses rodou nas últimas 2h?
    const { data: health } = await supabase
      .from("cron_health")
      .select("last_success_at")
      .eq("job_name", "release_pending_referral_bonuses")
      .maybeSingle();

    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
    const lastSuccess = health?.last_success_at ? new Date(health.last_success_at).getTime() : 0;
    if (!health || lastSuccess < twoHoursAgo) {
      alerts.push({
        type: "release_cron_lagging",
        detail: health?.last_success_at
          ? `Última execução: ${health.last_success_at}`
          : "Nunca executou",
      });
    }

    // 2) Bônus pendentes vencidos há > 2h sem aplicação
    const { data: stuck, count } = await supabase
      .from("referral_bonuses")
      .select("id, referrer_org_id, released_at", { count: "exact" })
      .is("applied_at", null)
      .is("reverted_at", null)
      .not("released_at", "is", null)
      .lt("released_at", new Date(twoHoursAgo).toISOString())
      .limit(20);

    if (stuck && stuck.length > 0) {
      alerts.push({
        type: "stuck_referral_bonuses",
        detail: `${count ?? stuck.length} bônus venceram há mais de 2h sem aplicação`,
      });
    }

    if (alerts.length > 0) {
      try {
        await supabase.functions.invoke("admin-telegram-notify", {
          body: {
            event_type: "cron_lagging",
            payload: { job: "release_pending_referral_bonuses", alerts },
          },
        });
      } catch (e) {
        console.error("[referral-cron-watchdog] notify err:", e);
      }
    }

    return new Response(JSON.stringify({ ok: true, alerts }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[referral-cron-watchdog] error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});