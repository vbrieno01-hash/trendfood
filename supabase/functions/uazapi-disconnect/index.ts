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
    const cfg = await getUazapiConfig(supabaseAdmin);
    const serverUrl = cfg.serverUrl;
    const adminToken = cfg.adminToken;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "missing auth" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { organization_id, delete_instance } = await req.json();
    if (!organization_id) {
      return new Response(JSON.stringify({ error: "organization_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: org } = await supabase
      .from("organizations").select("user_id").eq("id", organization_id).maybeSingle();
    if (!org) {
      return new Response(JSON.stringify({ error: "org not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: roleRow } = await supabase
      .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (org.user_id !== user.id && !roleRow) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: inst } = await supabase
      .from("whatsapp_instances").select("*").eq("organization_id", organization_id).maybeSingle();
    if (!inst) {
      return new Response(JSON.stringify({ ok: true, message: "no instance" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Desconectar no servidor uazapi (logout)
    try {
      await fetch(`${serverUrl}/instance/disconnect`, {
        method: "POST",
        headers: { "Content-Type": "application/json", token: inst.instance_token },
        body: JSON.stringify({}),
      });
    } catch (e) {
      console.error("disconnect call error:", (e as Error).message);
    }

    // Se delete=true, deleta a instância completamente do servidor (admin only)
    if (delete_instance && adminToken) {
      try {
        await fetch(`${serverUrl}/instance/delete`, {
          method: "DELETE",
          headers: { admintoken: adminToken, token: inst.instance_token },
        });
      } catch (e) {
        console.error("delete call error:", (e as Error).message);
      }
      // Remove do banco
      await supabase.from("whatsapp_instances").delete().eq("id", inst.id);
    } else {
      // Apenas marca como desconectado
      await supabase
        .from("whatsapp_instances")
        .update({ status: "disconnected", phone_connected: null, connected_at: null })
        .eq("id", inst.id);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("uazapi-disconnect error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
