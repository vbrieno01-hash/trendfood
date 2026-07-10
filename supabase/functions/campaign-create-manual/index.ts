import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizePhone(p: string) {
  return (p || "").replace(/\D/g, "");
}

const MAX_PHONES = 5;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ ok: false, error: "unauthorized" }, 401);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims?.sub) {
      return json({ ok: false, error: "unauthorized" }, 401);
    }
    const userId = claimsData.claims.sub as string;

    const body = await req.json().catch(() => ({}));
    const orgId = (body?.orgId ?? "").toString();
    const name = (body?.name ?? "").toString().trim().slice(0, 120);
    const message_template = (body?.message_template ?? "").toString().trim();
    const rawPhones: unknown = body?.phones;

    if (!orgId || !name || !message_template) {
      return json({ ok: false, error: "bad_request" }, 400);
    }
    if (message_template.length > 4000) {
      return json({ ok: false, error: "message_too_long" }, 400);
    }
    if (!Array.isArray(rawPhones) || rawPhones.length === 0) {
      return json({ ok: false, error: "no_phones" }, 400);
    }

    // Normaliza + dedup + cap rígido
    const phones = Array.from(
      new Set(
        (rawPhones as unknown[])
          .map((p) => normalizePhone(String(p ?? "")))
          .filter((p) => p.length >= 10 && p.length <= 13),
      ),
    ).slice(0, MAX_PHONES);

    if (phones.length === 0) {
      return json({ ok: false, error: "no_valid_phones" }, 400);
    }

    const admin = createClient(SUPABASE_URL, SERVICE);

    // 1) Ownership check
    const { data: org, error: orgErr } = await admin
      .from("organizations")
      .select("id, user_id")
      .eq("id", orgId)
      .maybeSingle();
    if (orgErr) throw orgErr;
    if (!org) return json({ ok: false, error: "not_found" }, 404);
    if (org.user_id !== userId) return json({ ok: false, error: "forbidden" }, 403);

    // 2) Valida números na UazAPI (best-effort, fail-open)
    let validPhones = phones;
    let invalidCount = 0;
    try {
      const checkRes = await fetch(
        `${SUPABASE_URL}/functions/v1/campaign-check-numbers`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SERVICE}`,
          },
          body: JSON.stringify({ orgId, phones }),
        },
      );
      const checkJson = await checkRes.json().catch(() => null);
      if (checkJson?.ok && Array.isArray(checkJson.valid)) {
        validPhones = checkJson.valid as string[];
        invalidCount = Array.isArray(checkJson.invalid) ? checkJson.invalid.length : 0;
      }
    } catch (_) {
      // fail-open
    }

    if (validPhones.length === 0) {
      return json({ ok: false, error: "no_valid_phones", invalid: invalidCount }, 400);
    }

    // 3) Cria campanha (draft)
    const { data: campaign, error: cErr } = await admin
      .from("campaigns")
      .insert({
        organization_id: orgId,
        name,
        target_filter: { manual_test: true, phones_count: validPhones.length },
        message_template,
        total_recipients: validPhones.length,
        status: "draft",
      })
      .select()
      .single();
    if (cErr) throw cErr;

    // 4) Insere recipients
    const { error: rInsErr } = await admin.from("campaign_recipients").insert(
      validPhones.map((phone) => ({
        campaign_id: campaign.id,
        organization_id: orgId,
        phone,
        status: "pending",
      })),
    );
    if (rInsErr) {
      // rollback campanha
      await admin.from("campaigns").delete().eq("id", campaign.id);
      throw rInsErr;
    }

    // 5) RPC atômica: debita créditos + enfileira na outbox
    const { data: result, error: eErr } = await admin.rpc("enqueue_campaign", {
      _campaign_id: campaign.id,
    });
    if (eErr) throw eErr;

    // 6) Aciona o dispatcher (fire-and-forget)
    fetch(`${SUPABASE_URL}/functions/v1/whatsapp-outbox-dispatch`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SERVICE}`,
      },
      body: "{}",
    }).catch(() => {});

    return json({
      ok: true,
      campaignId: campaign.id,
      invalid_numbers: invalidCount,
      ...(result as Record<string, unknown>),
    });
  } catch (e) {
    console.error("[campaign-create-manual] error", e);
    return json({ ok: false, error: "internal", detail: (e as Error).message }, 500);
  }
});