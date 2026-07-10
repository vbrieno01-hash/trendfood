// Watchdog: detecta PIX aprovados no Mercado Pago que não foram creditados
// no sistema em até 15 min. Tenta auto-reconciliar; se falhar, avisa Telegram.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/telegram";
const ADMIN_URL = "https://trendfood.lovable.app/admin";

function fmtBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function productLabel(plan: string): string {
  if (!plan) return "Desconhecido";
  if (plan.startsWith("campaign_credits")) return `Créditos de Campanha (${plan})`;
  if (plan.startsWith("addon_") || plan.includes("bot")) return `Add-on: ${plan}`;
  if (["pro", "enterprise", "lifetime"].includes(plan)) return `Plano ${plan.toUpperCase()}`;
  return plan;
}

async function sendTelegram(text: string, chatIds: string[]) {
  const LOVABLE = Deno.env.get("LOVABLE_API_KEY");
  const TG = Deno.env.get("TELEGRAM_API_KEY");
  if (!LOVABLE || !TG) {
    console.error("[watchdog-pix-stuck] missing telegram credentials");
    return;
  }
  for (const chatId of chatIds) {
    try {
      const res = await fetch(`${GATEWAY_URL}/sendMessage`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${LOVABLE}`,
          "X-Connection-Api-Key": TG,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        console.error("[watchdog-pix-stuck] telegram send failed", res.status, body);
      }
    } catch (e) {
      console.error("[watchdog-pix-stuck] telegram error", e);
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startedAt = Date.now();
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const accessToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
  if (!accessToken) {
    return new Response(JSON.stringify({ error: "MP not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Janela: PIX pendentes com 15 min a 6 h de idade
  const now = Date.now();
  const minAge = new Date(now - 15 * 60 * 1000).toISOString();
  const maxAge = new Date(now - 6 * 60 * 60 * 1000).toISOString();

  const { data: pendings, error: fetchErr } = await supabase
    .from("pending_subscription_payments")
    .select("*")
    .eq("status", "pending")
    .lt("created_at", minAge)
    .gt("created_at", maxAge);

  if (fetchErr) {
    console.error("[watchdog-pix-stuck] fetch error", fetchErr);
    return new Response(JSON.stringify({ error: "fetch_failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Destinatários ativos do Telegram
  const { data: recipients } = await supabase
    .from("admin_telegram_recipients")
    .select("chat_id")
    .eq("active", true);
  const chatIds = (recipients || []).map((r: any) => String(r.chat_id)).filter(Boolean);

  const results: Array<Record<string, unknown>> = [];
  let alertsSent = 0;
  let autoRecovered = 0;

  for (const p of (pendings || []) as any[]) {
    try {
      const mpRes = await fetch(
        `https://api.mercadopago.com/v1/payments/${p.payment_id}`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      const mpData = await mpRes.json();
      if (!mpRes.ok) {
        results.push({ payment_id: p.payment_id, error: "mp_fetch_failed" });
        continue;
      }

      if (mpData.status !== "approved") {
        results.push({ payment_id: p.payment_id, mp_status: mpData.status });
        continue;
      }

      // MP diz aprovado, mas local ainda pending: dedup + tentar auto-recuperar
      const eventKey = `pix_stuck:${p.payment_id}`;
      const { data: dedup } = await supabase
        .from("admin_telegram_dedupe")
        .select("event_key")
        .eq("event_key", eventKey)
        .maybeSingle();
      if (dedup) {
        results.push({ payment_id: p.payment_id, skipped: "already_alerted" });
        continue;
      }

      // Tenta auto-reconciliar
      let recovered = false;
      try {
        await supabase.functions.invoke("reconcile-pending-pix", {
          body: { payment_id: String(p.payment_id) },
        });
        const { data: recheck } = await supabase
          .from("pending_subscription_payments")
          .select("status")
          .eq("payment_id", String(p.payment_id))
          .maybeSingle();
        recovered = (recheck as any)?.status === "approved";
      } catch (err) {
        console.error("[watchdog-pix-stuck] recovery error", err);
      }

      const { data: org } = await supabase
        .from("organizations")
        .select("name")
        .eq("id", p.organization_id)
        .maybeSingle();
      const orgName = (org as any)?.name || p.organization_id;
      const ageMin = Math.round((now - new Date(p.created_at).getTime()) / 60000);

      let msg: string;
      if (recovered) {
        autoRecovered++;
        msg = [
          `✅ <b>PIX auto-creditado</b>`,
          `<b>Loja:</b> ${orgName}`,
          `<b>Produto:</b> ${productLabel(p.plan)}`,
          `<b>Valor:</b> ${fmtBRL(p.amount_cents)}`,
          `<b>Payment ID:</b> <code>${p.payment_id}</code>`,
          `<b>Idade:</b> ${ageMin} min`,
          ``,
          `O watchdog detectou o PIX travado e creditou automaticamente. Nenhuma ação necessária.`,
        ].join("\n");
      } else {
        alertsSent++;
        msg = [
          `🚨 <b>PIX APROVADO NÃO CREDITADO</b>`,
          `<b>Loja:</b> ${orgName}`,
          `<b>Produto:</b> ${productLabel(p.plan)}`,
          `<b>Valor:</b> ${fmtBRL(p.amount_cents)}`,
          `<b>Payment ID:</b> <code>${p.payment_id}</code>`,
          `<b>Idade:</b> ${ageMin} min`,
          ``,
          `Auto-recuperação falhou. Crédito manual necessário:`,
          `${ADMIN_URL}`,
        ].join("\n");
      }

      if (chatIds.length > 0) {
        await sendTelegram(msg, chatIds);
      }
      await supabase.from("admin_telegram_dedupe").upsert({ event_key: eventKey });

      results.push({
        payment_id: p.payment_id,
        recovered,
        alerted: chatIds.length > 0,
      });
    } catch (err) {
      console.error("[watchdog-pix-stuck] item error", err);
      results.push({ payment_id: p.payment_id, error: String(err) });
    }
  }

  // Health beat
  await supabase.from("cron_health").upsert({
    job_name: "watchdog-pix-stuck",
    last_success_at: new Date().toISOString(),
    last_run_count: results.length,
    notes: `alerts=${alertsSent} auto_recovered=${autoRecovered} took=${Date.now() - startedAt}ms`,
  });

  return new Response(
    JSON.stringify({
      checked: results.length,
      alerts_sent: alertsSent,
      auto_recovered: autoRecovered,
      results,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});