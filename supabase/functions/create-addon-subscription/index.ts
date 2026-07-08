import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ADDON_PRICE = 50.0;
const BILLING_DAY = 4;

/** Next date for day-4 billing that is strictly in the future. */
function nextBillingDate(afterISO: string | null): Date {
  const now = new Date();
  const base = afterISO ? new Date(afterISO) : now;
  // Start from the later of "now" and current period end
  const start = base > now ? base : now;
  const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), BILLING_DAY, 12, 0, 0));
  if (d <= now) {
    d.setUTCMonth(d.getUTCMonth() + 1);
  }
  return d;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;
    const userEmail = (claimsData.claims.email as string) || "";

    const { org_id, addon_key = "ai_bot", card_token_id } = await req.json();
    if (!org_id || !card_token_id) {
      return new Response(JSON.stringify({ error: "Missing org_id or card_token_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (addon_key !== "ai_bot") {
      return new Response(JSON.stringify({ error: "Unsupported addon" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Validate ownership + flag
    const { data: org } = await admin
      .from("organizations")
      .select("id, name, user_id, requires_ai_bot_addon")
      .eq("id", org_id)
      .maybeSingle();

    if (!org || (org as any).user_id !== userId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!(org as any).requires_ai_bot_addon) {
      return new Response(JSON.stringify({ error: "Addon not enabled for this organization" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Current addon row (may not exist yet)
    const { data: existing } = await admin
      .from("org_addons")
      .select("id, current_period_end, mp_preapproval_id")
      .eq("organization_id", org_id)
      .eq("addon_key", "ai_bot")
      .maybeSingle();

    const startDate = nextBillingDate((existing as any)?.current_period_end ?? null);

    const accessToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
    if (!accessToken) {
      return new Response(JSON.stringify({ error: "Payment gateway not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cancel previous preapproval, if any (safe, best-effort)
    const oldPreapproval = (existing as any)?.mp_preapproval_id;
    if (oldPreapproval) {
      try {
        await fetch(`https://api.mercadopago.com/preapproval/${oldPreapproval}`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: "cancelled" }),
        });
      } catch (e) {
        console.log("[create-addon-subscription] Failed to cancel old preapproval:", e);
      }
    }

    const backUrl = `https://trendfood.lovable.app/dashboard?tab=aibot&addon_return=true`;

    const body = {
      reason: `Robô WhatsApp — ${(org as any).name}`,
      external_reference: `addon:ai_bot:${org_id}`,
      payer_email: userEmail,
      card_token_id,
      status: "authorized",
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: ADDON_PRICE,
        currency_id: "BRL",
        start_date: startDate.toISOString(),
      },
      back_url: backUrl,
    };

    console.log("[create-addon-subscription] Creating preapproval:", JSON.stringify(body));

    const mpRes = await fetch("https://api.mercadopago.com/preapproval", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const mpData = await mpRes.json();
    if (!mpRes.ok) {
      console.error("[create-addon-subscription] MP error:", JSON.stringify(mpData));
      return new Response(
        JSON.stringify({
          error: "Failed to create subscription",
          status_detail: mpData.cause?.[0]?.code || mpData.message || "unknown_error",
          message: mpData.message || "Pagamento recusado",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Persist addon row (upsert)
    const nowIso = new Date().toISOString();
    const periodEnd = (existing as any)?.current_period_end && new Date((existing as any).current_period_end) > new Date()
      ? (existing as any).current_period_end
      : startDate.toISOString();

    await admin.from("org_addons").upsert(
      {
        organization_id: org_id,
        addon_key: "ai_bot",
        status: "active",
        price_monthly: ADDON_PRICE,
        billing_day: BILLING_DAY,
        current_period_end: periodEnd,
        mp_preapproval_id: mpData.id,
        updated_at: nowIso,
      },
      { onConflict: "organization_id,addon_key" },
    );

    await admin.from("activation_logs").insert({
      organization_id: org_id,
      org_name: (org as any).name || null,
      old_plan: null,
      new_plan: null,
      old_status: null,
      new_status: "active",
      source: "mercadopago-addon",
      notes: `Addon ai_bot preapproval ${mpData.id} authorized (start ${startDate.toISOString().slice(0, 10)})`,
    });

    return new Response(
      JSON.stringify({
        subscription_id: mpData.id,
        init_point: mpData.init_point,
        start_date: startDate.toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[create-addon-subscription] Error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});