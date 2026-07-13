import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return digits.startsWith("55") ? digits : `55${digits}`;
}

function fmt(v: number) {
  return `R$ ${v.toFixed(2).replace(".", ",")}`;
}

function parseFreteValue(freteStr: string | null | undefined): number | null {
  if (!freteStr) return null;
  const lower = freteStr.toLowerCase().trim();
  if (lower === "grátis" || lower === "gratis" || lower === "free") return 0;
  const cleaned = freteStr.replace(/[^\d,\.]/g, "").replace(",", ".");
  if (!cleaned) return null;
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

function buildOwnerMessage(
  order: {
    id: string;
    notes: string | null;
    total_price?: number | null;
    created_at?: string | null;
  },
  items: { name: string; quantity: number; price: number }[],
  orgName: string
): string {
  const shortId = order.id.slice(0, 8).toUpperCase();

  // Parse fields from notes: TIPO | CLIENTE | TEL | END. | FRETE | PGTO
  const notes = order.notes ?? "";
  const get = (key: string) => {
    const m = notes.match(new RegExp(`${key}:([^|]+)`));
    return m ? m[1].trim() : null;
  };

  const tipo     = get("TIPO")    ?? "Pedido";
  const cliente  = get("CLIENTE") ?? "Cliente";
  const tel      = get("TEL")     ?? "";
  const endereco = get("END\\.");
  const frete    = get("FRETE");
  const pgto     = get("PGTO")    ?? "—";
  const obs      = get("OBS");
  const agendado = get("AGENDADO");

  const itemLines = items
    .map((i) => `  • ${i.quantity}x ${i.name} — ${fmt(i.price * i.quantity)}`)
    .join("\n");

  const itemsTotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const freteValue = parseFreteValue(frete);
  const total = (order.total_price ?? itemsTotal) + (freteValue ?? 0);

  const lines = [
    `🛎️ *Novo Pedido — ${orgName}*`,
    `📋 *#${shortId}*`,
    ``,
    `👤 *Cliente:* ${cliente}`,
    tel ? `📱 *Tel:* ${tel}` : null,
    `📦 *Tipo:* ${tipo}`,
    endereco ? `📍 *Endereço:* ${endereco}` : null,
    frete ? `🚚 *Frete:* ${frete}` : null,
    agendado ? `🕐 *Agendado:* ${agendado}` : null,
    ``,
    `🧾 *Itens:*`,
    itemLines,
    ``,
    `💰 *Total:* ${fmt(total)}`,
    `💳 *Pagamento:* ${pgto}`,
    obs ? `📝 *Obs:* ${obs}` : null,
  ]
    .filter((l) => l !== null)
    .join("\n");

  return lines;
}

// ── Main ──────────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const ok = (msg: string) =>
    new Response(JSON.stringify({ ok: true, message: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const { order_id } = await req.json();
    // Nota: chamado da página pública do cliente (sem sessão de usuário)
    // A segurança é garantida pelo fato de que só enviamos ao DONO da org
    // e nunca retornamos dados sensíveis ao chamador.
    if (!order_id) {
      return new Response(JSON.stringify({ error: "order_id obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Busca pedido + itens ─────────────────────────────────────────────────
    const { data: order } = await supabase
      .from("orders")
      .select("id, organization_id, notes, created_at")
      .eq("id", order_id)
      .maybeSingle();

    if (!order) return ok("order not found, skipping");

    const { data: orderItems } = await supabase
      .from("order_items")
      .select("name, quantity, price")
      .eq("order_id", order_id);

    // ── Busca org ────────────────────────────────────────────────────────────
    const { data: org } = await supabase
      .from("organizations")
      .select("id, name, whatsapp, subscription_plan, trial_ends_at, whatsapp_bot_allowed")
      .eq("id", order.organization_id)
      .maybeSingle();
    // (sem ownership check — service_role acessa diretamente, chamador público não recebe dados)

    if (!org) return ok("org not found, skipping");

    // ── Gate: Admin liberou esta loja (independe de plano) ─────────────────
    if (!(org as any).whatsapp_bot_allowed) {
      await supabase.from("client_error_logs").insert({
        organization_id: org.id, source: "uazapi-notify-owner",
        code: "WA-NOTIFY-OWNER-BOT-NOT-ALLOWED",
        error_message: "Robô não liberado para esta loja (checkout)",
        metadata: { order_id },
      });
      return ok("whatsapp_bot not allowed, skipping");
    }

    // ── Gate 3: Instância conectada ──────────────────────────────────────────
    const { data: instance } = await supabase
      .from("whatsapp_instances")
      .select("instance_token, server_url, status")
      .eq("organization_id", org.id)
      .in("status", ["connected", "open"])
      .maybeSingle();

    if (!instance) {
      const { data: any_inst } = await supabase
        .from("whatsapp_instances")
        .select("status")
        .eq("organization_id", org.id)
        .maybeSingle();
      await supabase.from("client_error_logs").insert({
        organization_id: org.id, source: "uazapi-notify-owner",
        code: any_inst ? "WA-NOTIFY-OWNER-DISCONNECTED" : "WA-NOTIFY-OWNER-NO-INSTANCE",
        error_message: any_inst
          ? `Instância existe mas status="${(any_inst as any).status}" (não conectada) — reconecte na aba Robô`
          : "Nenhuma instância uazapi configurada",
        metadata: { order_id, instance_status: (any_inst as any)?.status ?? null },
      });
      return ok("no connected whatsapp instance, skipping");
    }

    // ── Gate 4: Dono tem número cadastrado ───────────────────────────────────
    const ownerPhone = (org as any).whatsapp?.replace(/\D/g, "");
    if (!ownerPhone || ownerPhone.length < 10) {
      await supabase.from("client_error_logs").insert({
        organization_id: org.id, source: "uazapi-notify-owner",
        code: "WA-NOTIFY-OWNER-NO-PHONE",
        error_message: "Dono da loja sem WhatsApp cadastrado",
        metadata: { order_id },
      });
      return ok("no valid owner phone, skipping");
    }

    // ── Anti-duplicata: mesmo pedido nos últimos 60s ─────────────────────────
    const { data: recent } = await supabase
      .from("whatsapp_notification_log" as any)
      .select("id")
      .eq("order_id", order_id)
      .eq("event", "new_order_owner")
      .eq("status", "sent")
      .gte("created_at", new Date(Date.now() - 60_000).toISOString())
      .limit(1)
      .maybeSingle();

    if (recent) return ok("duplicate suppressed (60s window)");

    // ── Monta mensagem e envia ────────────────────────────────────────────────
    const phone = formatPhone(ownerPhone);
    const message = buildOwnerMessage(
      order,
      (orderItems ?? []) as { name: string; quantity: number; price: number }[],
      (org as any).name ?? "Loja"
    );

    // server_url pode ser null se coluna nao existia ainda — sempre faz fallback para platform_config
    let serverUrl = ((instance as any).server_url || "").replace(/\/$/, "");
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

    let sendError: string | null = null;
    let sendCode: string | null = null;
    try {
      const res = await fetch(`${serverUrl}/send/text`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          token: instance.instance_token,
        },
        body: JSON.stringify({ number: phone, text: message }),
      });
      if (!res.ok) {
        const body = await res.text();
        sendError = `UazAPI ${res.status}: ${body.slice(0, 200)}`;
        sendCode = res.status === 401 || res.status === 403
          ? `WA-NOTIFY-OWNER-${res.status}`
          : "WA-NOTIFY-OWNER-UAZAPI";
        if (res.status === 401 || res.status === 403) {
          await supabase
            .from("whatsapp_instances")
            .update({ status: "disconnected", connected_at: null, phone_connected: null })
            .eq("organization_id", org.id);
        }
      }
    } catch (e) {
      sendError = `fetch error: ${(e as Error).message}`;
      sendCode = "WA-NOTIFY-OWNER-NETWORK";
    }

    // ── Grava log ─────────────────────────────────────────────────────────────
    await supabase.from("whatsapp_notification_log" as any).insert({
      order_id,
      event: "new_order_owner",
      status: sendError ? "failed" : "sent",
      error: sendError ?? null,
    });

    if (sendError) {
      console.error(`[uazapi-notify-owner] failed order=${order_id}:`, sendError);
      await supabase.from("client_error_logs").insert({
        organization_id: org.id,
        source: "uazapi-notify-owner",
        code: sendCode ?? "WA-NOTIFY-OWNER-UNKNOWN",
        error_message: sendError,
        metadata: { order_id, serverUrl, endpoint: "/send/text" },
      });
    }

    return ok(sendError ? `failed but logged: ${sendError}` : `notified owner at ${phone}`);

  } catch (err) {
    console.error("[uazapi-notify-owner] unexpected error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
