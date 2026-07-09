// Reclame Aqui — encaminhador one-way de reclamações/bugs para o Telegram do dono.
// Público (anon aceito), com rate-limit por hash de IP e por org.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_MESSAGE = 2000;
const MAX_NAME = 80;
const MAX_CONTACT = 120;
const MAX_META = 400;
const RATE_IP_PER_HOUR = 5;
const RATE_ORG_PER_HOUR = 20;

const VALID_CATEGORIES = new Set(["bug", "suggestion", "complaint", "other"]);
const CATEGORY_LABEL: Record<string, string> = {
  bug: "🐛 Bug/Erro",
  suggestion: "💡 Sugestão",
  complaint: "😠 Reclamação",
  other: "💬 Outro",
};

function escapeHtml(s: string | null | undefined): string {
  if (!s) return "";
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function sanitize(s: unknown, max: number): string {
  if (typeof s !== "string") return "";
  return s.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim().slice(0, max);
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "method_not_allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const raw = await req.text();
    if (raw.length > 8 * 1024) {
      return new Response(JSON.stringify({ ok: false, error: "payload_too_large" }), {
        status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    let body: any;
    try { body = JSON.parse(raw); } catch {
      return new Response(JSON.stringify({ ok: false, error: "invalid_json" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const category = String(body?.category ?? "other").toLowerCase();
    if (!VALID_CATEGORIES.has(category)) {
      return new Response(JSON.stringify({ ok: false, error: "invalid_category" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const name = sanitize(body?.name, MAX_NAME);
    const contact = sanitize(body?.contact, MAX_CONTACT);
    const message = sanitize(body?.message, MAX_MESSAGE);
    const orgName = sanitize(body?.org_name, MAX_NAME);
    const orgSlug = sanitize(body?.org_slug, MAX_NAME);
    const pageUrl = sanitize(body?.page_url, MAX_META);
    const userAgent = sanitize(body?.user_agent, MAX_META);
    const appVersion = sanitize(body?.app_version, 40);
    const orgIdRaw = typeof body?.org_id === "string" && /^[0-9a-f-]{36}$/i.test(body.org_id) ? body.org_id : null;

    if (name.length < 2) {
      return new Response(JSON.stringify({ ok: false, error: "name_too_short" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (message.length < 5) {
      return new Response(JSON.stringify({ ok: false, error: "message_too_short" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      return new Response(JSON.stringify({ ok: false, error: "server_misconfigured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(supabaseUrl, serviceKey);

    // Hash de IP (LGPD — não guarda IP em claro)
    const fwd = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "";
    const ip = fwd.split(",")[0].trim() || "unknown";
    const ipHash = await sha256Hex(`ra:${ip}`);
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    // Rate-limit por IP
    const { count: ipCount } = await supabase
      .from("reclame_aqui_ratelimit")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("created_at", hourAgo);
    if ((ipCount ?? 0) >= RATE_IP_PER_HOUR) {
      return new Response(JSON.stringify({ ok: false, error: "rate_limited", scope: "ip" }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate-limit por org (se informada)
    if (orgIdRaw) {
      const { count: orgCount } = await supabase
        .from("reclame_aqui_ratelimit")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgIdRaw)
        .gte("created_at", hourAgo);
      if ((orgCount ?? 0) >= RATE_ORG_PER_HOUR) {
        return new Response(JSON.stringify({ ok: false, error: "rate_limited", scope: "org" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Registra no rate-limit
    await supabase.from("reclame_aqui_ratelimit").insert({ ip_hash: ipHash, org_id: orgIdRaw });

    // Persiste em suggestions (reaproveita tabela existente)
    const suggestionContent = [
      `[${category}] ${message}`,
      contact ? `Contato: ${contact}` : "",
      orgSlug ? `Loja: ${orgName || orgSlug}` : "",
      pageUrl ? `URL: ${pageUrl}` : "",
    ].filter(Boolean).join("\n");

    await supabase.from("suggestions").insert({
      author_name: name.slice(0, 80),
      content: suggestionContent.slice(0, 4000),
      status: "new",
      org_id: orgIdRaw,
    } as any).then(() => null).catch(() => null);

    // Encaminha via admin-telegram-notify (que já cuida do fanout p/ recipients inscritos)
    const now = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
    const payload = {
      category, category_label: CATEGORY_LABEL[category] ?? category,
      name, contact, message, org_name: orgName, org_slug: orgSlug,
      page_url: pageUrl, user_agent: userAgent, app_version: appVersion,
      org_id: orgIdRaw, sent_at: now,
    };

    const notifyRes = await fetch(`${supabaseUrl}/functions/v1/admin-telegram-notify`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ event_type: "reclame_aqui", payload }),
    });

    const notifyBody = await notifyRes.json().catch(() => ({}));
    const delivered = notifyRes.ok && (notifyBody?.ok ?? true);

    return new Response(JSON.stringify({ ok: true, delivered }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[reclame-aqui-send] fatal", e);
    return new Response(JSON.stringify({ ok: false, error: "internal_error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// escapeHtml exportado como referência para futura extensão — não é chamado internamente.
export { escapeHtml };