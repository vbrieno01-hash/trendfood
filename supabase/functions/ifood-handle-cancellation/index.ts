import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const IFOOD_API = "https://merchant-api.ifood.com.br";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const order_id: string | undefined = body?.order_id;
    const action: "accept" | "deny" | undefined = body?.action;
    const reason: string = String(body?.reason || "").slice(0, 500);
    const cancellationCode: string = String(body?.cancellation_code || "").slice(0, 50);

    if (!order_id || (action !== "accept" && action !== "deny")) {
      return new Response(JSON.stringify({ error: "order_id and action (accept|deny) required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: order } = await supabase.from("orders")
      .select("id, organization_id, gateway_payment_id, ifood_cancellation_requested_at")
      .eq("id", order_id).maybeSingle();
    if (!order) {
      return new Response(JSON.stringify({ error: "order not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const ifoodId = String(order.gateway_payment_id || "").startsWith("ifood:")
      ? String(order.gateway_payment_id).slice(6) : null;
    if (!ifoodId) {
      return new Response(JSON.stringify({ error: "not an iFood order" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: creds } = await supabase.from("ifood_credentials")
      .select("access_token, organization_id")
      .eq("organization_id", order.organization_id).maybeSingle();
    if (!creds?.access_token) {
      return new Response(JSON.stringify({ error: "iFood not connected" }), {
        status: 412, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const endpoint = action === "accept"
      ? `${IFOOD_API}/order/v1.0/orders/${ifoodId}/requestCancellation`
      : `${IFOOD_API}/order/v1.0/orders/${ifoodId}/denyCancellation`;

    const payload = action === "accept"
      ? { reason: reason || "Restaurante aceitou solicitação do cliente", cancellationCode: cancellationCode || "501" }
      : { reason: reason || "Pedido já em preparo" };

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${creds.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    console.log(`[ifood-handle-cancellation] ${action} → ${res.status}: ${text.slice(0, 200)}`);

    if (!res.ok) {
      const alreadyCancelled = res.status === 400 && /already cancelled/i.test(text);
      if (alreadyCancelled) {
        await supabase.from("ifood_event_log").insert({
          organization_id: order.organization_id,
          ifood_order_id: ifoodId,
          code: action === "accept" ? "OUT_CANCEL_ACCEPT_ALREADY" : "OUT_CANCEL_DENY_ALREADY",
          payload: { status: res.status, body: text.slice(0, 500) },
          internal_order_id: order_id,
          source: "outbound",
        });
        await supabase.from("orders").update({
          status: "cancelled",
          cancellation_reason: "Pedido já cancelado no iFood",
          ifood_cancellation_requested_at: null,
        }).eq("id", order_id);
        return new Response(JSON.stringify({ success: true, action, already_cancelled_at_ifood: true }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      await supabase.from("ifood_event_log").insert({
        organization_id: order.organization_id,
        ifood_order_id: ifoodId,
        code: action === "accept" ? "OUT_CANCEL_ACCEPT_FAILED" : "OUT_CANCEL_DENY_FAILED",
        payload: { status: res.status, body: text.slice(0, 500) },
        internal_order_id: order_id,
        source: "outbound",
      });
      return new Response(JSON.stringify({ error: `iFood ${res.status}: ${text}` }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase.from("ifood_event_log").insert({
      organization_id: order.organization_id,
      ifood_order_id: ifoodId,
      code: action === "accept" ? "OUT_CANCEL_ACCEPTED" : "OUT_CANCEL_DENIED",
      payload: { reason },
      internal_order_id: order_id,
      source: "outbound",
    });

    if (action === "accept") {
      await supabase.from("orders").update({
        status: "cancelled",
        cancellation_reason: reason || "Cancelamento solicitado pelo cliente (aceito)",
        ifood_cancellation_requested_at: null,
      }).eq("id", order_id);
    } else {
      // Recusou: limpa flag pra remover o alerta da Cozinha
      await supabase.from("orders").update({
        ifood_cancellation_requested_at: null,
      }).eq("id", order_id);
    }

    return new Response(JSON.stringify({ success: true, action }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[ifood-handle-cancellation] Error:", err);
    return new Response(JSON.stringify({ error: String((err as Error).message || err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});