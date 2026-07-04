// Dedicated Telegram notification for merchants on new orders.
// Isolated from admin telegram and from web push flow to avoid coupling.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/telegram";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { organization_id, order_number, event_type, stock_item_name, menu_item_name, shortage, rating, comment } =
      await req.json().catch(() => ({}));

    if (!organization_id) {
      return new Response(JSON.stringify({ ok: false, error: "organization_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const TELEGRAM_API_KEY = Deno.env.get("TELEGRAM_API_KEY");

    if (!LOVABLE_API_KEY || !TELEGRAM_API_KEY) {
      return new Response(JSON.stringify({ ok: false, error: "Telegram not configured" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch chat_id directly via REST (no SDK needed)
    const orgRes = await fetch(
      `${SUPABASE_URL}/rest/v1/organizations?id=eq.${organization_id}&select=telegram_chat_id,name`,
      {
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );
    const orgs = await orgRes.json();
    const chatId = orgs?.[0]?.telegram_chat_id;

    if (!chatId) {
      return new Response(JSON.stringify({ ok: true, skipped: "no_chat_id" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let text: string;
    if (event_type === "stock_shortage") {
      text = `⚠️ <b>Estoque insuficiente</b>\n` +
        `Faltaram <b>${shortage}</b> de <b>${stock_item_name ?? "insumo"}</b>` +
        (menu_item_name ? ` em <i>${menu_item_name}</i>` : "") +
        (order_number ? `\nPedido <b>#${order_number}</b>` : "") +
        `\n\nReponha o estoque o quanto antes para não perder vendas.`;
    } else if (event_type === "low_rating") {
      const stars = "⭐".repeat(Math.max(1, Math.min(5, Number(rating) || 1)));
      const safeComment = String(comment || "").replace(/[<>&]/g, "").slice(0, 300);
      text = `⚠️ <b>Avaliação baixa recebida</b>\n\n` +
        `${stars} (${rating}/5)\n` +
        (safeComment ? `\n💬 <i>"${safeComment}"</i>\n` : "") +
        `\nVale a pena entrar em contato com o cliente e entender o que aconteceu.`;
    } else {
      text = order_number
        ? `🔔 <b>Novo Pedido #${order_number}</b> recebido!`
        : "🔔 <b>Novo pedido recebido!</b>";
    }

    const tgRes = await fetch(`${GATEWAY_URL}/sendMessage`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": TELEGRAM_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    });

    const tgBody = await tgRes.json().catch(() => ({}));

    if (!tgRes.ok) {
      console.error("[notify-merchant-telegram] send failed:", tgBody);
      return new Response(
        JSON.stringify({ ok: false, error: tgBody?.description || "send failed" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ ok: true, sent: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[notify-merchant-telegram] error:", e);
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
