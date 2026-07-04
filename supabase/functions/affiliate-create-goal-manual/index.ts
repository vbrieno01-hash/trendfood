import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ADMIN_EMAIL = "brenojackson30@gmail.com";

function fmtBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  console.log("[affiliate-create-goal-manual] iniciada");
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { ok: false, code: "method_not_allowed" });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    if (!SUPABASE_URL || !SERVICE_KEY || !ANON_KEY) {
      return json(200, { ok: false, code: "env_missing", message: "Configuração do servidor incompleta" });
    }

    // ── Auth gate ──
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return json(401, { ok: false, code: "unauthorized", message: "Sessão inválida" });
    }
    const authClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await authClient.auth.getUser();
    if (userErr || !userData?.user) {
      return json(401, { ok: false, code: "unauthorized", message: "Sessão inválida" });
    }
    const user = userData.user;
    const email = (user.email || "").toLowerCase();

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    let isAdmin = email === ADMIN_EMAIL.toLowerCase();
    if (!isAdmin) {
      const { data: hasRole } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      isAdmin = Boolean(hasRole);
    }
    if (!isAdmin) return json(403, { ok: false, code: "forbidden", message: "Apenas admin" });

    // ── Input ──
    let body: any;
    try { body = await req.json(); } catch { body = {}; }
    const organization_id = String(body?.organization_id || "").trim();
    const amount_cents = Number(body?.amount_cents || 0);
    const billing_cycle = String(body?.billing_cycle || "monthly").trim();
    if (!organization_id || !/^[0-9a-f-]{36}$/i.test(organization_id)) {
      return json(200, { ok: false, code: "invalid_input", message: "organization_id inválido" });
    }
    if (!Number.isFinite(amount_cents) || amount_cents <= 0) {
      return json(200, { ok: false, code: "invalid_input", message: "amount_cents inválido" });
    }
    if (!["monthly", "quarterly", "annual"].includes(billing_cycle)) {
      return json(200, { ok: false, code: "invalid_input", message: "billing_cycle inválido" });
    }

    // ── Org + afiliado ──
    const { data: org } = await supabase
      .from("organizations")
      .select("id, name, affiliate_id, subscription_plan")
      .eq("id", organization_id)
      .maybeSingle();
    if (!org) return json(200, { ok: false, code: "org_not_found", message: "Loja não encontrada" });
    const affiliateId = (org as any).affiliate_id;
    if (!affiliateId) return json(200, { ok: true, skipped: "no_affiliate" });

    const { data: aff } = await supabase
      .from("affiliates")
      .select("id, name, telegram_chat_id, active")
      .eq("id", affiliateId)
      .maybeSingle();
    if (!aff || !(aff as any).active) return json(200, { ok: true, skipped: "affiliate_inactive" });

    // ── Idempotência: manual:<orgId>:<yyyy-mm> ──
    const d = new Date();
    const ym = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    const syntheticPaymentId = `manual:${organization_id}:${ym}`;
    const { data: existing } = await supabase
      .from("affiliate_client_goals")
      .select("id")
      .eq("source_payment_id", syntheticPaymentId)
      .eq("affiliate_id", affiliateId)
      .maybeSingle();
    if (existing) return json(200, { ok: true, skipped: "already_exists", goal_id: (existing as any).id });

    // ── Tier V8 ──
    const subPlan = (org as any).subscription_plan;
    const planKey = subPlan === "enterprise" ? "enterprise" : "pro";
    const { data: tier } = await supabase
      .from("affiliate_commission_tiers")
      .select("upfront_pct, installment_pct, label")
      .eq("plan_key", planKey)
      .eq("cycle", billing_cycle)
      .eq("active", true)
      .maybeSingle();
    if (!tier) return json(200, { ok: false, code: "tier_not_found", message: `Sem tier V8 para ${planKey}/${billing_cycle}` });

    const upfrontCents = Math.round(amount_cents * Number((tier as any).upfront_pct) / 100);
    const monthlyCents = Math.round(amount_cents * Number((tier as any).installment_pct) / 100);
    const threeXTotal = monthlyCents * 3;

    // ── Cria goal ──
    const { data: goal, error: gErr } = await supabase
      .from("affiliate_client_goals")
      .insert({
        affiliate_id: affiliateId,
        client_org_id: organization_id,
        source_payment_id: syntheticPaymentId,
        plan_key: planKey,
        cycle: billing_cycle,
        client_amount_cents: amount_cents,
        tier_upfront_pct: (tier as any).upfront_pct,
        tier_installment_pct: (tier as any).installment_pct,
        mode: "pending_choice",
        total_commission_cents: 0,
        status: "awaiting_choice",
      })
      .select("id")
      .single();
    if (gErr) {
      console.error("[affiliate-create-goal-manual] insert goal err:", gErr);
      return json(200, { ok: false, code: "insert_failed", message: gErr.message });
    }

    // ── Telegram ──
    if ((aff as any).telegram_chat_id) {
      try {
        const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
        const TELEGRAM_API_KEY = Deno.env.get("TELEGRAM_API_KEY");
        if (LOVABLE_API_KEY && TELEGRAM_API_KEY) {
          const text = `🎉 <b>Nova loja: ${(org as any).name || "—"}</b>\n\n` +
            `📦 Plano: <b>${(tier as any).label}</b>\n` +
            `💵 Valor: ${fmtBRL(amount_cents)}\n` +
            `<i>(ativado manualmente pelo admin)</i>\n\n` +
            `Como quer receber sua comissão?\n\n` +
            `💰 <b>À Vista</b>: ${fmtBRL(upfrontCents)} (libera em 7 dias)\n` +
            `📅 <b>3x mensal</b>: ${fmtBRL(monthlyCents)}/mês = ${fmtBRL(threeXTotal)}\n\n` +
            `⏰ Você tem 48h. Sem escolha = À Vista.`;
          await fetch("https://connector-gateway.lovable.dev/telegram/sendMessage", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "X-Connection-Api-Key": TELEGRAM_API_KEY,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              chat_id: (aff as any).telegram_chat_id,
              text,
              parse_mode: "HTML",
              reply_markup: {
                inline_keyboard: [[
                  { text: `💰 À Vista (${fmtBRL(upfrontCents)})`, callback_data: `aff:choice:${(goal as any).id}:upfront` },
                  { text: `📅 3x (${fmtBRL(monthlyCents)}/mês)`, callback_data: `aff:choice:${(goal as any).id}:3x` },
                ]],
              },
            }),
          });
        }
      } catch (e) {
        console.error("[affiliate-create-goal-manual] telegram err:", e);
      }
    }

    return json(200, { ok: true, goal_id: (goal as any).id, notified: Boolean((aff as any).telegram_chat_id) });
  } catch (err) {
    console.error("[affiliate-create-goal-manual] erro:", err);
    return json(500, { ok: false, code: "internal_error", detail: String((err as Error).message || err) });
  }
});