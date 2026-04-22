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
    const body = await req.json().catch(() => ({}));
    const { chat_id, organization_id, action } = body ?? {};

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const TELEGRAM_API_KEY = Deno.env.get("TELEGRAM_API_KEY");

    if (!LOVABLE_API_KEY || !TELEGRAM_API_KEY) {
      return new Response(JSON.stringify({ ok: false, error: "Telegram não configurado na plataforma" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: bot_info → retorna username/nome do bot via getMe
    if (action === "bot_info") {
      const meRes = await fetch(`${GATEWAY_URL}/getMe`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "X-Connection-Api-Key": TELEGRAM_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });
      const meData = await meRes.json().catch(() => ({}));
      if (!meRes.ok || !meData?.result) {
        return new Response(JSON.stringify({ ok: false, error: "Não foi possível obter info do bot" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(
        JSON.stringify({
          ok: true,
          username: meData.result.username,
          first_name: meData.result.first_name,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!chat_id || !organization_id) {
      return new Response(JSON.stringify({ ok: false, error: "chat_id e organization_id obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch(`${GATEWAY_URL}/sendMessage`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": TELEGRAM_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id,
        text: "✅ Conexão com Telegram funcionando! Você receberá notificações de novos pedidos aqui.",
        parse_mode: "HTML",
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error("Telegram API error:", data);
      const tgError: string = data?.description || data?.error || JSON.stringify(data);
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Falha ao enviar mensagem",
          telegram_error: tgError,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ ok: true, success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
