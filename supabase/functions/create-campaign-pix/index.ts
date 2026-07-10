import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PRICE = 19.9;
const CREDITS = 250;
const ADDON_KEY = "campaign_250";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;
    const userEmail = (claimsData.claims.email as string) || "";

    const { org_id, cpf_cnpj } = await req.json();
    if (!org_id || !cpf_cnpj) {
      return new Response(JSON.stringify({ error: "Missing org_id or cpf_cnpj" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: org } = await admin
      .from("organizations")
      .select("id, name, user_id")
      .eq("id", org_id)
      .maybeSingle();

    if (!org || (org as any).user_id !== userId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accessToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
    if (!accessToken) {
      return new Response(JSON.stringify({ error: "Payment gateway not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cleanDoc = String(cpf_cnpj).replace(/\D/g, "");
    const docType = cleanDoc.length <= 11 ? "CPF" : "CNPJ";

    const paymentBody = {
      transaction_amount: PRICE,
      description: `Campanhas WhatsApp — ${CREDITS} mensagens (${(org as any).name})`,
      payment_method_id: "pix",
      external_reference: `addon:${ADDON_KEY}:${org_id}`,
      payer: {
        email: userEmail,
        identification: { type: docType, number: cleanDoc },
      },
      metadata: {
        org_id,
        addon_key: ADDON_KEY,
        credits: CREDITS,
        user_id: userId,
      },
    };

    const mpRes = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        "X-Idempotency-Key": `campaign-${org_id}-${Date.now()}`,
      },
      body: JSON.stringify(paymentBody),
    });

    const mpData = await mpRes.json();
    if (!mpRes.ok) {
      console.error("[create-campaign-pix] MP error:", JSON.stringify(mpData));
      return new Response(
        JSON.stringify({
          error: "Payment creation failed",
          details: mpData.message || mpData.cause?.[0]?.description || "Unknown error",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    try {
      await admin.from("pending_subscription_payments").insert({
        organization_id: org_id,
        payment_id: String(mpData.id),
        plan: `addon:${ADDON_KEY}`,
        billing_cycle: "one_time",
        promo_applied: false,
        amount_cents: Math.round(PRICE * 100),
        status: "pending",
      });
    } catch (e) {
      console.error("[create-campaign-pix] pending insert (non-blocking):", e);
    }

    const qr = mpData.point_of_interaction?.transaction_data;
    return new Response(
      JSON.stringify({
        payment_id: mpData.id,
        status: mpData.status,
        pix_qr_code: qr?.qr_code || null,
        pix_qr_code_base64: qr?.qr_code_base64 || null,
        pix_expiration: mpData.date_of_expiration || null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[create-campaign-pix] Error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});