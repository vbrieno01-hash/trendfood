import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const IFOOD_AUTH_URL = "https://merchant-api.ifood.com.br/authentication/v1.0/oauth/token";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const userId = claimsData.claims.sub;

    const { organization_id } = await req.json();
    if (!organization_id) {
      return new Response(JSON.stringify({ error: "organization_id required" }), { status: 400, headers: corsHeaders });
    }

    // Verify ownership
    const { data: org } = await supabase
      .from("organizations")
      .select("user_id")
      .eq("id", organization_id)
      .single();

    if (!org || org.user_id !== userId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
    }

    // Get iFood credentials from env (platform-level)
    const clientId = Deno.env.get("IFOOD_CLIENT_ID");
    const clientSecret = Deno.env.get("IFOOD_CLIENT_SECRET");

    if (!clientId || !clientSecret) {
      return new Response(JSON.stringify({ error: "iFood credentials not configured on platform" }), { status: 500, headers: corsHeaders });
    }

    // Get current credentials for this org
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: creds } = await serviceClient
      .from("ifood_credentials")
      .select("*")
      .eq("organization_id", organization_id)
      .single();

    if (!creds) {
      return new Response(JSON.stringify({ error: "No iFood credentials found for this organization" }), { status: 404, headers: corsHeaders });
    }

    // Request new token from iFood
    const params = new URLSearchParams({
      grantType: "client_credentials",
      clientId,
      clientSecret,
    });

    // If we have a refresh token, use it
    if (creds.refresh_token) {
      params.set("grantType", "refresh_token");
      params.set("refreshToken", creds.refresh_token);
    }

    const tokenRes = await fetch(IFOOD_AUTH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      console.error("[ifood-auth] Token request failed:", errBody);

      await serviceClient
        .from("ifood_credentials")
        .update({ status: "error" })
        .eq("organization_id", organization_id);

      return new Response(JSON.stringify({ error: "Failed to authenticate with iFood", details: errBody }), { status: 502, headers: corsHeaders });
    }

    const tokenData = await tokenRes.json();

    // Save new tokens
    await serviceClient
      .from("ifood_credentials")
      .update({
        access_token: tokenData.accessToken,
        refresh_token: tokenData.refreshToken || creds.refresh_token,
        token_expires_at: new Date(Date.now() + tokenData.expiresIn * 1000).toISOString(),
        status: "connected",
      })
      .eq("organization_id", organization_id);

    return new Response(JSON.stringify({ success: true, status: "connected" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[ifood-auth] Error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: corsHeaders });
  }
});
