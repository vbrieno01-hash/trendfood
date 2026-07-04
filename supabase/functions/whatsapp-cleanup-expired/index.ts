import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function getUazapiConfig(supabase: ReturnType<typeof createClient>) {
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const { serverUrl, adminToken } = await getUazapiConfig(supabase);

    // Busca instâncias cuja org: (a) tem trial/período pago vencido E
    // (b) NÃO é lifetime. Isso cobre free-trial expirado, pro vencido e enterprise vencido.
    const nowIso = new Date().toISOString();
    const { data: orgs, error: orgErr } = await supabase
      .from("organizations")
      .select("id, subscription_plan, trial_ends_at")
      .in("subscription_plan", ["free", "pro", "enterprise"])
      .not("trial_ends_at", "is", null)
      .lte("trial_ends_at", nowIso);

    if (orgErr) throw orgErr;
    if (!orgs || orgs.length === 0) {
      return new Response(JSON.stringify({ ok: true, deleted: 0, message: "no expired orgs" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const orgIds = orgs.map((o: any) => o.id);

    // Desliga a chavinha de TODAS as orgs expiradas — mesmo que já não
    // tenham instância ativa — pra o painel admin refletir o estado real.
    const { error: disableAllErr } = await supabase
      .from("organizations")
      .update({ whatsapp_bot_allowed: false })
      .in("id", orgIds)
      .eq("whatsapp_bot_allowed", true);
    if (disableAllErr) {
      console.error("[whatsapp-cleanup-expired] disable flag error:", disableAllErr.message);
    }

    const { data: instances, error: instErr } = await supabase
      .from("whatsapp_instances")
      .select("id, instance_token, organization_id")
      .in("organization_id", orgIds);

    if (instErr) throw instErr;
    if (!instances || instances.length === 0) {
      return new Response(JSON.stringify({ ok: true, deleted: 0, message: "no instances to purge" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let deleted = 0;
    const errors: string[] = [];

    for (const inst of instances as any[]) {
      // Deleta no UazAPI (libera o slot). Sem adminToken, pula essa etapa
      // mas ainda remove do banco pra não deixar registro órfão.
      if (adminToken && inst.instance_token) {
        try {
          const res = await fetch(`${serverUrl}/instance/delete`, {
            method: "DELETE",
            headers: { admintoken: adminToken, token: inst.instance_token },
          });
          // Consome body pra evitar leak; qualquer erro só loga
          await res.text().catch(() => "");
          if (!res.ok && res.status !== 404) {
            errors.push(`uazapi delete ${res.status} for ${inst.organization_id}`);
          }
        } catch (e) {
          errors.push(`uazapi delete threw for ${inst.organization_id}: ${(e as Error).message}`);
        }
      }

      const { error: delErr } = await supabase
        .from("whatsapp_instances")
        .delete()
        .eq("id", inst.id);
      if (delErr) {
        errors.push(`db delete failed for ${inst.id}: ${delErr.message}`);
      } else {
        deleted++;
      }
    }

    console.log(`[whatsapp-cleanup-expired] deleted=${deleted} errors=${errors.length}`);
    return new Response(JSON.stringify({ ok: true, deleted, errors }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[whatsapp-cleanup-expired] error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});