import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const userId = claimsData.claims.sub;

    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verifica admin
    const { data: roleRow } = await service
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action || "save"; // "save" | "read"

    if (action === "read") {
      const { data } = await service
        .from("platform_secrets")
        .select("key, value, updated_at")
        .in("key", ["IFOOD_CLIENT_ID", "IFOOD_CLIENT_SECRET"]);
      const map: Record<string, { value: string; updated_at: string }> = {};
      (data ?? []).forEach((r: any) => { map[r.key] = { value: r.value, updated_at: r.updated_at }; });
      const mask = (v?: string) => {
        if (!v) return null;
        if (v.length <= 8) return "•".repeat(v.length);
        return v.slice(0, 4) + "•".repeat(Math.max(4, v.length - 8)) + v.slice(-4);
      };
      return new Response(JSON.stringify({
        client_id_masked: mask(map.IFOOD_CLIENT_ID?.value),
        client_secret_masked: mask(map.IFOOD_CLIENT_SECRET?.value),
        client_id_set: !!map.IFOOD_CLIENT_ID,
        client_secret_set: !!map.IFOOD_CLIENT_SECRET,
        updated_at: map.IFOOD_CLIENT_ID?.updated_at || map.IFOOD_CLIENT_SECRET?.updated_at || null,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { client_id, client_secret } = body as { client_id?: string; client_secret?: string };
    if (!client_id || !client_secret || client_id.length < 8 || client_secret.length < 8) {
      return new Response(JSON.stringify({ error: "client_id e client_secret obrigatórios (mínimo 8 caracteres)" }), { status: 400, headers: corsHeaders });
    }

    // Salva (upsert)
    const { error: upErr } = await service.from("platform_secrets").upsert([
      { key: "IFOOD_CLIENT_ID", value: client_id.trim(), updated_at: new Date().toISOString() },
      { key: "IFOOD_CLIENT_SECRET", value: client_secret.trim(), updated_at: new Date().toISOString() },
    ], { onConflict: "key" });
    if (upErr) {
      console.error("[ifood-update-platform-creds] upsert error:", upErr);
      return new Response(JSON.stringify({ error: "Falha ao salvar", details: upErr.message }), { status: 500, headers: corsHeaders });
    }

    // Invalida tokens cacheados de TODAS as lojas (anti-resíduo)
    const { data: invalidated, error: invErr } = await service
      .from("ifood_credentials")
      .update({
        access_token: null,
        refresh_token: null,
        token_expires_at: null,
        status: "disconnected",
      })
      .not("id", "is", null)
      .select("id");
    if (invErr) {
      console.error("[ifood-update-platform-creds] invalidate error:", invErr);
    }

    return new Response(JSON.stringify({
      success: true,
      disconnected_count: invalidated?.length ?? 0,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("[ifood-update-platform-creds] error:", err);
    return new Response(JSON.stringify({ error: "Internal", details: String(err?.message || err) }), { status: 500, headers: corsHeaders });
  }
});