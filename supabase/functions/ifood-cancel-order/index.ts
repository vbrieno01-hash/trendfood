import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const IFOOD_API = "https://merchant-api.ifood.com.br";

// Códigos oficiais iFood — cancelamento PRÉ-CFM (antes de confirmar)
const ALLOWED_CODES: Record<string, string> = {
  "501": "Problemas de sistema",
  "502": "Pedido em duplicidade",
  "503": "Item indisponível",
  "504": "Sem entregador disponível",
  "505": "Cardápio desatualizado",
  "506": "Pedido fora da área de entrega",
  "508": "Restaurante fechado",
  "509": "Outros motivos",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const order_id: string | undefined = body?.order_id;
    const code: string = String(body?.code || "");
    const reason_label: string = String(body?.reason_label || ALLOWED_CODES[code] || "").slice(0, 200);
    const force: boolean = body?.force === true;

    if (!order_id || !ALLOWED_CODES[code]) {
      return new Response(JSON.stringify({ error: "order_id e code (501..509) obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: order } = await supabase.from("orders")
      .select("id, organization_id, gateway_payment_id, status")
      .eq("id", order_id).maybeSingle();
    if (!order) {
      return new Response(JSON.stringify({ error: "Pedido não encontrado" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Idempotência
    if (order.status === "cancelled") {
      return new Response(JSON.stringify({ success: true, already: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Defesa em profundidade: por padrão só antes de confirmar.
    // Com force=true (botão antigo de cancelar), permite também preparing/ready.
    const allowedStatuses = force
      ? ["pending", "preparing", "ready", "delivered", "awaiting_payment"]
      : ["pending"];
    if (!allowedStatuses.includes(order.status)) {
      return new Response(JSON.stringify({
        error: "Cancelamento direto só é permitido antes de confirmar o pedido. Use o portal iFood.",
      }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ifoodId = String(order.gateway_payment_id || "").startsWith("ifood:")
      ? String(order.gateway_payment_id).slice(6) : null;
    if (!ifoodId) {
      return new Response(JSON.stringify({ error: "Não é um pedido iFood" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: creds } = await supabase.from("ifood_credentials")
      .select("access_token")
      .eq("organization_id", order.organization_id).maybeSingle();
    if (!creds?.access_token) {
      return new Response(JSON.stringify({ error: "iFood não está conectado" }), {
        status: 412, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const endpoint = `${IFOOD_API}/order/v1.0/orders/${ifoodId}/requestCancellation`;
    const payload = { reason: reason_label, cancellationCode: code };

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${creds.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    console.log(`[ifood-cancel-order] ${ifoodId} code=${code} → ${res.status}: ${text.slice(0, 200)}`);

    if (!res.ok) {
      // Caso especial: pedido já estava cancelado no iFood (timeout, cancel pelo cliente, etc.)
      // Tratamos como sucesso e marcamos como cancelado localmente para liberar a UI.
      const alreadyCancelled = res.status === 400 && /already cancelled|already canceled/i.test(text);
      // Com force=true, se o iFood recusar (fora da janela após CONCLUDED, etc.),
      // ainda assim marcamos como cancelado localmente para destravar a tela.
      const forceLocalCancel = force && res.status >= 400 && res.status < 500;
      if (alreadyCancelled || forceLocalCancel) {
        await supabase.from("ifood_event_log").insert({
          organization_id: order.organization_id,
          ifood_order_id: ifoodId,
          code: alreadyCancelled ? "OUT_MERCHANT_CANCEL_ALREADY" : "OUT_MERCHANT_CANCEL_FORCED_LOCAL",
          payload: { code, reason_label, status: res.status, body: text.slice(0, 500) },
          internal_order_id: order_id,
          source: "outbound",
        });
        await supabase.from("orders").update({
          status: "cancelled",
          cancellation_reason: alreadyCancelled
            ? `[${code}] ${reason_label} (já cancelado no iFood)`
            : `[${code}] ${reason_label} (cancelado localmente — iFood recusou: ${res.status})`,
        }).eq("id", order_id);
        return new Response(JSON.stringify({
          success: true,
          already_cancelled_at_ifood: alreadyCancelled,
          forced_local: !alreadyCancelled,
        }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      await supabase.from("ifood_event_log").insert({
        organization_id: order.organization_id,
        ifood_order_id: ifoodId,
        code: "OUT_MERCHANT_CANCEL_FAILED",
        payload: { status: res.status, body: text.slice(0, 500), code, reason_label },
        internal_order_id: order_id,
        source: "outbound",
      });
      return new Response(JSON.stringify({ error: `iFood ${res.status}: ${text.slice(0, 300)}` }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase.from("ifood_event_log").insert({
      organization_id: order.organization_id,
      ifood_order_id: ifoodId,
      code: "OUT_MERCHANT_CANCEL_OK",
      payload: { code, reason_label },
      internal_order_id: order_id,
      source: "outbound",
    });

    await supabase.from("orders").update({
      status: "cancelled",
      cancellation_reason: `[${code}] ${reason_label}`,
    }).eq("id", order_id);

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[ifood-cancel-order] Error:", err);
    return new Response(JSON.stringify({ error: String((err as Error).message || err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});