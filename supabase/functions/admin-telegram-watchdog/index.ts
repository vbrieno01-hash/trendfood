import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** Send a notification only if not already sent today (or this week) */
async function notifyOnce(
  supabase: ReturnType<typeof createClient>,
  eventKey: string,
  eventType: string,
  payload: Record<string, unknown>,
): Promise<boolean> {
  // Check dedupe
  const { data: existing } = await supabase
    .from("admin_telegram_dedupe")
    .select("event_key")
    .eq("event_key", eventKey)
    .maybeSingle();

  if (existing) return false;

  // Insert dedupe record (race-safe via PK)
  const { error: dupErr } = await supabase
    .from("admin_telegram_dedupe")
    .insert({ event_key: eventKey });

  if (dupErr) {
    // Likely race condition — someone else inserted; skip
    return false;
  }

  // Fire notification
  try {
    await supabase.functions.invoke("admin-telegram-notify", {
      body: { event_type: eventType, payload },
    });
    return true;
  } catch (err) {
    console.error("[watchdog] notify error:", err);
    return false;
  }
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function weekKey(): string {
  // ISO year-week
  const d = new Date();
  const onejan = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${week}`;
}

/** Sweep 1: trials expiring in D-3, D-1, D-0 */
async function sweepTrials(supabase: ReturnType<typeof createClient>) {
  const now = new Date();
  const today = todayKey();

  // Look up orgs with active trial expiring within 0..3 days
  const in4days = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000).toISOString();
  const { data: orgs } = await supabase
    .from("organizations")
    .select("id, name, slug, trial_ends_at, subscription_plan, subscription_status, whatsapp, created_at")
    .lte("trial_ends_at", in4days)
    .gte("trial_ends_at", now.toISOString())
    .neq("subscription_status", "active");

  if (!orgs?.length) return { trials: 0 };

  let sent = 0;
  for (const org of orgs as any[]) {
    const expiresAt = new Date(org.trial_ends_at);
    const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

    // Only notify on D-3, D-1, D-0
    if (![0, 1, 3].includes(daysLeft)) continue;

    // Count orders during trial
    const { count: orderCount } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", org.id)
      .gte("created_at", org.created_at);

    const eventKey = `trial_expiring|${org.id}|d${daysLeft}|${today}`;
    const ok = await notifyOnce(supabase, eventKey, "trial_expiring", {
      org_id: org.id,
      org_name: org.name,
      slug: org.slug,
      days_left: daysLeft,
      order_count: orderCount ?? 0,
      whatsapp: org.whatsapp,
      plan: org.subscription_plan,
    });
    if (ok) sent++;
  }

  return { trials: sent };
}

/** Sweep 2: cold stores (Pro/Enterprise without orders for 7+ days) */
async function sweepColdStores(supabase: ReturnType<typeof createClient>) {
  const week = weekKey();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: orgs } = await supabase
    .from("organizations")
    .select("id, name, slug, whatsapp, subscription_plan, subscription_status, billing_cycle")
    .in("subscription_plan", ["pro", "enterprise"])
    .eq("subscription_status", "active");

  if (!orgs?.length) return { cold: 0 };

  let sent = 0;
  for (const org of orgs as any[]) {
    // Find most recent order
    const { data: lastOrder } = await supabase
      .from("orders")
      .select("created_at")
      .eq("organization_id", org.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!lastOrder) continue; // never had orders, skip
    if (lastOrder.created_at >= sevenDaysAgo) continue; // recent, skip

    const eventKey = `cold_store|${org.id}|${week}`;
    const ok = await notifyOnce(supabase, eventKey, "cold_store", {
      org_id: org.id,
      org_name: org.name,
      slug: org.slug,
      whatsapp: org.whatsapp,
      plan: org.subscription_plan,
      billing_cycle: org.billing_cycle,
      last_order_at: lastOrder.created_at,
    });
    if (ok) sent++;
  }

  return { cold: sent };
}

/** Sweep 3: hot leads (Free plan with >30 orders today) */
async function sweepHotLeads(supabase: ReturnType<typeof createClient>) {
  const today = todayKey();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  // Limiar configurável via platform_config.hot_lead_min_orders (padrão 10)
  let minOrders = 10;
  try {
    const { data: cfg } = await supabase
      .from("platform_config")
      .select("hot_lead_min_orders")
      .limit(1)
      .maybeSingle();
    const v = (cfg as any)?.hot_lead_min_orders;
    if (typeof v === "number" && v > 0) minOrders = v;
  } catch { /* fallback default */ }

  const { data: orgs } = await supabase
    .from("organizations")
    .select("id, name, slug, subscription_plan, whatsapp")
    .eq("subscription_plan", "free");

  if (!orgs?.length) return { hot: 0 };

  let sent = 0;
  for (const org of orgs as any[]) {
    const { count } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", org.id)
      .gte("created_at", startOfDay.toISOString());

    if ((count ?? 0) < minOrders) continue;

    const eventKey = `hot_lead|${org.id}|${today}`;
    const ok = await notifyOnce(supabase, eventKey, "hot_lead", {
      org_id: org.id,
      org_name: org.name,
      slug: org.slug,
      plan: org.subscription_plan,
      orders_today: count,
      whatsapp: org.whatsapp,
    });
    if (ok) sent++;
  }

  return { hot: sent };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    let mode = "morning";
    try {
      const body = await req.json();
      mode = body?.mode || "morning";
    } catch {
      // no body, default
    }

    const result: Record<string, unknown> = { mode };

    if (mode === "morning" || mode === "all") {
      Object.assign(result, await sweepTrials(supabase));
      Object.assign(result, await sweepColdStores(supabase));
    }
    if (mode === "business" || mode === "all") {
      Object.assign(result, await sweepHotLeads(supabase));
    }

    console.log("[watchdog] result:", JSON.stringify(result));

    return new Response(JSON.stringify({ ok: true, ...result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[watchdog] error:", e);
    return new Response(JSON.stringify({ ok: false, error: e?.message || String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});