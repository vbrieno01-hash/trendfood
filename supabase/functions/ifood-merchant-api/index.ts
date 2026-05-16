import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BASE = "https://merchant-api.ifood.com.br/merchant/v1.0";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function mapError(status: number, body: any) {
  const code =
    status === 400 ? "BadRequest"
    : status === 401 ? "Unauthorized"
    : status === 403 ? "Forbidden"
    : status === 404 ? "NotFound"
    : status === 409 ? (body?.error?.code || body?.code || "Conflict")
    : status === 429 ? "RateLimited"
    : status >= 500 ? "ServerError"
    : "Error";
  const message =
    body?.error?.message || body?.message ||
    (status === 401 ? "Token inválido ou expirado"
      : status === 403 ? "Sem permissão para esta loja"
      : status === 409 ? "Conflito (ex: pausa sobreposta)"
      : status === 429 ? "Limite de requisições atingido"
      : `Erro ${status}`);
  return { code, message, details: body };
}

async function getAccessToken(serviceClient: any, organization_id: string, userAuthHeader?: string): Promise<{ token: string; merchant_id: string } | { error: any; status: number }> {
  const { data: creds } = await serviceClient
    .from("ifood_credentials")
    .select("access_token, token_expires_at, merchant_id, status")
    .eq("organization_id", organization_id)
    .single();

  if (!creds) return { error: { code: "NoCredentials", message: "Loja não conectada ao iFood" }, status: 404 };
  if (!creds.merchant_id) return { error: { code: "NoMerchantId", message: "merchant_id não vinculado" }, status: 400 };

  const expiresAt = creds.token_expires_at ? new Date(creds.token_expires_at).getTime() : 0;
  // Refresh if expires within 60s
  if (!creds.access_token || expiresAt - Date.now() < 60_000) {
    if (!userAuthHeader) {
      return { error: { code: "TokenExpired", message: "Token expirado e sem contexto de usuário para renovar" }, status: 401 };
    }
    const refreshRes = await fetch(`${SUPABASE_URL}/functions/v1/ifood-auth`, {
      method: "POST",
      headers: { Authorization: userAuthHeader, "Content-Type": "application/json" },
      body: JSON.stringify({ organization_id }),
    });
    if (!refreshRes.ok) {
      const t = await refreshRes.text();
      return { error: { code: "RefreshFailed", message: "Falha ao renovar token iFood", details: t }, status: 502 };
    }
    const { data: fresh } = await serviceClient
      .from("ifood_credentials")
      .select("access_token, merchant_id")
      .eq("organization_id", organization_id)
      .single();
    return { token: fresh.access_token, merchant_id: fresh.merchant_id };
  }

  return { token: creds.access_token, merchant_id: creds.merchant_id };
}

async function callIfood(
  token: string,
  path: string,
  init: { method?: string; body?: unknown } = {}
): Promise<{ ok: true; status: number; data: any; headers: Headers } | { ok: false; status: number; error: any; headers: Headers }> {
  const method = init.method || "GET";
  let attempt = 0;
  let lastErr: any = null;
  while (attempt < 3) {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: init.body ? JSON.stringify(init.body) : undefined,
    });
    const text = await res.text();
    let body: any = null;
    try { body = text ? JSON.parse(text) : null; } catch { body = text; }
    if (res.ok) return { ok: true, status: res.status, data: body, headers: res.headers };
    if (res.status >= 500) {
      lastErr = { status: res.status, body };
      await new Promise((r) => setTimeout(r, 500 * Math.pow(2, attempt)));
      attempt++;
      continue;
    }
    return { ok: false, status: res.status, error: mapError(res.status, body), headers: res.headers };
  }
  return { ok: false, status: lastErr?.status || 500, error: mapError(lastErr?.status || 500, lastErr?.body), headers: new Headers() };
}

function isoOffset(minutesFromNow: number) {
  return new Date(Date.now() + minutesFromNow * 60_000).toISOString();
}

