import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/telegram";

const DAY_KEYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];

function getNowBRT(): Date {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60_000;
  return new Date(utcMs + -3 * 3600_000);
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function toMinutesClose(t: string): number {
  const m = timeToMinutes(t);
  return m === 0 ? 1440 : m;
}

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

async function sendTelegram(chatId: string, text: string, lovableKey: string, telegramKey: string) {
  const res = await fetch(`${GATEWAY_URL}/sendMessage`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": telegramKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error(`Telegram send failed for ${chatId}:`, err);
  }
}

async function alreadySent(
  supabase: any,
  orgId: string,
  eventType: string,
  refDate: string
): Promise<boolean> {
  const { data } = await supabase
    .from("telegram_automations_log")
    .select("id")
    .eq("organization_id", orgId)
    .eq("event_type", eventType)
    .eq("ref_date", refDate)
    .maybeSingle();
  return !!data;
}

async function markSent(supabase: any, orgId: string, eventType: string, refDate: string) {
  await supabase.from("telegram_automations_log").insert({
    organization_id: orgId,
    event_type: eventType,
    ref_date: refDate,
  });
}

Deno.serve(async () => {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const TELEGRAM_API_KEY = Deno.env.get("TELEGRAM_API_KEY");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (!LOVABLE_API_KEY || !TELEGRAM_API_KEY) {
    return new Response(JSON.stringify({ error: "Missing keys" }), { status: 500 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const now = getNowBRT();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const dow = now.getDay(); // 0=dom
  const dayKey = DAY_KEYS[dow];
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  // Fetch all orgs with telegram configured
  const { data: orgs, error: orgsErr } = await supabase
    .from("organizations")
    .select("id, name, telegram_chat_id, business_hours")
    .not("telegram_chat_id", "is", null)
    .neq("telegram_chat_id", "");

  if (orgsErr || !orgs || orgs.length === 0) {
    return new Response(JSON.stringify({ ok: true, processed: 0 }));
  }

  let processed = 0;

  for (const org of orgs) {
    const chatId = org.telegram_chat_id;

    // ═══════════════════════════════════════════
    // 1. RESUMO DIÁRIO — 23:00 BRT
    // ═══════════════════════════════════════════
    if (currentMinutes >= 1380 && currentMinutes < 1385) {
      if (!(await alreadySent(supabase, org.id, "daily", todayStr))) {
        try {
          // Orders from today (paid)
          const dayStart = `${todayStr}T00:00:00-03:00`;
          const dayEnd = `${todayStr}T23:59:59-03:00`;

          const { data: orders } = await supabase
            .from("orders")
            .select("id, paid")
            .eq("organization_id", org.id)
            .eq("paid", true)
            .gte("created_at", dayStart)
            .lte("created_at", dayEnd);

          const orderIds = (orders || []).map((o: any) => o.id);
          const totalOrders = orderIds.length;

          let totalRevenue = 0;
          let productCounts: Record<string, number> = {};

          if (orderIds.length > 0) {
            const { data: items } = await supabase
              .from("order_items")
              .select("name, price, quantity")
              .in("order_id", orderIds);

            for (const item of items || []) {
              totalRevenue += item.price * item.quantity;
              productCounts[item.name] = (productCounts[item.name] || 0) + item.quantity;
            }
          }

          const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;
          const topProduct = Object.entries(productCounts).sort((a, b) => b[1] - a[1])[0];

          const msg = [
            `📊 <b>Resumo do dia — ${formatDate(now)}</b>`,
            "",
            `🛒 Pedidos: ${totalOrders}`,
            `💰 Faturamento: ${formatBRL(Math.round(totalRevenue * 100))}`,
            `🎫 Ticket médio: ${formatBRL(Math.round(avgTicket * 100))}`,
            topProduct ? `⭐ Mais vendido: ${topProduct[0]} (${topProduct[1]} un.)` : "",
          ]
            .filter(Boolean)
            .join("\n");

          await sendTelegram(chatId, msg, LOVABLE_API_KEY, TELEGRAM_API_KEY);
          await markSent(supabase, org.id, "daily", todayStr);
          processed++;
        } catch (e) {
          console.error(`Daily summary error for org ${org.id}:`, e);
        }
      }
    }

    // ═══════════════════════════════════════════
    // 2. RESUMO SEMANAL — domingo 23:05 BRT
    // ═══════════════════════════════════════════
    if (dow === 0 && currentMinutes >= 1385 && currentMinutes < 1390) {
      if (!(await alreadySent(supabase, org.id, "weekly", todayStr))) {
        try {
          const thisWeekStart = new Date(now);
          thisWeekStart.setDate(now.getDate() - 6);
          const thisWeekStartStr = `${thisWeekStart.getFullYear()}-${String(thisWeekStart.getMonth() + 1).padStart(2, "0")}-${String(thisWeekStart.getDate()).padStart(2, "0")}T00:00:00-03:00`;

          const prevWeekStart = new Date(now);
          prevWeekStart.setDate(now.getDate() - 13);
          const prevWeekEnd = new Date(now);
          prevWeekEnd.setDate(now.getDate() - 7);
          const prevWeekStartStr = `${prevWeekStart.getFullYear()}-${String(prevWeekStart.getMonth() + 1).padStart(2, "0")}-${String(prevWeekStart.getDate()).padStart(2, "0")}T00:00:00-03:00`;
          const prevWeekEndStr = `${prevWeekEnd.getFullYear()}-${String(prevWeekEnd.getMonth() + 1).padStart(2, "0")}-${String(prevWeekEnd.getDate()).padStart(2, "0")}T23:59:59-03:00`;

          const dayEndStr = `${todayStr}T23:59:59-03:00`;

          // This week
          const { data: thisOrders } = await supabase
            .from("orders")
            .select("id")
            .eq("organization_id", org.id)
            .eq("paid", true)
            .gte("created_at", thisWeekStartStr)
            .lte("created_at", dayEndStr);

          const thisIds = (thisOrders || []).map((o: any) => o.id);
          let thisRevenue = 0;
          if (thisIds.length > 0) {
            const { data: items } = await supabase
              .from("order_items")
              .select("price, quantity")
              .in("order_id", thisIds);
            for (const item of items || []) thisRevenue += item.price * item.quantity;
          }

          // Previous week
          const { data: prevOrders } = await supabase
            .from("orders")
            .select("id")
            .eq("organization_id", org.id)
            .eq("paid", true)
            .gte("created_at", prevWeekStartStr)
            .lte("created_at", prevWeekEndStr);

          const prevIds = (prevOrders || []).map((o: any) => o.id);
          let prevRevenue = 0;
          if (prevIds.length > 0) {
            const { data: items } = await supabase
              .from("order_items")
              .select("price, quantity")
              .in("order_id", prevIds);
            for (const item of items || []) prevRevenue += item.price * item.quantity;
          }

          const pctChange = prevRevenue > 0
            ? ((thisRevenue - prevRevenue) / prevRevenue * 100).toFixed(1)
            : null;

          const trend = pctChange !== null
            ? Number(pctChange) >= 0
              ? `📈 +${pctChange}% vs semana passada`
              : `📉 ${pctChange}% vs semana passada`
            : "📊 Sem dados da semana anterior para comparar";

          const thisAvg = thisIds.length > 0 ? thisRevenue / thisIds.length : 0;

          const msg = [
            `📊 <b>Resumo semanal — ${formatDate(now)}</b>`,
            "",
            `🛒 Pedidos: ${thisIds.length}`,
            `💰 Faturamento: ${formatBRL(Math.round(thisRevenue * 100))}`,
            `🎫 Ticket médio: ${formatBRL(Math.round(thisAvg * 100))}`,
            "",
            trend,
          ].join("\n");

          await sendTelegram(chatId, msg, LOVABLE_API_KEY, TELEGRAM_API_KEY);
          await markSent(supabase, org.id, "weekly", todayStr);
          processed++;
        } catch (e) {
          console.error(`Weekly summary error for org ${org.id}:`, e);
        }
      }
    }

    // ═══════════════════════════════════════════
    // 3. ALERTA DE ABERTURA
    // ═══════════════════════════════════════════
    const bh = org.business_hours;
    if (bh && bh.enabled && bh.schedule) {
      const todaySchedule = bh.schedule[dayKey];
      if (todaySchedule && todaySchedule.open) {
        const openMin = timeToMinutes(todaySchedule.from);
        const closeMin = toMinutesClose(todaySchedule.to);

        // Open alert: exact minute
        if (currentMinutes === openMin) {
          if (!(await alreadySent(supabase, org.id, "open", todayStr))) {
            await sendTelegram(
              chatId,
              `🟢 <b>Sua loja está aberta!</b> Boas vendas hoje.`,
              LOVABLE_API_KEY,
              TELEGRAM_API_KEY
            );
            await markSent(supabase, org.id, "open", todayStr);
            processed++;
          }
        }

        // ═══════════════════════════════════════════
        // 4. ALERTA DE FECHAMENTO — 10 min antes
        // ═══════════════════════════════════════════
        const closeAlert = closeMin - 10;
        if (closeAlert > 0 && currentMinutes === closeAlert) {
          if (!(await alreadySent(supabase, org.id, "close", todayStr))) {
            const closeTime = todaySchedule.to === "00:00" ? "00:00" : todaySchedule.to;
            await sendTelegram(
              chatId,
              `🔴 <b>Sua loja fecha em 10 minutos</b> (às ${closeTime}).`,
              LOVABLE_API_KEY,
              TELEGRAM_API_KEY
            );
            await markSent(supabase, org.id, "close", todayStr);
            processed++;
          }
        }
      }
    }
  }

  return new Response(JSON.stringify({ ok: true, processed }));
});
