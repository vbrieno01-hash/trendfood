import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    let adminToken: string | null = Deno.env.get("UAZAPI_ADMIN_TOKEN") || null;
    let serverUrl = (Deno.env.get("UAZAPI_SERVER_URL") || "https://free.uazapi.com").replace(/\/$/, "");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "missing auth" }, 401);
    }

    const supabaseAuth = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims } = await supabaseAuth.auth.getClaims(token);
    const user = claims?.claims ? { id: claims.claims.sub as string } : null;
    if (!user) return json({ error: "unauthorized" }, 401);

    // Apenas admins podem ver diagnóstico do servidor
    const supabase = createClient(supabaseUrl, serviceKey);
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) return json({ error: "forbidden" }, 403);

    // Sobrescreve com config dinâmica do platform_config se existir
    const { data: pc } = await supabase
      .from("platform_config")
      .select("uazapi_server_url, uazapi_admin_token")
      .eq("id", "singleton")
      .maybeSingle();
    const dbServer = ((pc as any)?.uazapi_server_url || "").replace(/\/$/, "");
    const dbToken = (pc as any)?.uazapi_admin_token || null;
    if (dbServer) serverUrl = dbServer;
    if (dbToken) adminToken = dbToken;

    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "info";

    if (action === "ping") {
      // Tenta GET na raiz pra ver se o host responde
      const probe = await safeFetch(serverUrl + "/", "GET");
      const probeInit = await safeFetch(serverUrl + "/instance/init", "POST", {
        "Content-Type": "application/json",
        admintoken: adminToken || "",
      }, JSON.stringify({ name: "__ping__", systemName: "trendfood" }));
      return json({
        ok: true,
        server_url: serverUrl,
        has_admin_token: !!adminToken,
        probes: { root: probe, init: probeInit },
      });
    }

    return json({
      ok: true,
      server_url: serverUrl,
      has_admin_token: !!adminToken,
    });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function safeFetch(url: string, method: string, headers: Record<string, string> = {}, body?: string) {
  try {
    const r = await fetch(url, { method, headers, body });
    const text = await r.text();
    return { url, status: r.status, ok: r.ok, body: text.slice(0, 300) };
  } catch (e) {
    return { url, error: (e as Error).message };
  }
}