import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_ATTEMPTS = 3;
const BATCH_SIZE = 15;
const PROCESSING_STUCK_MINUTES = 5;

// Delay aleatório enviado pra UazAPI (ela segura no server, mostrando "digitando…").
const DELAY_MIN_MS = 4000;
const DELAY_MAX_MS = 10000;

function randomDelay() {
  return Math.floor(DELAY_MIN_MS + Math.random() * (DELAY_MAX_MS - DELAY_MIN_MS));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Recupera mensagens presas em "processing" por mais de N minutos
  // (crash/timeout de outra invocação). Retorna elas para "pending".
  const stuckCutoff = new Date(Date.now() - PROCESSING_STUCK_MINUTES * 60_000).toISOString();
  await supabase
    .from("whatsapp_outbox")
    .update({ status: "pending", last_error: "recovered from stuck processing" })
    .eq("status", "processing")
    .lt("created_at", stuckCutoff);

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
  let capped = 0;

  // Cache por org: { limit, sentToday } — evita N queries iguais.
  const orgCap = new Map<string, { limit: number; sentToday: number }>();

  async function getCapState(orgId: string) {
    if (orgCap.has(orgId)) return orgCap.get(orgId)!;
    const { data: inst } = await supabase
      .from("whatsapp_instances")
      .select("daily_send_limit")
      .eq("organization_id", orgId)
      .maybeSingle();
    const limit = (inst as any)?.daily_send_limit ?? 300;
    const since = new Date(Date.now() - 24 * 60 * 60_000).toISOString();
    const { count } = await supabase
      .from("whatsapp_outbox")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("event_type", "campaign")
      .eq("status", "sent")
      .gte("sent_at", since);
    const state = { limit, sentToday: count ?? 0 };
    orgCap.set(orgId, state);
    return state;
  }

  for (const row of pending ?? []) {
    // Cap diário: só se aplica a campanhas.
    if (row.event_type === "campaign") {
      const state = await getCapState(row.organization_id);
      if (state.sentToday >= state.limit) {
        capped++;
        continue; // deixa como pending pra rodar amanhã
      }
    }

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
        body: JSON.stringify({
          number: row.phone,
          text: row.message,
          delay: row.event_type === "campaign" ? randomDelay() : 0,
          readchat: row.event_type === "campaign",
        }),
      });

      if (res.ok) {
        await supabase
          .from("whatsapp_outbox")
          .update({ status: "sent", sent_at: new Date().toISOString(), attempts: row.attempts + 1 })
          .eq("id", row.id);
        sent++;
        if (row.event_type === "campaign") {
          const state = orgCap.get(row.organization_id);
          if (state) state.sentToday += 1;
        }
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

  return new Response(JSON.stringify({ ok: true, sent, failed, skipped, capped, total: pending?.length ?? 0 }), {
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