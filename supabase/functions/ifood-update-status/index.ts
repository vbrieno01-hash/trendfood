import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const IFOOD_API = "https://merchant-api.ifood.com.br";

type IfoodAction = {
  path: string;
  body?: any;
  // campo a marcar em orders após sucesso (timestamp)
  markField?: "ifood_dispatched_at";
  // pular se este campo já estiver preenchido (idempotência)
  skipIfFieldSet?: "ifood_dispatched_at";
};

function actionsForStatus(
  newStatus: string,
  orderType: string | null,
  reasonCode?: string,
  reasonDescription?: string,
): IfoodAction[] {
  switch (newStatus) {
    case "preparing":
      return [{ path: "startPreparation" }];
    case "ready":
      return [{ path: "readyToPickup" }];
    case "delivered": {
      const isPickup = (orderType || "DELIVERY").toUpperCase() === "TAKEOUT";
      if (isPickup) {
        // TAKEOUT: o iFood marca como concluído quando o cliente retira.
        // Não há chamada outbound do merchant — readyToPickup já foi enviado em "ready".
        return [];
      }
      // DELIVERY: dispatch é o estado final do lado do merchant.
      // O iFood marca como concluído sozinho quando o entregador/cliente confirma.
      return [
        { path: "dispatch", markField: "ifood_dispatched_at", skipIfFieldSet: "ifood_dispatched_at" },
      ];
    }
    case "cancelled":
      return [{
        path: "requestCancellation",
        body: {
          reason: reasonDescription || "Cancelado pelo lojista",
          cancellationCode: reasonCode || "501",
        },
      }];
    default:
      return [];
  }
}

async function getValidToken(supabase: any, orgId: string): Promise<string | null> {
  const { data: cred } = await supabase
    .from("ifood_credentials").select("*")
    .eq("organization_id", orgId).single();
  if (!cred) return null;

  if (!cred.token_expires_at || new Date(cred.token_expires_at) > new Date()) {
    return cred.access_token;
  }

  const clientId = Deno.env.get("IFOOD_CLIENT_ID");
  const clientSecret = Deno.env.get("IFOOD_CLIENT_SECRET");
  if (!clientId || !clientSecret) return null;
  const params = new URLSearchParams();
  if (cred.refresh_token) {
    params.set("grantType", "refresh_token");
    params.set("clientId", clientId);
    params.set("clientSecret", clientSecret);
    params.set("refreshToken", cred.refresh_token);
  } else {
    params.set("grantType", "client_credentials");
    params.set("clientId", clientId);
    params.set("clientSecret", clientSecret);
  }
  const tr = await fetch(`${IFOOD_API}/authentication/v1.0/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  if (!tr.ok) return null;
  const td = await tr.json();
  const access = td.accessToken ?? td.access_token;
  await supabase.from("ifood_credentials").update({
    access_token: access,
    refresh_token: td.refreshToken ?? td.refresh_token ?? cred.refresh_token,
    token_expires_at: new Date(Date.now() + (td.expiresIn ?? td.expires_in ?? 3600) * 1000).toISOString(),
  }).eq("id", cred.id);
  return access;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const {
      ifood_order_id,
      organization_id,
      new_status,
      old_status,
      order_id,
      cancellation_reason_code,
      cancellation_reason_description,
    } = body;
    if (!ifood_order_id || !organization_id || !new_status) {
      return new Response(JSON.stringify({ error: "missing fields" }), { status: 400, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Skip se a mudança veio do iFood (evita loop) — req #9
    if (order_id) {
      const { data: ord } = await supabase.from("orders")
        .select("ifood_synced_externally, ifood_order_type, ifood_dispatched_at, ifood_concluded_at")
        .eq("id", order_id).maybeSingle();
      if (ord?.ifood_synced_externally) {
        // limpa flag e pula chamada outbound
        await supabase.from("orders")
          .update({ ifood_synced_externally: false })
          .eq("id", order_id);
        return new Response(JSON.stringify({ skipped: true, reason: "external_sync" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Buscar dados do pedido para decidir fluxo (DELIVERY/TAKEOUT + idempotência)
    let orderType: string | null = null;
    let dispatched: string | null = null;
    if (order_id) {
      const { data: ord } = await supabase.from("orders")
        .select("ifood_order_type, ifood_dispatched_at")
        .eq("id", order_id).maybeSingle();
      orderType = ord?.ifood_order_type ?? null;
      dispatched = ord?.ifood_dispatched_at ?? null;
    }

    const actions = actionsForStatus(new_status, orderType, cancellation_reason_code, cancellation_reason_description);
    if (actions.length === 0) {
      return new Response(JSON.stringify({ skipped: true, reason: "no_mapping" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = await getValidToken(supabase, organization_id);
    if (!token) {
      return new Response(JSON.stringify({ error: "no_token" }), { status: 401, headers: corsHeaders });
    }

    const results: any[] = [];
    for (const ep of actions) {
      // Idempotência: pula se timestamp já gravado
      if (ep.skipIfFieldSet === "ifood_dispatched_at" && dispatched) {
        results.push({ path: ep.path, skipped: true, reason: "already_dispatched" });
        continue;
      }

      const url = `${IFOOD_API}/order/v1.0/orders/${ifood_order_id}/${ep.path}`;
      let resStatus = 0;
      let resText = "";
      let networkError: string | null = null;
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: ep.body ? JSON.stringify(ep.body) : undefined,
        });
        resStatus = res.status;
        resText = (await res.text()).slice(0, 1000);
      } catch (err: any) {
        networkError = err?.message ?? String(err);
      }

      const ok = !networkError && resStatus >= 200 && resStatus < 300;
      // 409 do iFood normalmente significa "transição já feita" — tratar como sucesso idempotente
      const idempotentConflict = resStatus === 409;
      const success = ok || idempotentConflict;
      const retryable = !success && (networkError !== null || resStatus >= 500);

      console.log(`[ifood-update-status] ${ep.path} → ${resStatus}${networkError ? ` ERR ${networkError}` : ""}: ${resText.slice(0, 200)}`);

      await supabase.from("ifood_event_log").insert({
        organization_id,
        ifood_order_id,
        internal_order_id: order_id ?? null,
        code: success ? `OUT_${ep.path.toUpperCase()}` : `OUT_${ep.path.toUpperCase()}_FAILED`,
        payload: {
          request: body,
          action: ep.path,
          response_status: resStatus,
          response: resText,
          network_error: networkError,
          retry_pending: retryable,
        },
        source: "outbound",
      });

      if (success && ep.markField && order_id) {
        const upd: Record<string, any> = {};
        upd[ep.markField] = new Date().toISOString();
        await supabase.from("orders").update(upd).eq("id", order_id);
        if (ep.markField === "ifood_dispatched_at") dispatched = upd[ep.markField];
      }

      results.push({ path: ep.path, status: resStatus, ok: success, retry_pending: retryable });

      // Se falhou de forma não-recuperável (4xx exceto 409), interrompe sequência
      if (!success && !retryable) break;
      // Se a ação anterior precisava marcar timestamp e falhou, não avança para próxima
      if (!success) break;
    }

    const allOk = results.every((r) => r.ok || r.skipped);
    return new Response(JSON.stringify({ ok: allOk, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: allOk ? 200 : 502,
    });
  } catch (err: any) {
    console.error("[ifood-update-status] error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
