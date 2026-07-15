import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const ok = (msg: string, data?: unknown) =>
    new Response(JSON.stringify({ ok: true, message: msg, ...data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const body = await req.json().catch(() => ({}));
    const outboxId = body?.outbox_id ?? null;

    // Busca mensagem(ns) pendentes
    let query = supabase
      .from("whatsapp_outbox" as any)
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(20);

    if (outboxId) {
      // Chamado direto por pg_net para uma mensagem específica
      query = supabase
        .from("whatsapp_outbox" as any)
        .select("*")
        .eq("id", outboxId)
        .eq("status", "pending");
    }

    const { data: rows, error } = await query;
    if (error) throw error;
    if (!rows || rows.length === 0) return ok("no pending messages");

    let sent = 0, failed = 0;

    for (const row of rows as any[]) {
      // Marca como 'processing' pra evitar envio duplo
      await supabase
        .from("whatsapp_outbox" as any)
        .update({ status: "processing" })
        .eq("id", row.id)
        .eq("status", "pending");

      // Busca instância UazAPI da org
      const { data: instance } = await supabase
        .from("whatsapp_instances")
        .select("instance_token, server_url, status")
        .eq("organization_id", row.organization_id)
        .in("status", ["connected", "open"])
        .maybeSingle();

      if (!instance) {
        await supabase
          .from("whatsapp_outbox" as any)
          .update({ status: "skipped", last_error: "WhatsApp da loja não está conectado" })
          .eq("id", row.id);
        failed++;
        continue;
      }

      // Resolve URL do servidor
      let serverUrl = (instance.server_url || "").replace(/\/$/, "");
      if (!serverUrl) {
        const { data: pc } = await supabase
          .from("platform_config")
          .select("uazapi_server_url")
          .eq("id", "singleton")
          .maybeSingle();
        serverUrl = ((pc as any)?.uazapi_server_url || "").replace(/\/$/, "")
          || Deno.env.get("UAZAPI_SERVER_URL")?.replace(/\/$/, "")
          || "https://free.uazapi.com";
      }

      // Formata telefone
      const phone = row.phone.replace(/\D/g, "");
      const formattedPhone = phone.startsWith("55") ? phone : `55${phone}`;

      // Envia via UazAPI
      let sendError: string | null = null;
      try {
        const res = await fetch(`${serverUrl}/send/text`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            token: instance.instance_token,
          },
          body: JSON.stringify({ number: formattedPhone, text: row.message }),
        });
        if (!res.ok) {
          const body = await res.text();
          sendError = `UazAPI ${res.status}: ${body.slice(0, 200)}`;
          const bodyLower = body.toLowerCase();
          const sessionDead =
            bodyLower.includes("session is not reconnectable") ||
            bodyLower.includes("whatsapp disconnected");
          if (res.status === 401 || res.status === 403 || sessionDead) {
            await supabase
              .from("whatsapp_instances")
              .update({ status: "disconnected", connected_at: null, phone_connected: null })
              .eq("organization_id", row.organization_id);
          }
          // Sessão morta: não gasta retries — vai direto pra skipped
          if (sessionDead) {
            await supabase
              .from("whatsapp_outbox" as any)
              .update({
                status: "skipped",
                last_error: sendError,
                attempts: (row.attempts ?? 0) + 1,
              })
              .eq("id", row.id);
            console.error(`[process-wa-outbox] session dead id=${row.id}, marked skipped`);
            failed++;
            continue;
          }
        }
      } catch (e) {
        sendError = `fetch error: ${(e as Error).message}`;
      }

      // Atualiza status na fila
      await supabase
        .from("whatsapp_outbox" as any)
        .update({
          status: sendError ? "failed" : "sent",
          last_error: sendError ?? null,
          attempts: (row.attempts ?? 0) + 1,
          sent_at: sendError ? null : new Date().toISOString(),
        })
        .eq("id", row.id);

      if (sendError) {
        console.error(`[process-wa-outbox] failed id=${row.id}:`, sendError);
        failed++;
      } else {
        sent++;
      }
    }

    return ok(`processed ${rows.length} messages`, { sent, failed });

  } catch (err) {
    console.error("[process-wa-outbox] error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
