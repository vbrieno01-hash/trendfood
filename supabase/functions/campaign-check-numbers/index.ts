import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CHUNK = 50;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { orgId, phones } = await req.json();
    if (!orgId || !Array.isArray(phones) || phones.length === 0) {
      return json({ error: "invalid_input" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: inst } = await supabase
      .from("whatsapp_instances")
      .select("instance_token, server_url, status")
      .eq("organization_id", orgId)
      .maybeSingle();

    if (!inst?.instance_token || !["connected", "open"].includes(inst.status)) {
      return json({ error: "whatsapp_not_connected" }, 400);
    }

    const serverUrl = await resolveUazapiServerUrl(supabase, inst.server_url);

    const valid: string[] = [];
    const invalid: string[] = [];
    const uniquePhones = Array.from(new Set(phones as string[]));

    for (let i = 0; i < uniquePhones.length; i += CHUNK) {
      const chunk = uniquePhones.slice(i, i + CHUNK);
      try {
        const res = await fetch(`${serverUrl}/chat/check`, {
          method: "POST",
          headers: { "Content-Type": "application/json", token: inst.instance_token },
          body: JSON.stringify({ numbers: chunk }),
        });
        if (!res.ok) {
          // Se check falhar (ex.: rate limit), assume todos válidos pra não travar o fluxo
          valid.push(...chunk);
          continue;
        }
        const body = await res.json().catch(() => null);
        // Retorno esperado: array de { query, iswhatsapp?, exists?, jid? } ou objeto { numbers: [...] }
        const list: any[] = Array.isArray(body) ? body : (body?.numbers ?? body?.result ?? []);
        if (!Array.isArray(list) || list.length === 0) {
          valid.push(...chunk);
          continue;
        }
        const byQuery = new Map<string, boolean>();
        for (const item of list) {
          const q = String(item?.query ?? item?.number ?? item?.phone ?? "").replace(/\D/g, "");
          const ok = Boolean(item?.iswhatsapp ?? item?.isWhatsApp ?? item?.exists ?? item?.jid);
          if (q) byQuery.set(q, ok);
        }
        for (const p of chunk) {
          const key = p.replace(/\D/g, "");
          const ok = byQuery.has(key) ? byQuery.get(key)! : true; // fallback: assume válido
          (ok ? valid : invalid).push(p);
        }
      } catch (_e) {
        valid.push(...chunk); // fail-open
      }
    }

    return json({ ok: true, valid, invalid, checked: uniquePhones.length });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

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