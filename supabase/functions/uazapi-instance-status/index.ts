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
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);
    const { serverUrl } = await getUazapiConfig(supabaseAdmin);

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
    const token = authHeader.replace("Bearer ", "");
    const { data: claims } = await supabaseAuth.auth.getClaims(token);
    const user = claims?.claims ? { id: claims.claims.sub as string } : null;
    if (!user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const organization_id = url.searchParams.get("organization_id");
    if (!organization_id) {
      return new Response(JSON.stringify({ error: "organization_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: org } = await supabase
      .from("organizations")
      .select("user_id")
      .eq("id", organization_id)
      .maybeSingle();
    if (!org) {
      return new Response(JSON.stringify({ error: "org not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: roleRow } = await supabase
      .from("user_roles").select("role")
      .eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (org.user_id !== user.id && !roleRow) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: inst } = await supabase
      .from("whatsapp_instances")
      .select("*")
      .eq("organization_id", organization_id)
      .maybeSingle();

    if (!inst) {
      return new Response(JSON.stringify({ ok: true, instance: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Consulta status no servidor uazapi
    let liveStatus: string | null = null;
    let livePhone: string | null = null;
    let qrcode: string | null = null;
    let tokenInvalid = false;
    const probes: Array<{ endpoint: string; status: number; hasQr: boolean; rawStatus: string | null }> = [];

    try {
      const sres = await fetch(`${serverUrl}/instance/status`, {
        method: "GET",
        headers: { token: inst.instance_token },
      });
      const stext = await sres.text();
      let sdata: any = null;
      try { sdata = JSON.parse(stext); } catch { /* noop */ }
      const rawStatus = sdata?.instance?.status || sdata?.status || null;
      probes.push({ endpoint: "/instance/status", status: sres.status, hasQr: false, rawStatus });
      if (sres.status === 401 || sres.status === 403 || sres.status === 404) tokenInvalid = true;
      if (sres.ok && sdata) {
        if (rawStatus === "open" || rawStatus === "connected") liveStatus = "connected";
        else if (rawStatus === "close" || rawStatus === "disconnected" || rawStatus === "logout") liveStatus = "disconnected";
        else if (rawStatus) liveStatus = rawStatus;
        livePhone = sdata?.instance?.owner || sdata?.instance?.phone || sdata?.phone || null;
        qrcode = extractQr(sdata);
      }
    } catch (e) {
      console.error("status check error:", (e as Error).message);
    }

    if (!qrcode && liveStatus !== "connected") {
      try {
        const cres = await fetch(`${serverUrl}/instance/connect`, {
          method: "POST",
          headers: { "Content-Type": "application/json", token: inst.instance_token },
          body: JSON.stringify({}),
        });
        const ctext = await cres.text();
        let cdata: any = null;
        try { cdata = JSON.parse(ctext); } catch { /* noop */ }
        const cStatus = cdata?.instance?.status || cdata?.status || null;
        qrcode = extractQr(cdata);
        probes.push({ endpoint: "/instance/connect", status: cres.status, hasQr: !!qrcode, rawStatus: cStatus });
        if (cres.status === 401 || cres.status === 403 || cres.status === 404) tokenInvalid = true;
        if (!liveStatus && cStatus) {
          if (cStatus === "open" || cStatus === "connected") liveStatus = "connected";
          else if (cStatus === "close" || cStatus === "disconnected" || cStatus === "logout") liveStatus = "disconnected";
          else liveStatus = cStatus;
        }
      } catch (e) {
        console.error("connect fallback error:", (e as Error).message);
      }
    }

    console.log(`[uazapi-status] org=${organization_id} probes=${JSON.stringify(probes)} qr=${!!qrcode} status=${liveStatus} tokenInvalid=${tokenInvalid}`);

    // Sincronizar mudanças no banco — regra conservadora:
    // - Só rebaixa `connected` quando o uazapi confirmar estado TERMINAL
    //   (`disconnected`/`close`/`logout`) ou o token estiver morto sem QR.
    // - Estados transitórios (`connecting`, `pairing`, `syncing`, ...) NÃO
    //   sobrescrevem `connected` — apenas voltam no response pra UI.
    // - Se o banco já estava em transitório e o uazapi devolve outro
    //   transitório, mantém como está (não piora).
    const updates: Record<string, unknown> = {};
    const tokenDead = tokenInvalid && !qrcode;
    const effectiveStatus =
      liveStatus ?? (tokenDead ? "disconnected" : null);
    const isTerminal = effectiveStatus === "disconnected";
    const isConnected = effectiveStatus === "connected";
    const isTransient = !!effectiveStatus && !isTerminal && !isConnected;

    let nextStatus: string | null = null;
    if (isConnected) {
      nextStatus = "connected";
    } else if (isTerminal) {
      // só rebaixa se o uazapi confirmar terminal
      nextStatus = "disconnected";
    } else if (isTransient) {
      // NÃO derruba `connected` por causa de status transitório.
      // Só grava o transitório se o banco não estava em `connected`.
      if (inst.status !== "connected") {
        // e mesmo assim só se for diferente do atual — evita churn
        if (effectiveStatus !== inst.status) nextStatus = effectiveStatus;
      }
    }

    if (nextStatus && nextStatus !== inst.status) updates.status = nextStatus;

    if (isConnected) {
      if (livePhone) {
        const normalized = String(livePhone).replace(/\D/g, "");
        if (normalized !== inst.phone_connected) updates.phone_connected = normalized;
      }
      if (!inst.connected_at) updates.connected_at = new Date().toISOString();
    } else if (nextStatus === "disconnected") {
      // uazapi confirmou desconectado (ou token morto) — limpar número stale
      if (inst.phone_connected) updates.phone_connected = null;
    }

    // Preenche server_url se estava nulo — útil pra lojas criadas antes do fix
    if (!(inst as any).server_url && serverUrl) {
      updates.server_url = serverUrl;
    }
    if (Object.keys(updates).length > 0) {
      await supabase
        .from("whatsapp_instances")
        .update(updates)
        .eq("id", inst.id);
      Object.assign(inst, updates);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        instance: inst,
        qrcode,
        liveStatus,
        tokenInvalid: tokenInvalid && !qrcode,
        needsRecreate: tokenInvalid && !qrcode,
        probes,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("uazapi-instance-status error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function extractQr(data: any): string | null {
  if (!data || typeof data !== "object") return null;
  const candidates = [
    data.qrcode, data.qrCode, data.qr, data.code, data.base64,
    data.instance?.qrcode, data.instance?.qrCode, data.instance?.qr, data.instance?.base64,
    data.data?.qrcode, data.data?.qrCode, data.data?.qr, data.data?.base64,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.length > 20) return c;
  }
  return null;
}

async function getUazapiConfig(
  supabase: ReturnType<typeof createClient>,
): Promise<{ serverUrl: string; adminToken: string | null }> {
  const envServer = (Deno.env.get("UAZAPI_SERVER_URL") || "").replace(/\/$/, "");
  const envToken = Deno.env.get("UAZAPI_ADMIN_TOKEN") || null;
  try {
    const { data } = await supabase
      .from("platform_config")
      .select("uazapi_server_url, uazapi_admin_token")
      .eq("id", "singleton")
      .maybeSingle();
    const dbServer = ((data as any)?.uazapi_server_url || "").replace(/\/$/, "");
    const dbToken = (data as any)?.uazapi_admin_token || null;
    return {
      serverUrl: dbServer || envServer || "https://free.uazapi.com",
      adminToken: dbToken || envToken,
    };
  } catch {
    return { serverUrl: envServer || "https://free.uazapi.com", adminToken: envToken };
  }
}
