import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function getRenewalDays(billing: string): number {
  if (billing === "quarterly") return 93;
  if (billing === "annual") return 370;
  return 30;
}

async function activateOrg(
  supabase: ReturnType<typeof createClient>,
  pending: Record<string, any>,
  mpData: Record<string, any>,
  source: string,
) {
  const { organization_id, plan, billing_cycle, promo_applied, payment_id } = pending;

  // ── Addon flow: NEVER overwrite subscription_plan/status ──
  // Addon rows are stored with plan like "addon:campaign_250".
  // They must be handled by their own RPC, not as a plan upgrade.
  if (typeof plan === "string" && plan.startsWith("addon:")) {
    const addonKey = plan.slice("addon:".length);

    const { data: org } = await supabase
      .from("organizations")
      .select("id, name")
      .eq("id", organization_id)
      .single();

    if (addonKey === "campaign_250") {
      try {
        await supabase.rpc("apply_campaign_credits_purchase", {
          _org_id: organization_id,
          _credits: 250,
          _days: 30,
          _payment_id: String(payment_id),
        });
      } catch (rpcErr) {
        console.error("[reconcile-pending-pix] addon RPC error:", rpcErr);
      }

      await supabase.from("activation_logs").insert({
        organization_id,
        org_name: (org as any)?.name || null,
        old_plan: null,
        new_plan: null,
        old_status: null,
        new_status: null,
        source,
        notes: `Addon campaign_250 credited via reconciliation (payment ${payment_id})`,
      });
    } else {
      console.warn("[reconcile-pending-pix] unknown addon key, skipping plan mutation:", addonKey);
    }

    await supabase
      .from("pending_subscription_payments")
      .update({ status: "approved", resolved_at: new Date().toISOString() })
      .eq("payment_id", String(payment_id));
    return;
  }

  const renewalDays = getRenewalDays(billing_cycle);

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, subscription_plan")
    .eq("id", organization_id)
    .single();

  const updateData: Record<string, unknown> = {
    subscription_plan: plan,
    subscription_status: "active",
    billing_cycle,
    trial_ends_at: new Date(Date.now() + renewalDays * 24 * 60 * 60 * 1000).toISOString(),
  };
  if (promo_applied) updateData.used_first_month_promo = true;

  await supabase.from("organizations").update(updateData).eq("id", organization_id);

  await supabase.from("activation_logs").insert({
    organization_id,
    org_name: (org as any)?.name || null,
    old_plan: (org as any)?.subscription_plan || null,
    new_plan: plan,
    old_status: null,
    new_status: "active",
    source,
    notes: `PIX payment ${payment_id} approved via reconciliation (${billing_cycle})${promo_applied ? " (promo 50% off)" : ""}`,
  });

  await supabase
    .from("pending_subscription_payments")
    .update({ status: "approved", resolved_at: new Date().toISOString() })
    .eq("payment_id", String(payment_id));

  // Best-effort admin notification
  try {
    await supabase.functions.invoke("admin-telegram-notify", {
      body: {
        event_type: "payment_confirmed",
        payload: {
          org_id: organization_id,
          org_name: (org as any)?.name || null,
          plan,
          billing_cycle,
          amount: mpData.transaction_amount || null,
          payment_method: "pix",
          source: "reconcile",
        },
      },
    });
  } catch (_) { /* non-blocking */ }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const accessToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
    if (!accessToken) {
      return new Response(JSON.stringify({ error: "MP not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let specificPaymentId: string | null = null;
    try {
      const body = await req.json();
      if (body?.payment_id) specificPaymentId = String(body.payment_id);
    } catch (_) { /* no body, run cron mode */ }

    let query = supabase
      .from("pending_subscription_payments")
      .select("*")
      .eq("status", "pending");

    if (specificPaymentId) {
      query = query.eq("payment_id", specificPaymentId);
    } else {
      query = query.gt("created_at", new Date(Date.now() - 36 * 60 * 1000).toISOString());
    }

    const { data: pendings, error: fetchErr } = await query;
    if (fetchErr) {
      console.error("[reconcile-pending-pix] fetch error:", fetchErr);
      return new Response(JSON.stringify({ error: "Fetch failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: Array<Record<string, unknown>> = [];

    for (const pending of (pendings || []) as any[]) {
      try {
        const mpRes = await fetch(
          `https://api.mercadopago.com/v1/payments/${pending.payment_id}`,
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );
        const mpData = await mpRes.json();
        if (!mpRes.ok) {
          console.error("[reconcile-pending-pix] MP error for", pending.payment_id, mpData);
          results.push({ payment_id: pending.payment_id, error: "mp_fetch_failed" });
          continue;
        }

        if (mpData.status === "approved") {
          await activateOrg(supabase, pending, mpData, "mercadopago_pix_reconcile");
          results.push({ payment_id: pending.payment_id, activated: true });
        } else if (
          mpData.status === "rejected" ||
          mpData.status === "cancelled" ||
          mpData.status === "refunded"
        ) {
          await supabase
            .from("pending_subscription_payments")
            .update({ status: "failed", resolved_at: new Date().toISOString() })
            .eq("payment_id", String(pending.payment_id));
          results.push({ payment_id: pending.payment_id, status: mpData.status });
        } else if (new Date(pending.expires_at).getTime() < Date.now()) {
          await supabase
            .from("pending_subscription_payments")
            .update({ status: "expired", resolved_at: new Date().toISOString() })
            .eq("payment_id", String(pending.payment_id));
          results.push({ payment_id: pending.payment_id, status: "expired" });
        } else {
          results.push({ payment_id: pending.payment_id, status: mpData.status });
        }
      } catch (err) {
        console.error("[reconcile-pending-pix] item error:", err);
        results.push({ payment_id: pending.payment_id, error: String(err) });
      }
    }

    return new Response(JSON.stringify({ checked: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[reconcile-pending-pix] error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});