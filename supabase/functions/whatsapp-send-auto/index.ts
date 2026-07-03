// Envia mensagem via uazapi automaticamente se a loja tem bot ativo e instância conectada.
// Retorna { sent: boolean, reason?: string }. Frontend usa isso pra decidir se abre wa.me.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { organization_id, phone, message } = await req.json();
    if (!organization_id || !phone || !message) {
      return new Response(JSON.stringify({ sent: false, reason: "missing_params" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const [{ data: org }, { data: inst }] = await Promise.all([
      supabase.from("organizations").select("whatsapp_bot_allowed").eq("id", organization_id).maybeSingle(),
      supabase.from("whatsapp_instances").select("instance_token, server_url, status").eq("organization_id", organization_id).maybeSingle(),
    ]);

    if (!(org as any)?.whatsapp_bot_allowed) {
      return new Response(JSON.stringify({ sent: false, reason: "bot_not_allowed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!inst?.instance_token) {
      return new Response(JSON.stringify({ sent: false, reason: "no_instance" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serverUrl = (inst.server_url || Deno.env.get("UAZAPI_SERVER_URL") || "https://free.uazapi.com").replace(/\/$/, "");
    const digits = String(phone).replace(/\D/g, "");
    const number = digits.startsWith("55") ? digits : `55${digits}`;

    const res = await fetch(`${serverUrl}/send/text`, {
      method: "POST",
      headers: { "Content-Type": "application/json", token: inst.instance_token },
      body: JSON.stringify({ number, text: message }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[whatsapp-send-auto] uazapi error", res.status, err);
      if (res.status === 401 || res.status === 403) {
        await supabase
          .from("whatsapp_instances")
          .update({ status: "disconnected", connected_at: null, phone_connected: null })
          .eq("organization_id", organization_id);
        return new Response(JSON.stringify({ sent: false, reason: "token_invalid" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ sent: false, reason: "uazapi_error" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Autocurar status no banco quando o envio deu certo mas a UI ainda não polou
    if (inst.status !== "connected") {
      await supabase
        .from("whatsapp_instances")
        .update({ status: "connected", connected_at: new Date().toISOString() })
        .eq("organization_id", organization_id);
    }

    return new Response(JSON.stringify({ sent: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[whatsapp-send-auto] error", err);
    return new Response(JSON.stringify({ sent: false, reason: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});