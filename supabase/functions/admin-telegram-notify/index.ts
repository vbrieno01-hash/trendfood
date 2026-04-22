import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/telegram";
const STOREFRONT_BASE = "https://trendfood.lovable.app/unidade";
const ADMIN_PANEL_URL = "https://trendfood.lovable.app/admin";

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

/** Sanitize a Brazilian WhatsApp number to digits-only with `55` prefix.
 *  Returns null if it doesn't look valid. */
function sanitizeWhatsApp(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let digits = String(raw).replace(/\D/g, "");
  if (!digits) return null;
  // Strip leading zeros
  digits = digits.replace(/^0+/, "");
  // Add country code if missing
  if (!digits.startsWith("55")) digits = "55" + digits;
  // BR mobile: 55 + DDD(2) + 9digits => 13. Landline => 12. Accept 12-13.
  if (digits.length < 12 || digits.length > 13) return null;
  return digits;
}

/** Build a wa.me URL with pre-filled message. Returns null if number invalid. */
function buildWaLink(whatsapp: string | null | undefined, text: string): string | null {
  const digits = sanitizeWhatsApp(whatsapp);
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

/** Per-event WhatsApp message templates, signed as TrendFood. */
function buildWhatsAppMessage(eventType: string, payload: any): string | null {
  const name = payload.org_name || payload.referrer_name || "tudo bem";
  switch (eventType) {
    case "new_signup":
      return `Olá, ${name}! 👋 Boas-vindas à TrendFood! Sou do time e estou aqui pra te ajudar a configurar tudo certinho nos primeiros dias. Qualquer dúvida sobre cardápio, pagamentos, impressão ou WhatsApp, é só me chamar!`;

    case "subscription_change": {
      const status = payload.new_status;
      if (status === "cancelled") {
        return `Olá, ${name}! Aqui é a TrendFood. Vi que vocês cancelaram a assinatura — sentiremos falta! 😔 Se tiver 2 minutinhos, adoraria entender o que motivou e se tem algo que podemos melhorar. Estou à disposição!`;
      }
      const order: Record<string, number> = { free: 0, pro: 1, enterprise: 2, lifetime: 3 };
      const oldRank = order[payload.old_plan] ?? 0;
      const newRank = order[payload.new_plan] ?? 0;
      if (newRank > oldRank) {
        return `Olá, ${name}! Aqui é a TrendFood 🎉 Vi que vocês fizeram upgrade pro plano ${planLabel(payload.new_plan)}. Obrigado pela confiança! Qualquer dúvida sobre as novas funcionalidades, é só me chamar.`;
      }
      return null;
    }

    case "referral_converted":
      return `Olá, ${payload.referrer_name || "tudo bem"}! 🎉 A loja "${payload.referred_name}" que você indicou virou assinante Pro! Você acabou de ganhar +${payload.bonus_days} dias Pro de bônus. Continue indicando! 🚀`;

    case "payment_confirmed":
      return `Olá, ${name}! Aqui é a TrendFood 🎉 Seu pagamento foi confirmado e seu plano ${planLabel(payload.plan)} está ativo. Obrigado pela confiança! Qualquer coisa que precisar, é só me chamar por aqui.`;

    case "payment_failed":
      return `Olá, ${name}! Aqui é a TrendFood. Sua cobrança da assinatura ${planLabel(payload.plan)} foi recusada hoje${payload.reason ? ` (${payload.reason})` : ""}. Pra não perder o acesso, é só atualizar o método de pagamento no painel. Qualquer dúvida, me chama por aqui que ajudo na hora!`;

    case "trial_expiring": {
      const daysTxt = payload.days_left === 0 ? "acaba hoje" : `acaba em ${payload.days_left} dia(s)`;
      const ordersTxt = typeof payload.order_count === "number" && payload.order_count > 0
        ? ` e você já fez ${payload.order_count} pedido(s) — ótimo ritmo! 🚀`
        : "";
      return `Olá, ${name}! 👋 Aqui é o time da TrendFood. Notei que seu trial Pro ${daysTxt}${ordersTxt} Quer que eu te ajude a continuar com tudo liberado? Posso te mandar o link de pagamento ou tirar dúvidas sobre os planos. Me avisa por aqui!`;
    }

    case "hot_lead":
      return `Oi, ${name}! Time da TrendFood aqui 🚀 Vi que vocês estão bombando hoje com ${payload.orders_today} pedido(s)! No plano Free você tem várias limitações que podem estar te atrapalhando. Posso te mostrar como o Pro te dá pedidos ilimitados, cupons, fidelidade e muito mais. Topa um papo rápido?`;

    case "cold_store":
      return `Olá, ${name}! Aqui é a TrendFood 👋 Notamos que vocês não receberam pedidos nos últimos dias. Tá tudo bem por aí? Se tiver alguma dificuldade com a plataforma, alguma dúvida ou precisar de ajuda pra divulgar a loja, me chama aqui — quero garantir que vocês tirem o máximo proveito do plano!`;

    default:
      return null;
  }
}

/** Build inline keyboard buttons for a Telegram message. */
function buildButtons(eventType: string, payload: any): Array<Array<{ text: string; url: string }>> {
  const rows: Array<Array<{ text: string; url: string }>> = [];

  // For referral, the WhatsApp belongs to the referrer
  const waNumber = eventType === "referral_converted"
    ? payload.referrer_whatsapp
    : payload.whatsapp;
  const slug = eventType === "referral_converted"
    ? payload.referrer_slug
    : payload.slug;

  const waText = buildWhatsAppMessage(eventType, payload);
  if (waText) {
    const waLink = buildWaLink(waNumber, waText);
    if (waLink) {
      rows.push([{ text: "💬 Falar com loja (msg pronta)", url: waLink }]);
    }
  }

  if (slug) {
    rows.push([{ text: "🏪 Abrir vitrine", url: `${STOREFRONT_BASE}/${slug}` }]);
  }

  // Always offer the admin panel for store-specific events
  const isStoreEvent = [
    "new_signup", "subscription_change", "referral_converted",
    "payment_confirmed", "payment_failed", "trial_expiring",
    "hot_lead", "cold_store",
  ].includes(eventType);
  if (isStoreEvent) {
    rows.push([{ text: "⚙️ Painel Admin", url: ADMIN_PANEL_URL }]);
  } else if (eventType === "critical_error") {
    rows.push([{ text: "⚙️ Painel Admin → Logs", url: ADMIN_PANEL_URL }]);
  } else if (eventType === "test") {
    rows.push([{ text: "⚙️ Abrir Painel Admin", url: ADMIN_PANEL_URL }]);
  }

  return rows;
}

function buildMessage(eventType: string, payload: any): string | null {
  switch (eventType) {
    case "test":
      return [
        "✅ <b>Telegram Admin conectado!</b>",
        "",
        "A partir de agora você recebe tudo da plataforma aqui em tempo real, organizado por categoria:",
        "",
        "💰 <b>FINANCEIRO</b>",
        "   • Pagamentos confirmados (com MRR)",
        "   • Falhas de cobrança",
        "   • Mudanças de assinatura",
        "",
        "🚀 <b>CRESCIMENTO</b>",
        "   • Novos cadastros",
        "   • Indicações convertidas",
        "   • Lojas quentes (leads pra abordar)",
        "",
        "⏰ <b>RETENÇÃO</b>",
        "   • Trials expirando (D-3 / D-1 / hoje)",
        "   • Lojas frias (risco de churn)",
        "",
        "⚠️ <b>OPERACIONAL</b>",
        "   • Erros críticos",
        "   • Pedidos fantasmas",
        "",
        "📊 <b>RELATÓRIOS AUTOMÁTICOS</b>",
        "   • Resumo diário às 09h",
        "   • Resumo semanal aos domingos",
        "",
        "💡 <i>Dica: cada alerta de loja vem com botões de ação — toque em \"💬 Falar com loja\" e o WhatsApp abre com mensagem pronta!</i>",
        "",
        "Configure quais eventos receber em:",
        "⚙️ Painel Admin → Telegram Admin",
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
        ...(() => {
          const buttons = buildButtons(event_type, payload || {});
          return buttons.length > 0
            ? { reply_markup: { inline_keyboard: buttons } }
            : {};
        })(),
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