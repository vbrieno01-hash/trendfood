import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    // Validate user
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { org_id } = await req.json();
    if (!org_id) {
      return new Response(JSON.stringify({ error: "org_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch org with service role to get mp_subscription_id
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: org, error: orgError } = await supabaseAdmin
      .from("organizations")
      .select("mp_subscription_id, user_id")
      .eq("id", org_id)
      .single();

    if (orgError || !org) {
      return new Response(JSON.stringify({ error: "Organization not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify ownership
    if (org.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!org.mp_subscription_id) {
      return new Response(
        JSON.stringify({ next_payment_date: null, status: null, payments: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const mpToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
    if (!mpToken) {
      return new Response(JSON.stringify({ error: "MP token not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch subscription details from MP
    const [subRes, paymentsRes] = await Promise.all([
      fetch(`https://api.mercadopago.com/preapproval/${org.mp_subscription_id}`, {
        headers: { Authorization: `Bearer ${mpToken}` },
      }),
      fetch(
        `https://api.mercadopago.com/preapproval/${org.mp_subscription_id}/authorized_payments`,
        { headers: { Authorization: `Bearer ${mpToken}` } }
      ),
    ]);

    let next_payment_date: string | null = null;
    let mp_status: string | null = null;

    if (subRes.ok) {
      const subData = await subRes.json();
      next_payment_date = subData.next_payment_date || null;
      mp_status = subData.status || null;
    }

    let payments: { date: string; amount: number; status: string }[] = [];

    if (paymentsRes.ok) {
      const paymentsData = await paymentsRes.json();
      const results = paymentsData.results || paymentsData || [];
      if (Array.isArray(results)) {
        payments = results.map((p: any) => ({
          date: p.date_created || p.payment?.date_created || "",
          amount: p.transaction_amount || p.payment?.transaction_amount || 0,
          status: p.status || p.payment?.status || "unknown",
        }));
      }
    }

    return new Response(
      JSON.stringify({ next_payment_date, status: mp_status, payments }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[get-subscription-details] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
