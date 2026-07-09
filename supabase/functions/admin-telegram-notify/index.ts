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

/** Traduz status de assinatura/pagamento vindos crus do banco/MP. */
function statusLabel(s: string | null | undefined): string {
  if (!s) return "";
  const map: Record<string, string> = {
    active: "Ativa",
    trialing: "Em trial",
    trial: "Em trial",
    past_due: "Pagamento atrasado",
    cancelled: "Cancelada",
    canceled: "Cancelada",
    paused: "Pausada",
    expired: "Expirada",
    pending: "Pendente",
    inactive: "Inativa",
    suspended: "Suspensa",
    authorized: "Autorizada",
    rejected: "Recusada",
    approved: "Aprovada",
    refunded: "Reembolsada",
    in_process: "Em processamento",
    charged_back: "Chargeback",
  };
  return map[String(s).toLowerCase()] ?? s;
}

/** Traduz ciclo de cobrança. */
function cycleLabel(c: string | null | undefined): string {
  if (!c) return "";
  const map: Record<string, string> = {
    monthly: "Mensal",
    yearly: "Anual",
    annual: "Anual",
    quarterly: "Trimestral",
    semiannual: "Semestral",
    weekly: "Semanal",
  };
  return map[String(c).toLowerCase()] ?? c;
}

/** Traduz motivos de recusa do Mercado Pago. */
function reasonLabel(r: string | null | undefined): string {
  if (!r) return "";
  const map: Record<string, string> = {
    cc_rejected_insufficient_amount: "Saldo/limite insuficiente",
    cc_rejected_bad_filled_card_number: "Número do cartão inválido",
    cc_rejected_bad_filled_date: "Validade do cartão inválida",
    cc_rejected_bad_filled_security_code: "CVV inválido",
    cc_rejected_bad_filled_other: "Dados do cartão inválidos",
    cc_rejected_call_for_authorize: "Emissor pediu autorização — cliente precisa liberar",
    cc_rejected_card_disabled: "Cartão desabilitado pelo emissor",
    cc_rejected_duplicated_payment: "Pagamento duplicado",
    cc_rejected_high_risk: "Recusado por risco",
    cc_rejected_max_attempts: "Muitas tentativas — bloqueado",
    cc_rejected_other_reason: "Recusado pelo emissor",
    cc_rejected_blacklist: "Cartão bloqueado",
    cc_rejected_card_type_not_allowed: "Tipo de cartão não aceito",
    cc_rejected_invalid_installments: "Parcelamento inválido",
    pending_review_manual: "Em análise manual",
    pending_waiting_payment: "Aguardando pagamento",
    pending_contingency: "Em contingência",
  };
  return map[String(r).toLowerCase()] ?? r;
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
        `📋 Plano: ${planLabel(payload.plan)} • ${escapeHtml(statusLabel(payload.status))}`,
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
        payload.billing_cycle ? `🔁 Ciclo: ${escapeHtml(cycleLabel(payload.billing_cycle))}` : "",
        `📊 Status: ${escapeHtml(statusLabel(payload.new_status))}`,
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
        `📋 Plano: ${planLabel(payload.plan)}${payload.billing_cycle ? ` (${escapeHtml(cycleLabel(payload.billing_cycle))})` : ""}`,
        payload.amount ? `💵 ${fmtBRL(Math.round(Number(payload.amount) * 100))} via ${escapeHtml(payload.payment_method || "MP")}` : "",
        payload.mrr_estimate ? `📈 MRR estimado: ${fmtBRL(payload.mrr_estimate)}` : "",
      ].filter(Boolean).join("\n");

    case "payment_failed":
      return [
        "❌ <b>Cobrança recusada</b>",
        "",
        `🏪 <b>${escapeHtml(payload.org_name)}</b>`,
        `📋 Plano: ${planLabel(payload.plan)}${payload.billing_cycle ? ` (${escapeHtml(cycleLabel(payload.billing_cycle))})` : ""}`,
        payload.reason ? `💳 Motivo: ${escapeHtml(reasonLabel(payload.reason))}` : "",
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

    case "referral_flagged":
      return [
        "🚩 <b>Bônus de indicação em revisão</b>",
        "",
        `🎁 +${payload.bonus_days} dias para org <code>${escapeHtml(payload.referrer_org_id)}</code>`,
        payload.referred_org_name ? `↳ Indicado: ${escapeHtml(payload.referred_org_name)}` : "",
        `📋 Motivo: ${escapeHtml(payload.reason)}`,
        "",
        "👉 Painel Admin → Indicações para liberar ou anular",
      ].filter(Boolean).join("\n");

    case "referral_blocked":
      return [
        "🛑 <b>Tentativa de bônus bloqueada</b>",
        "",
        `🏪 Indicado: ${escapeHtml(payload.referred_org_name || payload.referred_org_id)}`,
        `📋 Motivo: ${escapeHtml(payload.reason)}`,
        payload.payment_id ? `💳 Pagamento: <code>${escapeHtml(payload.payment_id)}</code>` : "",
        "",
        "👉 Painel Admin → Indicações → Tentativas bloqueadas",
      ].filter(Boolean).join("\n");

    case "cron_lagging": {
      const lines = ["⚠️ <b>Cron parado / atrasado</b>", "", `🔧 Job: ${escapeHtml(payload.job)}`];
      const alerts = Array.isArray(payload.alerts) ? payload.alerts : [];
      for (const a of alerts) {
        lines.push(`• <b>${escapeHtml(a.type)}</b>: ${escapeHtml(a.detail)}`);
      }
      lines.push("", "👉 Verifique pg_cron e logs da função release_pending_referral_bonuses");
      return lines.join("\n");
    }

    default:
      return null;
  }
}

