import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type UazapiConfig = {
  serverUrl: string;
  adminToken: string | null;
};

type WhatsAppInstance = {
  id: string;
  instance_name: string | null;
  instance_token: string | null;
  organization_id: string;
  organizations: {
    id: string;
    subscription_plan: string | null;
    trial_ends_at: string | null;
    whatsapp_bot_allowed: boolean | null;
  };
};

type DeleteAttempt = {
  label: string;
  method: "DELETE" | "POST";
  headers: Record<string, string>;
  body?: string;
  enabled: boolean;
};

async function getUazapiConfig(supabase: ReturnType<typeof createClient>): Promise<UazapiConfig> {
  const envServer = (Deno.env.get("UAZAPI_SERVER_URL") || "").replace(/\/$/, "");
  const envToken = Deno.env.get("UAZAPI_ADMIN_TOKEN") || null;

  try {
    const { data } = await supabase
      .from("platform_config")
      .select("uazapi_server_url, uazapi_admin_token")
      .eq("id", "singleton")
      .maybeSingle();

    const dbServer = ((data as { uazapi_server_url?: string | null } | null)?.uazapi_server_url || "").replace(/\/$/, "");
    const dbToken = (data as { uazapi_admin_token?: string | null } | null)?.uazapi_admin_token || null;

    return {
      serverUrl: dbServer || envServer || "https://free.uazapi.com",
      adminToken: dbToken || envToken,
    };
  } catch {
    return { serverUrl: envServer || "https://free.uazapi.com", adminToken: envToken };
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isExpiredInstance(instance: WhatsAppInstance, now: Date): boolean {
  const plan = instance.organizations.subscription_plan;
  const expiresAt = instance.organizations.trial_ends_at;

  return (
    ["free", "pro", "enterprise"].includes(String(plan)) &&
    typeof expiresAt === "string" &&
    new Date(expiresAt) <= now
  );
}

async function consume(response: Response): Promise<string> {
  return await response.text().catch(() => "");
}

async function disconnectInstance(serverUrl: string, instanceToken: string | null): Promise<void> {
  if (!instanceToken) return;

  await fetch(`${serverUrl}/instance/disconnect`, {
    method: "POST",
    headers: { "Content-Type": "application/json", token: instanceToken },
    body: "{}",
  }).then(consume).catch(() => "");
}

async function deleteUazapiInstance(
  serverUrl: string,
  adminToken: string | null,
  instance: Pick<WhatsAppInstance, "instance_name" | "instance_token" | "organization_id">,
): Promise<{ ok: boolean; detail: string }> {
  if (!adminToken) {
    return { ok: false, detail: "missing_admin_token" };
  }

  const name = instance.instance_name || "";
  const token = instance.instance_token || "";

  if (!name && !token) {
    return { ok: false, detail: "missing_instance_identifier" };
  }

  await disconnectInstance(serverUrl, token || null);

  // A UazAPI documenta exclusão por nome da instância. Os fallbacks por token
  // ficam para compatibilidade com versões antigas/variações do servidor.
  const attempts: DeleteAttempt[] = [
    {
      label: "post-name-body",
      method: "POST",
      headers: { "Content-Type": "application/json", admintoken: adminToken },
      body: JSON.stringify({ name, instanceName: name }),
      enabled: !!name,
    },
    {
      label: "delete-name-body",
      method: "DELETE",
      headers: { "Content-Type": "application/json", admintoken: adminToken },
      body: JSON.stringify({ name, instanceName: name }),
      enabled: !!name,
    },
    {
      label: "delete-name-header",
      method: "DELETE",
      headers: { admintoken: adminToken, name },
      enabled: !!name,
    },
    {
      label: "delete-token-header",
      method: "DELETE",
      headers: { admintoken: adminToken, token },
      enabled: !!token,
    },
    {
      label: "post-token-header",
      method: "POST",
      headers: { "Content-Type": "application/json", admintoken: adminToken, token },
      body: "{}",
      enabled: !!token,
    },
  ];

  const results: string[] = [];
  for (const attempt of attempts) {
    if (!attempt.enabled) continue;

    const response = await fetch(`${serverUrl}/instance/delete`, {
      method: attempt.method,
      headers: attempt.headers,
      body: attempt.body,
    });
    const responseText = await consume(response);
    results.push(`${attempt.label}:${response.status}:${responseText.slice(0, 140)}`);

    if (response.ok || response.status === 404) {
      return { ok: true, detail: results.join(" | ") };
    }
  }

  return { ok: false, detail: results.join(" | ") };
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

    const { data: instances, error: instErr } = await supabase
      .from("whatsapp_instances")
      .select(`
        id,
        instance_name,
        instance_token,
        organization_id,
        organizations!inner(id, subscription_plan, trial_ends_at, whatsapp_bot_allowed)
      `);

    if (instErr) throw instErr;

    const toDelete = ((instances || []) as WhatsAppInstance[]).filter((instance) => {
      const expired = isExpiredInstance(instance, now);
      const manuallyDisabled = instance.organizations.whatsapp_bot_allowed === false;
      return expired || manuallyDisabled;
    });

    const expiredOrgIds = Array.from(
      new Set(
        ((instances || []) as WhatsAppInstance[])
          .filter((instance) => isExpiredInstance(instance, now))
          .map((instance) => instance.organization_id),
      ),
    );

    if (expiredOrgIds.length > 0) {
      const { error: disableErr } = await supabase
        .from("organizations")
        .update({ whatsapp_bot_allowed: false })
        .in("id", expiredOrgIds);

      if (disableErr) {
        console.error("[whatsapp-cleanup-expired] disable flag error:", disableErr.message);
      }
    }

    if (toDelete.length === 0) {
      return json({ ok: true, processed: 0, deleted: 0, message: "all instances are valid" });
    }

    let deleted = 0;
    const errors: string[] = [];

    for (const instance of toDelete) {
      const uazapiDelete = await deleteUazapiInstance(serverUrl, adminToken, instance);
      if (!uazapiDelete.ok) {
        errors.push(`uazapi delete failed for ${instance.organization_id}: ${uazapiDelete.detail}`);
        console.error("[whatsapp-cleanup-expired]", errors[errors.length - 1]);
      }

      const { error: delErr } = await supabase
        .from("whatsapp_instances")
        .delete()
        .eq("id", instance.id);

      if (delErr) {
        errors.push(`db delete failed for ${instance.id}: ${delErr.message}`);
      } else {
        deleted++;
      }
    }

    console.log(`[whatsapp-cleanup-expired] processed=${toDelete.length} deleted=${deleted} errors=${errors.length}`);
    return json({ ok: true, processed: toDelete.length, deleted, errors });
  } catch (err) {
    console.error("[whatsapp-cleanup-expired] error:", err);
    return json({ error: (err as Error).message }, 500);
  }
});