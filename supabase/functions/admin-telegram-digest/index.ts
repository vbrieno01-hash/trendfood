import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/telegram";

function fmtBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function getNowBRT(): Date {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60_000;
  return new Date(utcMs + -3 * 3600_000);
}

Deno.serve(async (req) => {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const TELEGRAM_API_KEY = Deno.env.get("TELEGRAM_API_KEY");

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  const url = new URL(req.url);
  const mode = url.searchParams.get("mode") || "daily"; // daily | weekly

  // Read config
  const { data: cfg } = await supabase
    .from("platform_config")
    .select("admin_telegram_chat_id, admin_telegram_events")
    .limit(1)
    .maybeSingle();

  const chatId = (cfg as any)?.admin_telegram_chat_id;
  const toggles = (cfg as any)?.admin_telegram_events ?? {};

  if (!chatId || !LOVABLE_API_KEY || !TELEGRAM_API_KEY) {
    return new Response(JSON.stringify({ ok: false, reason: "not_configured" }));
  }

  const toggleKey = mode === "weekly" ? "weekly_digest" : "daily_digest";
  if (toggles[toggleKey] === false) {
    return new Response(JSON.stringify({ ok: false, reason: "disabled" }));
  }

  const now = getNowBRT();
  const sinceHours = mode === "weekly" ? 24 * 7 : 24;
  const since = new Date(now.getTime() - sinceHours * 3600_000).toISOString();

  // New signups
  const { count: newSignups } = await supabase
    .from("organizations")
    .select("id", { count: "exact", head: true })
    .gte("created_at", since);

  // All orgs to compute MRR snapshot
  const { data: allOrgs } = await supabase
    .from("organizations")
    .select("subscription_plan, billing_cycle");

  let mrr = 0;
  let proCount = 0;
  let entCount = 0;
  let lifetimeCount = 0;
  for (const o of allOrgs || []) {
    if (o.subscription_plan === "pro") { proCount++; mrr += 99; }
    else if (o.subscription_plan === "enterprise") { entCount++; mrr += 249; }
    else if (o.subscription_plan === "lifetime") { lifetimeCount++; }
  }

  // Orders in window
  const { count: ordersCount } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .gte("created_at", since);

  // Errors in window
  const { count: errorsCount } = await supabase
    .from("client_error_logs")
    .select("id", { count: "exact", head: true })
    .gte("created_at", since);

  const title = mode === "weekly"
    ? `📈 <b>Resumo semanal — TrendFood</b>`
    : `📊 <b>Resumo diário — TrendFood</b>`;

  const periodLabel = mode === "weekly" ? "últimos 7 dias" : "últimas 24h";

  const message = [
    title,
    `<i>${periodLabel}</i>`,
    "",
    `🆕 Novos cadastros: <b>${newSignups ?? 0}</b>`,
    `🛒 Pedidos na plataforma: <b>${ordersCount ?? 0}</b>`,
    `⚠️ Erros capturados: <b>${errorsCount ?? 0}</b>`,
    "",
    `💰 MRR estimado: <b>R$ ${mrr.toLocaleString("pt-BR")}</b>`,
    `📋 Pro: ${proCount} • Enterprise: ${entCount} • Vitalício: ${lifetimeCount}`,
  ].join("\n");

  const tgRes = await fetch(`${GATEWAY_URL}/sendMessage`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": TELEGRAM_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: "HTML" }),
  });

  const ok = tgRes.ok;
  const body = await tgRes.text();

  await supabase.from("admin_telegram_log").insert({
    event_type: mode === "weekly" ? "weekly_digest" : "daily_digest",
    message,
    payload: { mrr, newSignups, ordersCount, errorsCount, proCount, entCount, lifetimeCount },
    status: ok ? "sent" : "error",
    error: ok ? null : `HTTP ${tgRes.status}: ${body.slice(0, 500)}`,
  });

  return new Response(JSON.stringify({ ok, mode }));
});