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
    const now = new Date();

    // Busca instâncias ativas para verificar se devem ser removidas
    // (a) Org com trial vencido OU (b) Chave whatsapp_bot_allowed desligada manualmente
    const { data: instances, error: instErr } = await supabase
      .from("whatsapp_instances")
      .select(`
        id, 
        instance_token, 
        organization_id, 
        organizations!inner(id, subscription_plan, trial_ends_at, whatsapp_bot_allowed)
      `);

    if (instErr) throw instErr;
    if (!instances || instances.length === 0) {
      return new Response(JSON.stringify({ ok: true, deleted: 0, message: "no instances to check" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const toDelete: any[] = [];
    const orgsToDisable: string[] = [];

    for (const inst of (instances as any[])) {
      const org = inst.organizations;
      const isExpired = org.trial_ends_at && new Date(org.trial_ends_at) <= now;
      const isManualOff = org.whatsapp_bot_allowed === false;

      if (isExpired || isManualOff) {
        toDelete.push(inst);
        if (isExpired && org.whatsapp_bot_allowed === true) {
          orgsToDisable.push(org.id);
        }
      }
    }

    if (toDelete.length === 0) {
      return new Response(JSON.stringify({ ok: true, deleted: 0, message: "all instances are valid" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1) Desliga a chavinha das orgs que expiraram agora
    if (orgsToDisable.length > 0) {
      await supabase
        .from("organizations")
        .update({ whatsapp_bot_allowed: false })
        .in("id", orgsToDisable);
    }

    let deleted = 0;
    const errors: string[] = [];

    for (const inst of toDelete) {
      // 2) Deleta no UazAPI (libera slot)
      if (adminToken && inst.instance_token) {
        try {
          // Logout antes (fluxo padrão)
          await fetch(`${serverUrl}/instance/disconnect`, {
            method: "POST",
            headers: { "Content-Type": "application/json", token: inst.instance_token },
            body: "{}",
          }).then(r => r.text()).catch(() => "");

          // Delete definitivo
          const res = await fetch(`${serverUrl}/instance/delete`, {
            method: "DELETE",
            headers: { admintoken: adminToken, token: inst.instance_token },
          });
          
          if (!res.ok && res.status !== 404) {
            // Fallback POST (algumas versões de UazAPI)
            await fetch(`${serverUrl}/instance/delete`, {
              method: "POST",
              headers: { "Content-Type": "application/json", admintoken: adminToken, token: inst.instance_token },
              body: "{}",
            }).then(r => r.text()).catch(() => "");
          }
        } catch (e) {
          console.error(`[cleanup] uazapi error for ${inst.organization_id}:`, (e as Error).message);
          // Prosseguimos para deletar do banco mesmo com erro na API para não travar o loop,
          // mas note que isso pode deixar instâncias órfãs se o adminToken estiver errado.
        }
      }

      // 3) Remove do banco local
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

    console.log(`[whatsapp-cleanup-expired] processed=${toDelete.length} deleted=${deleted} errors=${errors.length}`);
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
