import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/telegram";

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

async function sendTg(chatId: string, text: string) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const TELEGRAM_API_KEY = Deno.env.get("TELEGRAM_API_KEY");
  if (!LOVABLE_API_KEY || !TELEGRAM_API_KEY) return;
  await fetch(`${GATEWAY_URL}/sendMessage`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": TELEGRAM_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  }).catch(() => {});
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: expired } = await supabase
      .from("affiliate_client_goals")
      .select("*")
      .eq("status", "awaiting_choice")
      .lte("choice_deadline_at", new Date().toISOString())
      .limit(100);

    if (!expired?.length) {
      return new Response(JSON.stringify({ ok: true, forced: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let forced = 0;
    for (const g of expired as any[]) {
      const pct = Number(g.tier_upfront_pct);
      const totalCents = Math.round(g.client_amount_cents * pct / 100);
      const releaseAt = addDays(new Date(g.client_paid_at), 7).toISOString();

      await supabase
        .from("affiliate_client_goals")
        .update({
          mode: "upfront",
          total_commission_cents: totalCents,
          installments_total: 1,
          installments_paid: 0,
          next_release_at: releaseAt,
          status: "active",
        })
        .eq("id", g.id);

      await supabase.from("affiliate_commissions").insert({
        affiliate_id: g.affiliate_id,
        organization_id: g.client_org_id,
        payment_id: g.source_payment_id,
        amount_paid_cents: g.client_amount_cents,
        commission_cents: totalCents,
        commission_pct: pct,
        billing_cycle: g.cycle,
        status: "pending",
        release_at: releaseAt,
        goal_id: g.id,
        installment_index: 1,
        notes: "Auto-escolha: À Vista (48h sem resposta)",
      });

      // Notifica afiliado
      const { data: aff } = await supabase
        .from("affiliates")
        .select("telegram_chat_id, name")
        .eq("id", g.affiliate_id)
        .maybeSingle();
      if ((aff as any)?.telegram_chat_id) {
        const { data: org } = await supabase.from("organizations").select("name").eq("id", g.client_org_id).maybeSingle();
        const orgName = (org as any)?.name || "—";
        const text = `⏰ <b>Tempo esgotado — modo À Vista aplicado</b>\n\n` +
          `🏪 ${orgName}\n` +
          `💰 Comissão: <b>${(totalCents/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</b>\n` +
          `📅 Libera em 7 dias após o pagamento do cliente.`;
        await sendTg((aff as any).telegram_chat_id, text);
      }
      forced++;
    }

    return new Response(JSON.stringify({ ok: true, forced }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[affiliate-auto-choose] erro:", err);
    return new Response(JSON.stringify({ error: String((err as Error).message || err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});