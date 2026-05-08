import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/telegram";

function fmtBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch { return iso; }
}

async function sendTelegram(chatId: string, text: string) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const TELEGRAM_API_KEY = Deno.env.get("TELEGRAM_API_KEY");
  if (!LOVABLE_API_KEY || !TELEGRAM_API_KEY) {
    throw new Error("Telegram credentials not configured");
  }
  const r = await fetch(`${GATEWAY_URL}/sendMessage`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": TELEGRAM_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(`Telegram ${r.status}: ${JSON.stringify(data)}`);
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { event_type, affiliate_id, commission_id, organization_id, test_chat_id } = body;

    // Test mode (sem persistir nada)
    if (event_type === "test") {
      const chatId = test_chat_id || body.chat_id;
      if (!chatId) throw new Error("test_chat_id obrigatório");
      await sendTelegram(String(chatId), "✅ <b>Teste Trend Food</b>\n\nSeu Telegram está conectado e pronto pra receber notificações de comissão!");
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: affiliate } = await supabase
      .from("affiliates")
      .select("id, name, telegram_chat_id")
      .eq("id", affiliate_id)
      .maybeSingle();

    if (!affiliate?.telegram_chat_id) {
      console.log("[notify-affiliate] sem telegram_chat_id, ignorando");
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let commission: any = null;
    if (commission_id) {
      const { data } = await supabase
        .from("affiliate_commissions")
        .select("id, amount_paid_cents, commission_cents, commission_pct, billing_cycle, release_at, status, created_at, organization_id")
        .eq("id", commission_id)
        .maybeSingle();
      commission = data;
    }
    if (event_type !== "new_signup" && !commission) throw new Error("commission not found");

    const orgId = commission?.organization_id || organization_id;
    const { data: org } = await supabase
      .from("organizations")
      .select("id, name, slug, created_at, subscription_plan")
      .eq("id", orgId)
      .maybeSingle();

    // Conta lojas ativas do afiliado
    const { count: activeStores } = await supabase
      .from("organizations")
      .select("id", { count: "exact", head: true })
      .eq("affiliate_id", affiliate_id);

    // Total pendente de pagamento (released, ainda não paid)
    const { data: pendingPayout } = await supabase
      .from("affiliate_commissions")
      .select("commission_cents")
      .eq("affiliate_id", affiliate_id)
      .eq("status", "released");
    const totalReleased = (pendingPayout || []).reduce((s, c: any) => s + (c.commission_cents || 0), 0);

    let msg = "";
    if (event_type === "new_signup") {
      msg = `🎉 <b>Nova loja cadastrada pelo seu link!</b>\n\n` +
        `🏪 Loja: <b>${org?.name || "—"}</b>\n` +
        `📅 Cadastrou: ${fmtDate(org?.created_at || new Date().toISOString())}\n` +
        `📊 Suas lojas indicadas: <b>${activeStores || 0}</b>\n\n` +
        `💡 Quando ela assinar o Pro, você recebe <b>50% do 1º mês</b> como comissão.`;
    } else if (event_type === "new_payment") {
      msg = `💰 <b>Novo pagamento do seu indicado!</b>\n\n` +
        `🏪 Loja: <b>${org?.name || "—"}</b>\n` +
        `📅 Cadastrou: ${fmtDate(org?.created_at || commission.created_at)}\n` +
        `💳 Pagou: ${fmtBRL(commission.amount_paid_cents)} (${commission.billing_cycle || "mensal"})\n` +
        `🎯 Comissão (${commission.commission_pct}%): <b>${fmtBRL(commission.commission_cents)}</b>\n` +
        `⏳ Liberação em: <b>${fmtDate(commission.release_at)}</b> (após 7 dias de proteção contra reembolso)\n` +
        `📊 Suas lojas ativas: <b>${activeStores || 0}</b>`;
    } else if (event_type === "released") {
      msg = `✅ <b>Dinheiro liberado!</b>\n\n` +
        `🏪 Loja: <b>${org?.name || "—"}</b>\n` +
        `💵 Comissão liberada: <b>${fmtBRL(commission.commission_cents)}</b>\n` +
        `💼 Total disponível pra pagamento: <b>${fmtBRL(totalReleased)}</b>`;
    } else if (event_type === "refunded") {
      msg = `⚠️ <b>Reembolso processado</b>\n\n` +
        `🏪 Loja: <b>${org?.name || "—"}</b>\n` +
        `❌ Comissão de ${fmtBRL(commission.commission_cents)} cancelada (cliente solicitou reembolso).`;
    } else {
      throw new Error(`event_type desconhecido: ${event_type}`);
    }

    await sendTelegram(affiliate.telegram_chat_id, msg);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[notify-affiliate-telegram] erro:", err);
    return new Response(JSON.stringify({ error: String((err as Error).message || err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});