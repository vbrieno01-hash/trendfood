import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_ATTEMPTS = 3;
const BATCH_SIZE = 30;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: pending, error: pendErr } = await supabase
    .from("whatsapp_outbox")
    .select("id, organization_id, phone, message, attempts, event_type")
    .eq("status", "pending")
    .lt("attempts", MAX_ATTEMPTS)
    .order("created_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (pendErr) {
    return new Response(JSON.stringify({ error: pendErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const row of pending ?? []) {
    // Buscar instância conectada da loja
    const { data: inst } = await supabase
      .from("whatsapp_instances")
      .select("instance_token, server_url, status")
      .eq("organization_id", row.organization_id)
      .maybeSingle();

    if (!inst || !inst.instance_token || !["connected", "open"].includes(inst.status)) {
      await supabase
        .from("whatsapp_outbox")
        .update({
          status: "skipped",
          last_error: "WhatsApp da loja não está conectado",
        })
        .eq("id", row.id);
      skipped++;
      continue;
    }

    const serverUrl = await resolveUazapiServerUrl(supabase, inst.server_url);

    try {
      const res = await fetch(`${serverUrl}/send/text`, {
        method: "POST",
        headers: { "Content-Type": "application/json", token: inst.instance_token },
        body: JSON.stringify({ number: row.phone, text: row.message }),
      });

      if (res.ok) {
        await supabase
          .from("whatsapp_outbox")
          .update({ status: "sent", sent_at: new Date().toISOString(), attempts: row.attempts + 1 })
          .eq("id", row.id);
        sent++;
      } else {
        const errText = await res.text();
        if (res.status === 401 || res.status === 403) {
          await supabase
            .from("whatsapp_instances")
            .update({ status: "disconnected", connected_at: null, phone_connected: null })
            .eq("organization_id", row.organization_id);
        }
        const newAttempts = row.attempts + 1;
        await supabase
          .from("whatsapp_outbox")
          .update({
            status: newAttempts >= MAX_ATTEMPTS ? "failed" : "pending",
            last_error: `HTTP ${res.status}: ${errText.slice(0, 200)}`,
            attempts: newAttempts,
          })
          .eq("id", row.id);
        failed++;
      }
    } catch (e) {
      const newAttempts = row.attempts + 1;
      await supabase
        .from("whatsapp_outbox")
        .update({
          status: newAttempts >= MAX_ATTEMPTS ? "failed" : "pending",
          last_error: (e as Error).message.slice(0, 200),
          attempts: newAttempts,
        })
        .eq("id", row.id);
      failed++;
    }
  }

  return new Response(JSON.stringify({ ok: true, sent, failed, skipped, total: pending?.length ?? 0 }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

async function resolveUazapiServerUrl(
  supabase: ReturnType<typeof createClient>,
  instanceServerUrl?: string | null,
): Promise<string> {
  const instanceUrl = (instanceServerUrl || "").replace(/\/$/, "");
  if (instanceUrl) return instanceUrl;

  const { data } = await supabase
    .from("platform_config")
    .select("uazapi_server_url")
    .eq("id", "singleton")
    .maybeSingle();
  const configuredUrl = ((data as any)?.uazapi_server_url || "").replace(/\/$/, "");
  if (configuredUrl) return configuredUrl;

  return (Deno.env.get("UAZAPI_SERVER_URL") || "https://free.uazapi.com").replace(/\/$/, "");
}