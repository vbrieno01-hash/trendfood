import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/telegram";

function fmtBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
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

function periodKey(date = new Date()): string {
  // Pagamento dia 5 → cobre mês anterior (parcial). Usa "YYYY-MM" do mês corrente.
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const period = periodKey();
    const now = new Date().toISOString();

    // 1) Garante batch único do período
    const { data: existingBatch } = await supabase
      .from("affiliate_payout_batches")
      .select("id, status")
      .eq("period_month", period)
      .maybeSingle();

    if ((existingBatch as any)?.status === "paid") {
      return new Response(JSON.stringify({ ok: true, skipped: "already_paid", period }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let batchId: string;
    if (existingBatch) {
      batchId = (existingBatch as any).id;
    } else {
      const { data: nb, error: nbErr } = await supabase
        .from("affiliate_payout_batches")
        .insert({ period_month: period, status: "pending" })
        .select("id")
        .single();
      if (nbErr) throw nbErr;
      batchId = (nb as any).id;
    }

    // 2) Pega parcelas liberadas (release_at <= now) ainda não pagas
    //    Primeiro libera as pending vencidas → released
    await supabase
      .from("affiliate_commissions")
      .update({ status: "released", released_at: now })
      .eq("status", "pending")
      .lte("release_at", now);

    const { data: ready } = await supabase
      .from("affiliate_commissions")
      .select("id, affiliate_id, organization_id, commission_cents, goal_id, installment_index")
      .eq("status", "released")
      .is("paid_in_batch_id", null)
      .limit(2000);

    if (!ready?.length) {
      return new Response(JSON.stringify({ ok: true, batch_id: batchId, period, paid: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3) Agrupa por afiliado
    const byAff = new Map<string, { commissions: any[]; total: number }>();
    for (const r of ready as any[]) {
      if (!byAff.has(r.affiliate_id)) byAff.set(r.affiliate_id, { commissions: [], total: 0 });
      const slot = byAff.get(r.affiliate_id)!;
      slot.commissions.push(r);
      slot.total += r.commission_cents;
    }

    // 4) Carrega dados dos afiliados + orgs para mensagens
    const affIds = Array.from(byAff.keys());
    const { data: affs } = await supabase
      .from("affiliates")
      .select("id, name, telegram_chat_id, pix_key")
      .in("id", affIds);
    const affMap = new Map((affs || []).map((a: any) => [a.id, a]));

    const orgIds = Array.from(new Set((ready as any[]).map(r => r.organization_id)));
    const { data: orgs } = await supabase.from("organizations").select("id, name").in("id", orgIds);
    const orgMap = new Map((orgs || []).map((o: any) => [o.id, o.name]));

    // 5) Marca como pagas + atualiza progresso das metas + monta CSV
    const csvLines = ["chave_pix,afiliado,valor_brl,parcelas"];
    let totalAll = 0;
    let commissionCount = 0;

    for (const [affId, slot] of byAff.entries()) {
      const aff: any = affMap.get(affId);
      const ids = slot.commissions.map(c => c.id);
      await supabase
        .from("affiliate_commissions")
        .update({ status: "paid", paid_at: now, paid_in_batch_id: batchId })
        .in("id", ids);

      // Atualiza progresso de cada goal afetada
      const goalCounts = new Map<string, number>();
      for (const c of slot.commissions) {
        if (c.goal_id) goalCounts.set(c.goal_id, (goalCounts.get(c.goal_id) || 0) + 1);
      }
      for (const [goalId, count] of goalCounts.entries()) {
        const { data: g } = await supabase
          .from("affiliate_client_goals")
          .select("installments_paid, installments_total, client_org_id, affiliate_id, total_commission_cents")
          .eq("id", goalId)
          .maybeSingle();
        if (!g) continue;
        const newPaid = (g as any).installments_paid + count;
        const completed = newPaid >= (g as any).installments_total;
        await supabase
          .from("affiliate_client_goals")
          .update({
            installments_paid: newPaid,
            status: completed ? "completed" : "active",
            completed_at: completed ? now : null,
          })
          .eq("id", goalId);

        if (completed && aff?.telegram_chat_id) {
          const orgName = orgMap.get((g as any).client_org_id) || "—";
          await sendTg(aff.telegram_chat_id, `🎯 <b>Meta concluída!</b>\n\n🏪 ${orgName}\n💵 Total recebido: <b>${fmtBRL((g as any).total_commission_cents)}</b>\n\nBora trazer mais clientes! 🚀`);
        }
      }

      totalAll += slot.total;
      commissionCount += slot.commissions.length;
      const pixKey = aff?.pix_key || "(sem PIX)";
      const name = aff?.name || affId;
      csvLines.push(`"${pixKey}","${name}","${(slot.total/100).toFixed(2)}",${slot.commissions.length}`);

      // Notifica afiliado
      if (aff?.telegram_chat_id) {
        const detail = slot.commissions
          .slice(0, 15)
          .map(c => `• ${orgMap.get(c.organization_id) || "—"} — ${fmtBRL(c.commission_cents)}`)
          .join("\n");
        const extra = slot.commissions.length > 15 ? `\n…e mais ${slot.commissions.length - 15}` : "";
        await sendTg(aff.telegram_chat_id, `💸 <b>Pagamento de ${period} — ${fmtBRL(slot.total)}</b>\n\n${detail}${extra}\n\n📲 PIX: <code>${pixKey}</code>`);
      }
    }

    // 6) Atualiza batch
    await supabase
      .from("affiliate_payout_batches")
      .update({
        total_cents: totalAll,
        affiliate_count: byAff.size,
        commission_count: commissionCount,
        csv_data: csvLines.join("\n"),
        status: "pending",
      })
      .eq("id", batchId);

    // 7) Notifica admin
    try {
      await supabase.functions.invoke("admin-telegram-notify", {
        body: {
          event_type: "affiliate_payout_ready",
          payload: {
            period,
            total: fmtBRL(totalAll),
            affiliate_count: byAff.size,
            commission_count: commissionCount,
            csv_preview: csvLines.slice(0, 6).join("\n"),
          },
        },
      });
    } catch (e) {
      console.error("[affiliate-monthly-payout] admin notify err:", e);
    }

    return new Response(JSON.stringify({
      ok: true,
      batch_id: batchId,
      period,
      affiliate_count: byAff.size,
      commission_count: commissionCount,
      total_cents: totalAll,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[affiliate-monthly-payout] erro:", err);
    return new Response(JSON.stringify({ error: String((err as Error).message || err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});