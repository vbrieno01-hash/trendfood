// Reconcilia pedidos PIX travados em awaiting_payment.
// Chamado a cada 30s pelo pg_cron. Verifica no gateway se o pagamento foi aprovado;
// se sim, promove o pedido para 'pending' (a trigger cuida das mensagens de WhatsApp).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function isPaid(provider: string, token: string, paymentId: string): Promise<boolean> {
  try {
    if (provider === "mercadopago") {
      const r = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      return d.status === "approved";
    }
    if (provider === "pagseguro") {
      const r = await fetch(`https://api.pagseguro.com/instant-payments/cob/${paymentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      return d.status === "CONCLUIDA";
    }
    if (provider === "asaas") {
      const r = await fetch(`https://api.asaas.com/v3/payments/${paymentId}`, {
        headers: { access_token: token },
      });
      const d = await r.json();
      return d.status === "RECEIVED" || d.status === "CONFIRMED";
    }
    if (provider === "openpix") {
      const r = await fetch(`https://api.openpix.com.br/api/v1/charge/${paymentId}`, {
        headers: { Authorization: token },
      });
      const d = await r.json();
      return d.charge?.status === "COMPLETED";
    }
    if (provider === "efi") {
      const [clientId, clientSecret] = token.split(":");
      if (!clientId || !clientSecret) return false;
      const authR = await fetch("https://pix.api.efipay.com.br/oauth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
        },
        body: JSON.stringify({ grant_type: "client_credentials" }),
      });
      const authD = await authR.json();
      if (!authR.ok) return false;
      const r = await fetch(`https://pix.api.efipay.com.br/v2/cob/${paymentId}`, {
        headers: { Authorization: `Bearer ${authD.access_token}` },
      });
      const d = await r.json();
      return d.status === "CONCLUIDA";
    }
  } catch (e) {
    console.error("[reconcile] check error", provider, paymentId, e);
  }
  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Busca pedidos travados nos últimos 30 min com gateway_payment_id preenchido.
  const { data: orders, error } = await supabase
    .from("orders")
    .select("id, organization_id, gateway_payment_id, created_at")
    .eq("status", "awaiting_payment")
    .not("gateway_payment_id", "is", null)
    .gt("created_at", new Date(Date.now() - 30 * 60 * 1000).toISOString())
    .limit(100);

  if (error) {
    console.error("[reconcile] query error", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!orders || orders.length === 0) {
    return new Response(JSON.stringify({ checked: 0, paid: 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Agrupa por organização para reaproveitar credenciais.
  const byOrg = new Map<string, typeof orders>();
  for (const o of orders) {
    const arr = byOrg.get(o.organization_id) ?? [];
    arr.push(o);
    byOrg.set(o.organization_id, arr);
  }

  let checked = 0;
  let paidCount = 0;

  for (const [orgId, list] of byOrg) {
    const { data: secrets } = await supabase
      .from("organization_secrets")
      .select("pix_gateway_provider, pix_gateway_token")
      .eq("organization_id", orgId)
      .maybeSingle();

    if (!secrets?.pix_gateway_provider || !secrets?.pix_gateway_token) continue;

    for (const order of list) {
      checked++;
      const paid = await isPaid(
        secrets.pix_gateway_provider,
        secrets.pix_gateway_token,
        order.gateway_payment_id!,
      );
      if (!paid) continue;

      const { data: updated } = await supabase
        .from("orders")
        .update({ status: "pending", paid: true })
        .eq("id", order.id)
        .eq("status", "awaiting_payment")
        .select("id");

      if (updated && updated.length > 0) {
        paidCount++;
        console.log(`[reconcile] order ${order.id} promoted to pending`);
      }
    }
  }

  return new Response(JSON.stringify({ checked, paid: paidCount }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});