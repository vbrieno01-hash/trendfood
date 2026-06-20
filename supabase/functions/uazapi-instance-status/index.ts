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
    const serverUrl = await getUazapiServerUrl(supabaseAdmin);

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
    try {
      const sres = await fetch(`${serverUrl}/instance/status`, {
        method: "GET",
        headers: { token: inst.instance_token },
      });
      if (sres.ok) {
        const sdata = await sres.json();
        liveStatus = sdata?.instance?.status || sdata?.status || null;
        livePhone = sdata?.instance?.owner || sdata?.instance?.phone || sdata?.phone || null;
        qrcode = sdata?.instance?.qrcode || sdata?.qrcode || null;
      }
    } catch (e) {
      console.error("status check error:", (e as Error).message);
    }

    // Sincronizar mudanças no banco
    const updates: Record<string, unknown> = {};
    if (liveStatus && liveStatus !== inst.status) updates.status = liveStatus;
    if (livePhone && livePhone !== inst.phone_connected) {
      updates.phone_connected = String(livePhone).replace(/\D/g, "");
    }
    if (liveStatus === "connected" && !inst.connected_at) {
      updates.connected_at = new Date().toISOString();
    }
    if (Object.keys(updates).length > 0) {
      await supabase
        .from("whatsapp_instances")
        .update(updates)
        .eq("id", inst.id);
      Object.assign(inst, updates);
    }

    return new Response(
      JSON.stringify({ ok: true, instance: inst, qrcode, liveStatus }),
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

async function getUazapiServerUrl(supabase: ReturnType<typeof createClient>): Promise<string> {
  const envServer = (Deno.env.get("UAZAPI_SERVER_URL") || "").replace(/\/$/, "");
  try {
    const { data } = await supabase
      .from("platform_config")
      .select("uazapi_server_url")
      .eq("id", "singleton")
      .maybeSingle();
    const dbServer = ((data as any)?.uazapi_server_url || "").replace(/\/$/, "");
    return dbServer || envServer || "https://free.uazapi.com";
  } catch {
    return envServer || "https://free.uazapi.com";
  }
}
