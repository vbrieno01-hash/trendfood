import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/telegram";

function fmtBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch { return String(iso); }
}

// ── Rate limit: máx 20 comandos por minuto por chat_id ──
async function checkRateLimit(
  supabase: ReturnType<typeof createClient>,
  chatId: string,
): Promise<boolean> {
  const since = new Date(Date.now() - 60_000).toISOString();
  const { count } = await (supabase.from("telegram_audit_log") as any)
    .select("id", { count: "exact", head: true })
    .eq("chat_id", chatId)
    .gte("created_at", since);
  return (count ?? 0) < 20;
}

async function audit(
  supabase: ReturnType<typeof createClient>,
  entry: {
    chat_id: string;
    command?: string | null;
    update_type: string;
    organization_id?: string | null;
    affiliate_id?: string | null;
    rate_limited?: boolean;
  },
) {
  try {
    await (supabase.from("telegram_audit_log") as any).insert(entry);
  } catch (e) {
    console.warn("[telegram-audit] insert failed", e);
  }
}

async function tg(method: string, payload: Record<string, unknown>) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const TELEGRAM_API_KEY = Deno.env.get("TELEGRAM_API_KEY");
  if (!LOVABLE_API_KEY || !TELEGRAM_API_KEY) throw new Error("Telegram creds missing");
  const r = await fetch(`${GATEWAY_URL}/${method}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": TELEGRAM_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const data = await r.json();
  if (!r.ok) console.error(`[telegram-affiliate-webhook] tg ${method} ${r.status}`, data);
  return data;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

async function applyChoice(
  supabase: ReturnType<typeof createClient>,
  goalId: string,
  mode: "upfront" | "installments_3x",
) {
  const { data: goal, error: gErr } = await supabase
    .from("affiliate_client_goals")
    .select("*")
    .eq("id", goalId)
    .maybeSingle();
  if (gErr || !goal) throw new Error("Meta não encontrada");
  if ((goal as any).status !== "awaiting_choice") {
    return { goal, alreadyChosen: true };
  }

  const paidAt = new Date((goal as any).client_paid_at);
  const amountCents = (goal as any).client_amount_cents;

  let totalCommissionCents: number;
  let installmentsTotal: number;
  const installments: Array<{ index: number; cents: number; release_at: string }> = [];

  if (mode === "upfront") {
    const pct = Number((goal as any).tier_upfront_pct);
    totalCommissionCents = Math.round(amountCents * pct / 100);
    installmentsTotal = 1;
    installments.push({
      index: 1,
      cents: totalCommissionCents,
      release_at: addDays(paidAt, 7).toISOString(),
    });
  } else {
    const pct = Number((goal as any).tier_installment_pct);
    const monthlyCents = Math.round(amountCents * pct / 100);
    totalCommissionCents = monthlyCents * 3;
    installmentsTotal = 3;
    for (let i = 1; i <= 3; i++) {
      installments.push({
        index: i,
        cents: monthlyCents,
        release_at: addDays(paidAt, 30 * i).toISOString(),
      });
    }
  }

  await supabase
    .from("affiliate_client_goals")
    .update({
      mode,
      total_commission_cents: totalCommissionCents,
      installments_total: installmentsTotal,
      installments_paid: 0,
      next_release_at: installments[0].release_at,
      status: "active",
    })
    .eq("id", goalId);

  // Cria as parcelas em affiliate_commissions
  const pct = mode === "upfront"
    ? Number((goal as any).tier_upfront_pct)
    : Number((goal as any).tier_installment_pct);

  for (const inst of installments) {
    await supabase.from("affiliate_commissions").insert({
      affiliate_id: (goal as any).affiliate_id,
      organization_id: (goal as any).client_org_id,
      payment_id: inst.index === 1 ? (goal as any).source_payment_id : `${(goal as any).source_payment_id || goalId}-i${inst.index}`,
      amount_paid_cents: amountCents,
      commission_cents: inst.cents,
      commission_pct: pct,
      billing_cycle: (goal as any).cycle,
      status: "pending",
      release_at: inst.release_at,
      goal_id: goalId,
      installment_index: inst.index,
      notes: mode === "upfront" ? "À Vista (única)" : `Parcela ${inst.index}/3`,
    });
  }

  return { goal: { ...(goal as any), mode, total_commission_cents: totalCommissionCents, installments_total: installmentsTotal }, alreadyChosen: false, installments };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // ── Segurança: valida secret_token do Telegram (SHA-256 do TELEGRAM_API_KEY) ──
    // Bloqueia qualquer POST forjado — só o Telegram, que registramos com esse
    // secret via setWebhook, envia o header correto. Comparação em tempo constante.
    const TELEGRAM_API_KEY = Deno.env.get("TELEGRAM_API_KEY");
    if (!TELEGRAM_API_KEY) {
      console.error("[telegram-affiliate-webhook] TELEGRAM_API_KEY missing");
      return new Response("Service Unavailable", { status: 503, headers: corsHeaders });
    }
    const expectedSecretBytes = new Uint8Array(
      await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(`telegram-webhook:${TELEGRAM_API_KEY}`),
      ),
    );
    const expectedSecret = btoa(String.fromCharCode(...expectedSecretBytes))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
    const actualSecret = req.headers.get("X-Telegram-Bot-Api-Secret-Token") ?? "";
    let diff = actualSecret.length ^ expectedSecret.length;
    for (let i = 0; i < Math.min(actualSecret.length, expectedSecret.length); i++) {
      diff |= actualSecret.charCodeAt(i) ^ expectedSecret.charCodeAt(i);
    }
    if (diff !== 0) {
      console.warn("[telegram-affiliate-webhook] rejected: invalid secret_token");
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }

    const update = await req.json();
    console.log("[telegram-affiliate-webhook] update:", JSON.stringify(update).slice(0, 500));

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ── Callback query: clique no botão da escolha ──
    const cq = update.callback_query;
    if (cq?.data) {
      const data = String(cq.data);
      const chatId = cq.message?.chat?.id;
      const messageId = cq.message?.message_id;
      const callbackId = cq.id;

      // formato: aff:choice:<goal_id>:<upfront|3x>
      const m = data.match(/^aff:choice:([0-9a-f-]+):(upfront|3x)$/);
      if (!m) {
        await tg("answerCallbackQuery", { callback_query_id: callbackId, text: "Comando inválido" });
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const [, goalId, choiceRaw] = m;
      const mode = choiceRaw === "upfront" ? "upfront" : "installments_3x";

      try {
        const { goal, alreadyChosen, installments } = await applyChoice(supabase, goalId, mode);
        const g: any = goal;

        if (alreadyChosen) {
          await tg("answerCallbackQuery", { callback_query_id: callbackId, text: "Você já tinha escolhido essa meta." });
        } else {
          await tg("answerCallbackQuery", { callback_query_id: callbackId, text: "✅ Escolha registrada!" });

          let confirmText = "";
          if (mode === "upfront") {
            confirmText = `✅ <b>À Vista</b> escolhido\n\n` +
              `💰 Comissão: <b>${fmtBRL(g.total_commission_cents)}</b>\n` +
              `⏳ Libera em: <b>${fmtDate(installments?.[0]?.release_at)}</b>\n\n` +
              `🎯 Após o pagamento, essa meta é encerrada.`;
          } else {
            const monthly = Math.round(g.total_commission_cents / 3);
            confirmText = `✅ <b>3x mensal</b> escolhido\n\n` +
              `💰 Total: <b>${fmtBRL(g.total_commission_cents)}</b> (${fmtBRL(monthly)}/mês)\n` +
              `📅 Parcela 1/3 libera: <b>${fmtDate(installments?.[0]?.release_at)}</b>\n` +
              `📅 Parcela 2/3 libera: <b>${fmtDate(installments?.[1]?.release_at)}</b>\n` +
              `📅 Parcela 3/3 libera: <b>${fmtDate(installments?.[2]?.release_at)}</b>\n\n` +
              `🎯 Após a 3ª, a meta é encerrada.`;
          }

          if (chatId && messageId) {
            await tg("editMessageReplyMarkup", { chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: [] } });
            await tg("sendMessage", { chat_id: chatId, text: confirmText, parse_mode: "HTML" });
          }
        }
      } catch (e: any) {
        console.error("[telegram-affiliate-webhook] applyChoice err:", e);
        await tg("answerCallbackQuery", { callback_query_id: callbackId, text: "Erro: " + (e.message || "interno"), show_alert: true });
      }

      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── /metas command ──
    const msg = update.message;
    if (msg?.text) {
      const text = String(msg.text).trim().toLowerCase();
      const chatId = msg.chat?.id;
      if (!chatId) return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

      // ── Rate limit (20/min por chat) ──
      const allowed = await checkRateLimit(supabase, String(chatId));
      if (!allowed) {
        await audit(supabase, { chat_id: String(chatId), command: text.slice(0, 32), update_type: "message", rate_limited: true });
        await tg("sendMessage", { chat_id: chatId, text: "⏳ Muitos comandos em pouco tempo. Aguarde 1 minuto." });
        return new Response(JSON.stringify({ ok: true, rate_limited: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // ── Owner commands (organizations.telegram_chat_id) ──
      const { data: ownerOrg } = await (supabase
        .from("organizations") as any)
        .select("id, name, subscription_plan")
        .eq("telegram_chat_id", String(chatId))
        .maybeSingle();

      if (ownerOrg && (text === "/start" || text === "/help" || text === "/ajuda" || text === "/status" || text === "/vendas" || text === "/pedidos")) {
        await audit(supabase, { chat_id: String(chatId), command: text, update_type: "message", organization_id: (ownerOrg as any).id });
        const orgId = (ownerOrg as any).id as string;
        const orgName = (ownerOrg as any).name as string;

        if (text === "/start" || text === "/help" || text === "/ajuda") {
          const body = `👋 Olá, <b>${orgName}</b>!\n\n` +
            `Comandos disponíveis:\n` +
            `• /status — resumo de hoje\n` +
            `• /vendas — últimos 7 dias\n` +
            `• /pedidos — pedidos em aberto\n` +
            `• /ajuda — esta mensagem`;
          await tg("sendMessage", { chat_id: chatId, text: body, parse_mode: "HTML" });
          return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        const now = new Date();
        const nowBRT = new Date(now.getTime() - 3 * 3600_000);
        const y = nowBRT.getUTCFullYear();
        const m = String(nowBRT.getUTCMonth() + 1).padStart(2, "0");
        const d = String(nowBRT.getUTCDate()).padStart(2, "0");
        const todayStart = `${y}-${m}-${d}T00:00:00-03:00`;
        const todayEnd = `${y}-${m}-${d}T23:59:59-03:00`;

        if (text === "/status") {
          const { data: orders } = await (supabase.from("orders") as any)
            .select("id")
            .eq("organization_id", orgId).eq("paid", true)
            .gte("created_at", todayStart).lte("created_at", todayEnd);
          const ids = (orders || []).map((o: any) => o.id);
          let revenue = 0;
          if (ids.length) {
            const { data: items } = await (supabase.from("order_items") as any)
              .select("price, quantity").in("order_id", ids);
            for (const it of items || []) revenue += Number(it.price) * Number(it.quantity);
          }
          const avg = ids.length ? revenue / ids.length : 0;
          const body = `📊 <b>Hoje</b>\n\n` +
            `🛒 Pedidos: ${ids.length}\n` +
            `💰 Faturamento: ${fmtBRL(Math.round(revenue * 100))}\n` +
            `🎫 Ticket médio: ${fmtBRL(Math.round(avg * 100))}`;
          await tg("sendMessage", { chat_id: chatId, text: body, parse_mode: "HTML" });
          return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        if (text === "/vendas") {
          const start = new Date(nowBRT);
          start.setUTCDate(start.getUTCDate() - 6);
          const sy = start.getUTCFullYear();
          const sm = String(start.getUTCMonth() + 1).padStart(2, "0");
          const sd = String(start.getUTCDate()).padStart(2, "0");
          const weekStart = `${sy}-${sm}-${sd}T00:00:00-03:00`;
          const { data: orders } = await (supabase.from("orders") as any)
            .select("id").eq("organization_id", orgId).eq("paid", true)
            .gte("created_at", weekStart).lte("created_at", todayEnd);
          const ids = (orders || []).map((o: any) => o.id);
          let revenue = 0;
          if (ids.length) {
            const { data: items } = await (supabase.from("order_items") as any)
              .select("price, quantity").in("order_id", ids);
            for (const it of items || []) revenue += Number(it.price) * Number(it.quantity);
          }
          const avg = ids.length ? revenue / ids.length : 0;
          const body = `📈 <b>Últimos 7 dias</b>\n\n` +
            `🛒 Pedidos: ${ids.length}\n` +
            `💰 Faturamento: ${fmtBRL(Math.round(revenue * 100))}\n` +
            `🎫 Ticket médio: ${fmtBRL(Math.round(avg * 100))}`;
          await tg("sendMessage", { chat_id: chatId, text: body, parse_mode: "HTML" });
          return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        if (text === "/pedidos") {
          const { data: orders } = await (supabase.from("orders") as any)
            .select("order_number, status, total, created_at")
            .eq("organization_id", orgId)
            .in("status", ["pending", "preparing", "ready"])
            .order("created_at", { ascending: false })
            .limit(10);
          if (!orders?.length) {
            await tg("sendMessage", { chat_id: chatId, text: "📭 Nenhum pedido em aberto." });
            return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
          }
          const statusLabel: Record<string, string> = { pending: "⏳ Pendente", preparing: "👨‍🍳 Preparando", ready: "✅ Pronto" };
          let body = `📋 <b>Pedidos em aberto (${orders.length})</b>\n\n`;
          for (const o of orders as any[]) {
            body += `#${o.order_number} · ${statusLabel[o.status] || o.status} · ${fmtBRL(Math.round(Number(o.total || 0) * 100))}\n`;
          }
          await tg("sendMessage", { chat_id: chatId, text: body, parse_mode: "HTML" });
          return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      }

      if (text === "/metas" || text === "/start") {
        const { data: aff } = await supabase
          .from("affiliates")
          .select("id, name")
          .eq("telegram_chat_id", String(chatId))
          .maybeSingle();

        if (!aff) {
          await audit(supabase, { chat_id: String(chatId), command: text, update_type: "message" });
          await tg("sendMessage", { chat_id: chatId, text: `🤖 Olá!\n\nSeu chat_id <code>${chatId}</code> ainda não está vinculado a um afiliado. Peça pro admin cadastrar.`, parse_mode: "HTML" });
          return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        await audit(supabase, { chat_id: String(chatId), command: text, update_type: "message", affiliate_id: (aff as any).id });

        if (text === "/start") {
          await tg("sendMessage", { chat_id: chatId, text: `👋 Olá, <b>${(aff as any).name}</b>!\n\nVocê receberá aqui notificações de novos clientes e pagamentos.\n\nUse /metas para ver suas metas ativas.`, parse_mode: "HTML" });
          return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        const { data: goals } = await supabase
          .from("affiliate_client_goals")
          .select("id, client_org_id, mode, status, total_commission_cents, installments_total, installments_paid, next_release_at, choice_deadline_at, plan_key, cycle")
          .eq("affiliate_id", (aff as any).id)
          .in("status", ["awaiting_choice", "active"])
          .order("created_at", { ascending: false })
          .limit(20);

        if (!goals?.length) {
          await tg("sendMessage", { chat_id: chatId, text: "📭 Sem metas ativas no momento.\n\nBora indicar mais lojas! 🚀" });
          return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        const orgIds = (goals as any[]).map(g => g.client_org_id);
        const { data: orgs } = await supabase.from("organizations").select("id, name").in("id", orgIds);
        const orgMap = new Map((orgs || []).map((o: any) => [o.id, o.name]));

        let body = `🎯 <b>Suas metas ativas</b>\n\n`;
        for (const g of goals as any[]) {
          const orgName = orgMap.get(g.client_org_id) || "—";
          if (g.status === "awaiting_choice") {
            body += `⏰ <b>${orgName}</b> — aguardando escolha (até ${fmtDate(g.choice_deadline_at)})\n\n`;
          } else {
            const modeLabel = g.mode === "upfront" ? "À Vista" : "3x";
            const progress = g.mode === "upfront"
              ? (g.installments_paid >= 1 ? "concluída" : "pendente")
              : `${g.installments_paid}/${g.installments_total}`;
            body += `📦 <b>${orgName}</b> (${modeLabel}, ${progress})\n` +
              `   💰 ${fmtBRL(g.total_commission_cents)} · próx: ${fmtDate(g.next_release_at)}\n\n`;
          }
        }
        await tg("sendMessage", { chat_id: chatId, text: body, parse_mode: "HTML" });
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // ── Fallback: comando não reconhecido ou chat não vinculado ──
      if (text.startsWith("/")) {
        await audit(supabase, { chat_id: String(chatId), command: text.slice(0, 32), update_type: "message" });
        const body =
          `🤖 Olá! Seu <b>chat_id</b>: <code>${chatId}</code>\n\n` +
          `Este chat ainda não está vinculado.\n\n` +
          `• <b>Dono de loja:</b> cole esse ID em Dashboard → Configurações → Telegram e salve.\n` +
          `• <b>Afiliado:</b> peça pro admin cadastrar seu chat_id.\n\n` +
          `Depois de vincular, envie /ajuda de novo.`;
        await tg("sendMessage", { chat_id: chatId, text: body, parse_mode: "HTML" });
        return new Response(JSON.stringify({ ok: true, unlinked: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    return new Response(JSON.stringify({ ok: true, ignored: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[telegram-affiliate-webhook] erro:", err);
    return new Response(JSON.stringify({ error: String((err as Error).message || err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});