function eventToggleKey(eventType: string): string {
  // map raw event_type to platform_config.admin_telegram_events key
  return eventType;
}

// ── Segurança: whitelist de event_types válidos ──
// Bloqueia payloads com event_type arbitrário (ex.: `<script>`) usados para tentar
// injetar mensagens fora do padrão. Se um novo evento for criado, adicionar aqui.
const VALID_EVENT_TYPES = new Set([
  "test", "new_signup", "subscription_change", "referral_converted",
  "payment_confirmed", "payment_failed", "trial_expiring", "subscription_expiring",
  "hot_lead", "cold_store", "critical_error", "phantom_orders",
  "referral_flagged", "referral_blocked", "cron_lagging",
  "reclame_aqui",
]);

// Limite defensivo do tamanho total do payload — evita DoS por payload gigante
// e mantém as mensagens do Telegram sempre abaixo do limite de 4096 chars.
const MAX_PAYLOAD_JSON_BYTES = 16 * 1024;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY_EARLY = Deno.env.get("LOVABLE_API_KEY");
    const TELEGRAM_API_KEY_EARLY = Deno.env.get("TELEGRAM_API_KEY");

    // Auxiliary action: getMe — returns bot username/info (used by Add dialog)
    const url = new URL(req.url);
    if (url.searchParams.get("action") === "bot_info" || req.method === "GET") {
      if (!LOVABLE_API_KEY_EARLY || !TELEGRAM_API_KEY_EARLY) {
        return new Response(JSON.stringify({ ok: false, error: "missing_keys" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      try {
        const meRes = await fetch(`${GATEWAY_URL}/getMe`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY_EARLY}`,
            "X-Connection-Api-Key": TELEGRAM_API_KEY_EARLY,
            "Content-Type": "application/json",
          },
          body: "{}",
        });
        const meBody = await meRes.json().catch(() => ({}));
        const username = meBody?.result?.username || null;
        const first_name = meBody?.result?.first_name || null;
        return new Response(JSON.stringify({ ok: meRes.ok, username, first_name }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (e: any) {
        return new Response(JSON.stringify({ ok: false, error: e?.message || String(e) }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Guarda de tamanho antes do parse — request grande é rejeitado sem custo
    const rawText = await req.text();
    if (rawText.length > MAX_PAYLOAD_JSON_BYTES) {
      return new Response(JSON.stringify({ ok: false, error: "payload_too_large" }), {
        status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    let reqBody: any;
    try { reqBody = JSON.parse(rawText); }
    catch {
      return new Response(JSON.stringify({ ok: false, error: "invalid_json" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { event_type, payload, action } = reqBody;

    // Action: bot_info via POST body (used by AdminTelegramTab)
    if (action === "bot_info") {
      if (!LOVABLE_API_KEY_EARLY || !TELEGRAM_API_KEY_EARLY) {
        return new Response(JSON.stringify({ ok: false, error: "missing_keys" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      try {
        const meRes = await fetch(`${GATEWAY_URL}/getMe`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY_EARLY}`,
            "X-Connection-Api-Key": TELEGRAM_API_KEY_EARLY,
            "Content-Type": "application/json",
          },
          body: "{}",
        });
        const meBody = await meRes.json().catch(() => ({}));
        return new Response(JSON.stringify({
          ok: meRes.ok,
          username: meBody?.result?.username || null,
          first_name: meBody?.result?.first_name || null,
        }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch (e: any) {
        return new Response(JSON.stringify({ ok: false, error: e?.message || String(e) }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Action: get_chat_info — calls Telegram getChat for a chat_id and
    // returns the real account name/username so the admin can confirm
    // which Telegram account is actually receiving messages.
    if (action === "get_chat_info") {
      if (!LOVABLE_API_KEY_EARLY || !TELEGRAM_API_KEY_EARLY) {
        return new Response(JSON.stringify({ ok: false, error: "missing_keys" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const chatId = String(reqBody?.chat_id || "").trim();
      if (!chatId) {
        return new Response(JSON.stringify({ ok: false, error: "chat_id required" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      try {
        const tgRes = await fetch(`${GATEWAY_URL}/getChat`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY_EARLY}`,
            "X-Connection-Api-Key": TELEGRAM_API_KEY_EARLY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ chat_id: chatId }),
        });
        const tgBody = await tgRes.json().catch(() => ({}));
        if (!tgRes.ok || !tgBody?.result) {
          return new Response(JSON.stringify({
            ok: false,
            error: tgBody?.description || `HTTP ${tgRes.status}`,
          }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        const r = tgBody.result;
        return new Response(JSON.stringify({
          ok: true,
          chat: {
            type: r.type ?? null,
            first_name: r.first_name ?? null,
            last_name: r.last_name ?? null,
            username: r.username ?? null,
            title: r.title ?? null,
          },
        }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch (e: any) {
        return new Response(JSON.stringify({ ok: false, error: e?.message || String(e) }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Action: welcome_admin — sends welcome message directly to a chat_id
    // Used when an admin adds a new recipient. Bypasses recipients table & toggles.
    if (action === "welcome_admin") {
      if (!LOVABLE_API_KEY_EARLY || !TELEGRAM_API_KEY_EARLY) {
        return new Response(JSON.stringify({ ok: false, error: "missing_keys" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const chatId = String(reqBody?.chat_id || "").trim();
      const recipientName = String(reqBody?.recipient_name || "").trim() || "Você";
      const addedBy = String(reqBody?.added_by || "").trim() || "um administrador";
      if (!chatId) {
        return new Response(JSON.stringify({ ok: false, error: "chat_id required" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const welcomeText = [
        "🎉 <b>Bem-vindo ao TrendFood Admin!</b>",
        "",
        `Olá ${escapeHtml(recipientName)}, você foi adicionado(a) como destinatário de notificações da plataforma por <b>${escapeHtml(addedBy)}</b>.`,
        "",
        "A partir de agora você vai receber:",
        "• 🆕 Novos cadastros",
        "• 💳 Pagamentos e mudanças de plano",
        "• 🤝 Conversões de afiliados",
        "• ⚠️ Erros críticos do sistema",
        "• 📊 Resumos diários e semanais",
        "",
        "<i>Se não quiser mais receber, peça pro admin remover seu Chat ID.</i>",
        "",
        "— Bot oficial TrendFood",
      ].join("\n");
      try {
        const tgRes = await fetch(`${GATEWAY_URL}/sendMessage`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY_EARLY}`,
            "X-Connection-Api-Key": TELEGRAM_API_KEY_EARLY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            chat_id: chatId,
            text: welcomeText,
            parse_mode: "HTML",
            disable_web_page_preview: true,
          }),
        });
        const tgBody = await tgRes.json().catch(() => ({}));
        if (!tgRes.ok) {
          return new Response(JSON.stringify({
            ok: false,
            error: tgBody?.description || `HTTP ${tgRes.status}`,
          }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        return new Response(JSON.stringify({ ok: true }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (e: any) {
        return new Response(JSON.stringify({ ok: false, error: e?.message || String(e) }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (!event_type) {
      return new Response(JSON.stringify({ error: "event_type required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rejeita event_type fora do whitelist (defesa contra payloads maliciosos)
    if (typeof event_type !== "string" || !VALID_EVENT_TYPES.has(event_type)) {
      console.warn("[admin-telegram-notify] rejected: invalid event_type=", event_type);
      return new Response(JSON.stringify({ ok: false, error: "invalid_event_type" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const TELEGRAM_API_KEY = Deno.env.get("TELEGRAM_API_KEY");

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // Optional: target a single recipient (used by "Testar" per-recipient button)
    const targetRecipientId: string | undefined = (payload as any)?._target_recipient_id;

    // Load active recipients
    let query = supabase
      .from("admin_telegram_recipients")
      .select("id, name, chat_id, active, events")
      .eq("active", true);
    if (targetRecipientId) {
      query = supabase
        .from("admin_telegram_recipients")
        .select("id, name, chat_id, active, events")
        .eq("id", targetRecipientId);
    }
    const { data: recipients, error: recErr } = await query;
    if (recErr) {
      console.error("[admin-telegram-notify] recipients fetch error:", recErr);
    }

    if (!recipients || recipients.length === 0) {
      return new Response(JSON.stringify({ ok: false, reason: "no_recipients" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!LOVABLE_API_KEY || !TELEGRAM_API_KEY) {
      await supabase.from("admin_telegram_log").insert({
        event_type, message: "(missing keys)", payload, status: "error",
        error: "Missing LOVABLE_API_KEY or TELEGRAM_API_KEY",
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

    const buttons = buildButtons(event_type, payload || {});
    const replyMarkup = buttons.length > 0
      ? { reply_markup: { inline_keyboard: buttons } }
      : {};

    // Send to each eligible recipient in parallel
    const sends = recipients.map(async (r: any) => {
      const toggles = (r.events ?? {}) as Record<string, boolean>;
      // Test event bypasses filters
      if (event_type !== "test" && toggles[eventToggleKey(event_type)] === false) {
        return { recipient: r, skipped: true, reason: "disabled" };
      }
      // Retry uma vez em 502/503 (gateway transitório)
      const sendOnce = async () => {
        const tgRes = await fetch(`${GATEWAY_URL}/sendMessage`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "X-Connection-Api-Key": TELEGRAM_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            chat_id: r.chat_id,
            text: message,
            parse_mode: "HTML",
            disable_web_page_preview: true,
            ...replyMarkup,
          }),
        });
        const tgBody = await tgRes.text();
        return { tgRes, tgBody };
      };
      try {
        let { tgRes, tgBody } = await sendOnce();
        if (!tgRes.ok && (tgRes.status === 502 || tgRes.status === 503)) {
          await new Promise((res) => setTimeout(res, 1500));
          ({ tgRes, tgBody } = await sendOnce());
        }
        return { recipient: r, ok: tgRes.ok, status: tgRes.status, body: tgBody };
      } catch (err: any) {
        return { recipient: r, ok: false, error: err?.message || String(err) };
      }
    });

    const results = await Promise.all(sends);

    // Log one row per actual send attempt (skip filtered-out)
    const logRows = results
      .filter((r: any) => !r.skipped)
      .map((r: any) => ({
        event_type,
        message,
        payload,
        status: r.ok ? "sent" : "error",
        recipient_name: r.recipient.name,
        error: r.ok ? null : (r.error ?? `HTTP ${r.status}: ${String(r.body || "").slice(0, 500)}`),
      }));
    if (logRows.length > 0) {
      await supabase.from("admin_telegram_log").insert(logRows);
    }

    const sentCount = results.filter((r: any) => r.ok).length;
    const skippedCount = results.filter((r: any) => r.skipped).length;
    const errorCount = results.filter((r: any) => !r.ok && !r.skipped).length;

    // Extract first error detail for UI to show precise message
    const firstFailed = results.find((r: any) => !r.ok && !r.skipped);
    let first_error: string | null = null;
    let first_error_recipient: string | null = null;
    if (firstFailed) {
      first_error_recipient = (firstFailed as any).recipient?.name ?? null;
      const rawErr = (firstFailed as any).error;
      const rawBody = (firstFailed as any).body;
      // Telegram returns JSON like {"ok":false,"description":"Bad Request: chat not found"}
      let desc: string | null = null;
      if (rawBody) {
        try {
          const parsed = JSON.parse(rawBody);
          desc = parsed?.description || null;
        } catch { /* ignore */ }
      }
      first_error = desc || rawErr || (rawBody ? String(rawBody).slice(0, 200) : null) || `HTTP ${(firstFailed as any).status ?? "?"}`;
    }

    return new Response(JSON.stringify({
      ok: sentCount > 0,
      sent: sentCount,
      skipped: skippedCount,
      errors: errorCount,
      total: recipients.length,
      first_error,
      first_error_recipient,
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[admin-telegram-notify] error:", e);
    return new Response(JSON.stringify({ ok: false, error: e?.message || String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});