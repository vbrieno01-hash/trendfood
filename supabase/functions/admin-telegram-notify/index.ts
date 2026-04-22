import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/telegram";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function fmtBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function planLabel(plan: string | null | undefined): string {
  switch (plan) {
    case "pro": return "Pro";
    case "enterprise": return "Enterprise";
    case "lifetime": return "Vitalício";
    case "free": return "Grátis";
    default: return plan || "Grátis";
  }
}

function escapeHtml(s: string | null | undefined): string {
  if (!s) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildMessage(eventType: string, payload: any): string | null {
  switch (eventType) {
    case "test":
      return [
        "✅ <b>Telegram Admin conectado!</b>",
        "",
        "A partir de agora você vai receber tudo que importa da plataforma aqui em tempo real:",
        "🆕 Novos cadastros",
        "💰 Novas assinaturas",
        "📉 Cancelamentos",
        "⚠️ Erros críticos",
        "📊 Resumo diário às 09h",
      ].join("\n");

    case "new_signup":
      return [
        "🆕 <b>Novo cadastro na plataforma</b>",
        "",
        `🏪 <b>${escapeHtml(payload.org_name)}</b>`,
        `🔗 /unidade/${escapeHtml(payload.slug)}`,
        `📋 Plano: ${planLabel(payload.plan)} • ${escapeHtml(payload.status)}`,
        payload.whatsapp ? `📱 WhatsApp: ${escapeHtml(payload.whatsapp)}` : "",
        payload.referred_by_id ? "🤝 <i>Veio por indicação</i>" : "",
      ].filter(Boolean).join("\n");

    case "subscription_change": {
      const oldP = planLabel(payload.old_plan);
      const newP = planLabel(payload.new_plan);
      let icon = "🔄";
      let title = "Mudança de assinatura";
      const order: Record<string, number> = { free: 0, pro: 1, enterprise: 2, lifetime: 3 };
      const oldRank = order[payload.old_plan] ?? 0;
      const newRank = order[payload.new_plan] ?? 0;
      if (newRank > oldRank) { icon = "💰"; title = "Upgrade de plano!"; }
      else if (newRank < oldRank) { icon = "📉"; title = "Downgrade / cancelamento"; }
      if (payload.new_status === "cancelled") { icon = "❌"; title = "Assinatura cancelada"; }
      return [
        `${icon} <b>${title}</b>`,
        "",
        `🏪 <b>${escapeHtml(payload.org_name)}</b>`,
        `📋 ${oldP} → <b>${newP}</b>`,
        payload.billing_cycle ? `🔁 Ciclo: ${escapeHtml(payload.billing_cycle)}` : "",
        `📊 Status: ${escapeHtml(payload.new_status)}`,
      ].filter(Boolean).join("\n");
    }

    case "referral_converted":
      return [
        "🤝 <b>Indicação convertida!</b>",
        "",
        `🏪 <b>${escapeHtml(payload.referrer_name)}</b> indicou <b>${escapeHtml(payload.referred_name)}</b>`,
        `🎁 Bônus: +${payload.bonus_days} dias Pro`,
      ].join("\n");

    case "critical_error":
      return [
        "🚨 <b>Erro crítico capturado</b>",
        "",
        `❌ ${escapeHtml(String(payload.error_message).slice(0, 200))}`,
        payload.url ? `📍 ${escapeHtml(payload.url)}` : "",
        payload.source ? `🔧 ${escapeHtml(payload.source)}` : "",
        "",
        "👉 Veja em Painel Admin → Logs de Erros",
      ].filter(Boolean).join("\n");

    case "phantom_orders":
      return [
        "🛒 <b>Pedidos fantasmas limpos</b>",
        "",
        `🗑️ ${payload.count} pedido(s) removido(s)`,
      ].join("\n");

    case "subscription_expiring":
      return [
        "⏰ <b>Assinatura expirando</b>",
        "",
        `🏪 <b>${escapeHtml(payload.org_name)}</b>`,
        `📅 Expira em ${payload.days_left} dia(s)`,
        `📋 Plano: ${planLabel(payload.plan)}`,
      ].join("\n");

    case "payment_confirmed":
      return [
        "💰 <b>Pagamento confirmado!</b>",
        "",
        `🏪 <b>${escapeHtml(payload.org_name)}</b>`,
        `📋 Plano: ${planLabel(payload.plan)}${payload.billing_cycle ? ` (${escapeHtml(payload.billing_cycle)})` : ""}`,
        payload.amount ? `💵 ${fmtBRL(Math.round(Number(payload.amount) * 100))} via ${escapeHtml(payload.payment_method || "MP")}` : "",
        payload.mrr_estimate ? `📈 MRR estimado: ${fmtBRL(payload.mrr_estimate)}` : "",
      ].filter(Boolean).join("\n");

    case "payment_failed":
      return [
        "❌ <b>Cobrança recusada</b>",
        "",
        `🏪 <b>${escapeHtml(payload.org_name)}</b>`,
        `📋 Plano: ${planLabel(payload.plan)}${payload.billing_cycle ? ` (${escapeHtml(payload.billing_cycle)})` : ""}`,
        payload.reason ? `💳 Motivo: ${escapeHtml(payload.reason)}` : "",
        "⚠️ Loja perde acesso se não regularizar",
      ].filter(Boolean).join("\n");

    case "trial_expiring":
      return [
        `⏰ <b>Trial expira ${payload.days_left === 0 ? "hoje" : `em ${payload.days_left} dia(s)`}</b>`,
        "",
        `🏪 <b>${escapeHtml(payload.org_name)}</b>`,
        typeof payload.order_count === "number" ? `📊 Já fez <b>${payload.order_count}</b> pedido(s) no trial` : "",
        payload.whatsapp ? `📱 WhatsApp: ${escapeHtml(payload.whatsapp)}` : "",
        "👉 Bom momento pra entrar em contato",
      ].filter(Boolean).join("\n");

    case "hot_lead":
      return [
        "🔥 <b>Lead quente detectado!</b>",
        "",
        `🏪 <b>${escapeHtml(payload.org_name)}</b> (plano ${planLabel(payload.plan)})`,
        `📊 Bateu <b>${payload.orders_today}</b> pedido(s) hoje`,
        payload.whatsapp ? `📱 WhatsApp: ${escapeHtml(payload.whatsapp)}` : "",
        "💡 Pronto pra abordar e oferecer Pro",
      ].filter(Boolean).join("\n");

    case "cold_store": {
      const lastOrder = payload.last_order_at ? new Date(payload.last_order_at) : null;
      const lastOrderStr = lastOrder ? lastOrder.toLocaleDateString("pt-BR") : "—";
      return [
        "😴 <b>Loja inativa há 7+ dias</b>",
        "",
        `🏪 <b>${escapeHtml(payload.org_name)}</b> (${planLabel(payload.plan)}${payload.billing_cycle ? ` ${escapeHtml(payload.billing_cycle)}` : ""})`,
        `📉 Último pedido: ${lastOrderStr}`,
        "💸 Risco de cancelamento — vale dar follow-up",
      ].filter(Boolean).join("\n");
    }

    default:
      return null;
  }
}

function eventToggleKey(eventType: string): string {
  // map raw event_type to platform_config.admin_telegram_events key
  return eventType;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { event_type, payload } = await req.json();
    if (!event_type) {
      return new Response(JSON.stringify({ error: "event_type required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const TELEGRAM_API_KEY = Deno.env.get("TELEGRAM_API_KEY");

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // Read admin chat_id and toggles
    const { data: cfg } = await supabase
      .from("platform_config")
      .select("admin_telegram_chat_id, admin_telegram_events")
      .limit(1)
      .maybeSingle();

    const chatId = (cfg as any)?.admin_telegram_chat_id;
    const toggles = (cfg as any)?.admin_telegram_events ?? {};

    if (!chatId) {
      return new Response(JSON.stringify({ ok: false, reason: "no_chat_id" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Test event always sent regardless of toggle
    if (event_type !== "test") {
      const key = eventToggleKey(event_type);
      if (toggles[key] === false) {
        return new Response(JSON.stringify({ ok: false, reason: "disabled" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (!LOVABLE_API_KEY || !TELEGRAM_API_KEY) {
      await supabase.from("admin_telegram_log").insert({
        event_type, message: "(missing keys)", payload, status: "error", error: "Missing LOVABLE_API_KEY or TELEGRAM_API_KEY",
      });
      return new Response(JSON.stringify({ ok: false, reason: "missing_keys" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const message = buildMessage(event_type, payload || {});
    if (!message) {
      return new Response(JSON.stringify({ ok: false, reason: "unknown_event" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tgRes = await fetch(`${GATEWAY_URL}/sendMessage`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": TELEGRAM_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });

    const tgBody = await tgRes.text();
    const ok = tgRes.ok;

    await supabase.from("admin_telegram_log").insert({
      event_type,
      message,
      payload,
      status: ok ? "sent" : "error",
      error: ok ? null : `HTTP ${tgRes.status}: ${tgBody.slice(0, 500)}`,
    });

    return new Response(JSON.stringify({ ok, message }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[admin-telegram-notify] error:", e);
    return new Response(JSON.stringify({ ok: false, error: e?.message || String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});