function businessHoursToShifts(bh: any) {
  // bh.schedule.{dom,seg,...} with { open, from, to }
  const map: Record<string, string> = {
    dom: "SUNDAY", seg: "MONDAY", ter: "TUESDAY", qua: "WEDNESDAY",
    qui: "THURSDAY", sex: "FRIDAY", sab: "SATURDAY",
  };
  const shifts: any[] = [];
  if (!bh?.schedule) return shifts;
  for (const key of Object.keys(map)) {
    const day = bh.schedule[key];
    if (!day?.open || !day.from || !day.to) continue;
    const [fh, fm] = day.from.split(":").map(Number);
    const [th, tm] = day.to.split(":").map(Number);
    const start = `${String(fh).padStart(2, "0")}:${String(fm || 0).padStart(2, "0")}`;
    let dur = (th * 60 + (tm || 0)) - (fh * 60 + (fm || 0));
    if (dur <= 0) dur += 24 * 60;
    shifts.push({ dayOfWeek: map[key], start, duration: dur });
  }
  return shifts;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const serviceClient = createClient(SUPABASE_URL, SERVICE_ROLE);

    // ====== Internal sync from DB trigger (no auth) ======
    if (body.internal === true && body.action === "sync") {
      const orgId = body.organization_id;
      const syncAction = body.sync_action;
      const { data: org } = await serviceClient
        .from("organizations")
        .select("id, paused, business_hours")
        .eq("id", orgId)
        .single();
      if (!org) return json({ error: "org not found" }, 404);

      const tk = await getAccessToken(serviceClient, orgId);
      if ("error" in tk) return json(tk.error, tk.status);

      if (syncAction === "pause") {
        const start = isoOffset(0);
        const end = isoOffset(60 * 12); // 12h default; lojista pode despausar antes
        const r = await callIfood(tk.token, `/merchants/${tk.merchant_id}/interruptions`, {
          method: "POST",
          body: { description: "Loja pausada via TrendFood", start, end },
        });
        if (r.ok) {
          const intId = r.data?.id;
          if (intId) {
            await serviceClient.from("ifood_merchant_interruptions").insert({
              organization_id: orgId,
              ifood_merchant_id: tk.merchant_id,
              ifood_interruption_id: intId,
              reason: "paused_manual",
              start_at: start,
              end_at: end,
            });
          }
          return json({ success: true, interruption_id: intId });
        }
        return json(r.error, r.status);
      }

      if (syncAction === "unpause") {
        const { data: open } = await serviceClient
          .from("ifood_merchant_interruptions")
          .select("id, ifood_interruption_id")
          .eq("organization_id", orgId)
          .eq("reason", "paused_manual")
          .is("removed_at", null);
        let removed = 0;
        for (const row of open || []) {
          const r = await callIfood(tk.token, `/merchants/${tk.merchant_id}/interruptions/${row.ifood_interruption_id}`, { method: "DELETE" });
          if (r.ok || r.status === 404) {
            await serviceClient.from("ifood_merchant_interruptions").update({ removed_at: new Date().toISOString() }).eq("id", row.id);
            removed++;
          }
        }
        return json({ success: true, removed });
      }

      if (syncAction === "hours") {
        const shifts = businessHoursToShifts(org.business_hours);
        if (shifts.length === 0) return json({ success: true, skipped: "no shifts" });
        const r = await callIfood(tk.token, `/merchants/${tk.merchant_id}/opening-hours`, {
          method: "PUT",
          body: { shifts },
        });
        if (r.ok) return json({ success: true });
        return json(r.error, r.status);
      }

      return json({ error: "unknown sync_action" }, 400);
    }

    // ====== User-authenticated actions ======
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (!claimsData?.claims) return json({ error: "Unauthorized" }, 401);
    const userId = claimsData.claims.sub;

    const { action, organization_id, payload } = body;
    if (!organization_id || !action) return json({ error: "organization_id and action required" }, 400);

    // Verify ownership or admin
    const { data: org } = await serviceClient
      .from("organizations").select("user_id").eq("id", organization_id).single();
    const { data: adminRole } = await serviceClient
      .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
    if (!org || (org.user_id !== userId && !adminRole)) return json({ error: "Forbidden" }, 403);

    const tk = await getAccessToken(serviceClient, organization_id, authHeader);
    if ("error" in tk) return json(tk.error, tk.status);

    const mid = tk.merchant_id;

    switch (action) {
      case "list_merchants": {
        const r = await callIfood(tk.token, `/merchants`);
        return r.ok ? json({ data: r.data }) : json(r.error, r.status);
      }
      case "get_merchant": {
        const r = await callIfood(tk.token, `/merchants/${mid}`);
        return r.ok ? json({ data: r.data }) : json(r.error, r.status);
      }
      case "get_status": {
        const r = await callIfood(tk.token, `/merchants/${mid}/status`);
        return r.ok ? json({ data: r.data }) : json(r.error, r.status);
      }
      case "list_interruptions": {
        const r = await callIfood(tk.token, `/merchants/${mid}/interruptions`);
        return r.ok ? json({ data: r.data }) : json(r.error, r.status);
      }
      case "create_interruption": {
        const minutes = payload?.minutes ?? 30;
        const start = isoOffset(0);
        const end = isoOffset(minutes);
        const r = await callIfood(tk.token, `/merchants/${mid}/interruptions`, {
          method: "POST",
          body: { description: payload?.description || `Pausa de ${minutes}min via TrendFood`, start, end },
        });
        if (r.ok) {
          const intId = r.data?.id;
          if (intId) {
            await serviceClient.from("ifood_merchant_interruptions").insert({
              organization_id, ifood_merchant_id: mid, ifood_interruption_id: intId,
              reason: "manual_ui", start_at: start, end_at: end,
            });
          }
          return json({ data: r.data });
        }
        return json(r.error, r.status);
      }
      case "delete_interruption": {
        const intId = payload?.interruption_id;
        if (!intId) return json({ error: "interruption_id required" }, 400);
        const r = await callIfood(tk.token, `/merchants/${mid}/interruptions/${intId}`, { method: "DELETE" });
        if (r.ok || r.status === 404) {
          await serviceClient.from("ifood_merchant_interruptions")
            .update({ removed_at: new Date().toISOString() })
            .eq("organization_id", organization_id)
            .eq("ifood_interruption_id", intId)
            .is("removed_at", null);
          return json({ success: true });
        }
        return json(r.error, r.status);
      }
      case "get_opening_hours": {
        const r = await callIfood(tk.token, `/merchants/${mid}/opening-hours`);
        return r.ok ? json({ data: r.data }) : json(r.error, r.status);
      }
      case "update_opening_hours": {
        const shifts = payload?.shifts;
        if (!Array.isArray(shifts)) return json({ error: "shifts[] required" }, 400);
        const r = await callIfood(tk.token, `/merchants/${mid}/opening-hours`, {
          method: "PUT", body: { shifts },
        });
        return r.ok ? json({ success: true, data: r.data }) : json(r.error, r.status);
      }
      case "run_checklist": {
        const steps: Array<{ name: string; ok: boolean; status: number; detail?: any }> = [];
        const exec = async (name: string, fn: () => Promise<any>) => {
          try { const r = await fn(); steps.push({ name, ok: r.ok, status: r.status, detail: r.ok ? undefined : r.error }); return r; }
          catch (e: any) { steps.push({ name, ok: false, status: 0, detail: e?.message }); return null; }
        };

        await exec("GET /merchants", () => callIfood(tk.token, `/merchants`));
        await exec("GET /merchants/{id}", () => callIfood(tk.token, `/merchants/${mid}`));
        await exec("GET /merchants/{id}/status", () => callIfood(tk.token, `/merchants/${mid}/status`));
        await exec("GET /merchants/{id}/interruptions", () => callIfood(tk.token, `/merchants/${mid}/interruptions`));

        // POST interruption (1 min)
        const start = isoOffset(0), end = isoOffset(1);
        const createR = await exec("POST /merchants/{id}/interruptions",
          () => callIfood(tk.token, `/merchants/${mid}/interruptions`,
            { method: "POST", body: { description: "Checklist homologação", start, end } }));
        const createdId = (createR as any)?.data?.id;

        if (createdId) {
          await exec("DELETE /merchants/{id}/interruptions/{intId}",
            () => callIfood(tk.token, `/merchants/${mid}/interruptions/${createdId}`, { method: "DELETE" }));
        } else {
          steps.push({ name: "DELETE /merchants/{id}/interruptions/{intId}", ok: false, status: 0, detail: "skipped (POST falhou)" });
        }

        await exec("GET /merchants/{id}/opening-hours", () => callIfood(tk.token, `/merchants/${mid}/opening-hours`));

        // PUT opening-hours: re-aplica o atual (sem mudar nada)
        const cur = await callIfood(tk.token, `/merchants/${mid}/opening-hours`);
        if (cur.ok && cur.data?.shifts) {
          await exec("PUT /merchants/{id}/opening-hours",
            () => callIfood(tk.token, `/merchants/${mid}/opening-hours`, { method: "PUT", body: { shifts: cur.data.shifts } }));
        } else {
          steps.push({ name: "PUT /merchants/{id}/opening-hours", ok: false, status: 0, detail: "GET falhou — não pude reescrever" });
        }

        const passed = steps.filter((s) => s.ok).length;
        return json({ steps, passed, total: steps.length });
      }
      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (err: any) {
    console.error("[ifood-merchant-api]", err);
    return json({ error: "Internal server error", message: err?.message }, 500);
  }
});