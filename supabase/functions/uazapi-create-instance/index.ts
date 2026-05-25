import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminToken = Deno.env.get("UAZAPI_ADMIN_TOKEN");
    const serverUrl = (Deno.env.get("UAZAPI_SERVER_URL") || "https://free.uazapi.com").replace(/\/$/, "");

    if (!adminToken) {
      return new Response(JSON.stringify({ error: "UAZAPI_ADMIN_TOKEN not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auth: precisa de usuário logado
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "missing auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { organization_id } = await req.json();
    if (!organization_id) {
      return new Response(JSON.stringify({ error: "organization_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Verifica se o user é dono da org OU admin
    const { data: org } = await supabase
      .from("organizations")
      .select("id, user_id, slug, name")
      .eq("id", organization_id)
      .maybeSingle();
    if (!org) {
      return new Response(JSON.stringify({ error: "organization not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    const isAdmin = !!roleRow;
    if (org.user_id !== user.id && !isAdmin) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Limite: 1 instância por loja (organization). Como cada loja só pode ter
    // uma linha em whatsapp_instances, o bloco abaixo (retorna a existente)
    // já garante o limite naturalmente. Para conectar outro número, o usuário
    // deve criar uma nova unidade.

    // Já existe instância? Retorna ela
    const { data: existing } = await supabase
      .from("whatsapp_instances")
      .select("*")
      .eq("organization_id", organization_id)
      .maybeSingle();

    if (existing) {
      // Tenta pegar QR atual
      const qr = await fetchQr(serverUrl, existing.instance_token);
      return new Response(
        JSON.stringify({
          ok: true,
          existed: true,
          instance: existing,
          qrcode: qr.qrcode,
          status: qr.status,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Cria instância nova no servidor uazapi
    const instanceName = `org-${org.slug}-${Date.now().toString(36)}`;
    const candidatePaths = ["/instance/init", "/instance/create"];
    let initRes: Response | null = null;
    let initBody: string = "";
    let usedPath: string | null = null;
    const attempts: Array<{ path: string; status: number; body: string }> = [];

    for (const path of candidatePaths) {
      const url = `${serverUrl}${path}`;
      console.log("uazapi init attempt:", url);
      const r = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          admintoken: adminToken,
        },
        body: JSON.stringify({ name: instanceName, systemName: "trendfood" }),
      });
      const text = await r.text();
      attempts.push({ path, status: r.status, body: text.slice(0, 300) });
      console.log(`uazapi init ${path} -> ${r.status}`);
      if (r.ok) {
        initRes = r;
        initBody = text;
        usedPath = path;
        break;
      }
      // Se não for 404, não adianta tentar outros paths (erro de auth, etc)
      if (r.status !== 404) {
        initBody = text;
        usedPath = path;
        break;
      }
    }

    if (!initRes || !initRes.ok) {
      const lastStatus = attempts[attempts.length - 1]?.status ?? 0;
      console.error("uazapi init failed. attempts:", JSON.stringify(attempts));
      return new Response(
        JSON.stringify({
          error: "uazapi_init_failed",
          server_url: serverUrl,
          attempts,
          hint:
            lastStatus === 404
              ? "Servidor respondeu 404 em todos os paths. Verifique UAZAPI_SERVER_URL (sem /api no final) e se é mesmo um servidor uazapi."
              : lastStatus === 401 || lastStatus === 403
              ? "Servidor recusou o admintoken. Verifique UAZAPI_ADMIN_TOKEN."
              : "Servidor retornou erro inesperado. Veja attempts[].body.",
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    let initData: any;
    try {
      initData = JSON.parse(initBody);
    } catch {
      console.error("uazapi init non-json response:", initBody.slice(0, 500));
      return new Response(
        JSON.stringify({ error: "uazapi_init_not_json", server_url: serverUrl, path: usedPath, body: initBody.slice(0, 500) }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    // uazapi retorna a instance com token dentro
    const instanceToken = initData?.instance?.token || initData?.token;
    if (!instanceToken) {
      console.error("uazapi init no token in response:", JSON.stringify(initData).slice(0, 1000));
      return new Response(JSON.stringify({ error: "no_token_returned", raw: initData }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Configurar webhook automaticamente
    const webhookUrl = `${supabaseUrl}/functions/v1/whatsapp-webhook`;
    let webhookConfigured = false;
    try {
      const whRes = await fetch(`${serverUrl}/webhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json", token: instanceToken },
        body: JSON.stringify({
          url: webhookUrl,
          events: ["messages"],
          excludeMessages: ["fromMe"],
          addUrlEvents: false,
        }),
      });
      webhookConfigured = whRes.ok;
      if (!whRes.ok) {
        console.error("uazapi webhook error:", whRes.status, await whRes.text());
      }
    } catch (e) {
      console.error("webhook config exception:", (e as Error).message);
    }

    // Gerar QR code (start)
    const qr = await fetchQr(serverUrl, instanceToken);

    // Salvar no banco
    const { data: saved, error: saveErr } = await supabase
      .from("whatsapp_instances")
      .insert({
        organization_id,
        instance_name: instanceName,
        instance_token: instanceToken,
        status: qr.status || "connecting",
        webhook_configured: webhookConfigured,
      })
      .select()
      .single();

    if (saveErr) {
      console.error("save instance error:", saveErr);
      return new Response(JSON.stringify({ error: "db_save_failed", detail: saveErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Garante uma linha de ai_bot_config pra essa loja (copia defaults do singleton se existir)
    const { data: existingCfg } = await supabase
      .from("ai_bot_config")
      .select("id")
      .eq("organization_id", organization_id)
      .maybeSingle();
    if (!existingCfg) {
      const { data: defaultCfg } = await supabase
        .from("ai_bot_config")
        .select("system_prompt, greeting_message, model")
        .is("organization_id", null)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      await supabase.from("ai_bot_config").insert({
        organization_id,
        enabled: false,
        system_prompt: defaultCfg?.system_prompt ?? undefined,
        greeting_message: defaultCfg?.greeting_message ?? undefined,
        model: defaultCfg?.model ?? undefined,
      });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        existed: false,
        instance: saved,
        qrcode: qr.qrcode,
        status: qr.status,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("uazapi-create-instance error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function fetchQr(serverUrl: string, instanceToken: string): Promise<{ qrcode: string | null; status: string | null }> {
  try {
    const res = await fetch(`${serverUrl}/instance/connect`, {
      method: "POST",
      headers: { "Content-Type": "application/json", token: instanceToken },
      body: JSON.stringify({}),
    });
    if (!res.ok) {
      return { qrcode: null, status: null };
    }
    const data = await res.json();
    const qrcode =
      data?.instance?.qrcode ||
      data?.qrcode ||
      data?.qrCode ||
      null;
    const status =
      data?.instance?.status ||
      data?.status ||
      null;
    return { qrcode, status };
  } catch (e) {
    console.error("fetchQr error:", (e as Error).message);
    return { qrcode: null, status: null };
  }
}
