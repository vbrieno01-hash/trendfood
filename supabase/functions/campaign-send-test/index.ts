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
    const message = (body?.message ?? "").toString().trim();
    if (!orgId || !message) return json({ ok: false, error: "bad_request" }, 400);
    if (message.length > 4000) return json({ ok: false, error: "message_too_long" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE);

    // 1) Ownership + WhatsApp
    const { data: org, error: orgErr } = await admin
      .from("organizations")
      .select("id, user_id, whatsapp, name")
      .eq("id", orgId)
      .maybeSingle();
    if (orgErr) throw orgErr;
    if (!org) return json({ ok: false, error: "not_found" }, 404);
    if (org.user_id !== userId) return json({ ok: false, error: "forbidden" }, 403);

    const phone = normalizePhone(org.whatsapp ?? "");
    if (!phone) return json({ ok: false, error: "no_whatsapp" }, 400);

    // 2) Créditos
    const { data: credits, error: cErr } = await admin
      .from("campaign_credits")
      .select("credits_total, credits_used")
      .eq("organization_id", orgId)
      .maybeSingle();
    if (cErr) throw cErr;
    if (!credits || credits.credits_used >= credits.credits_total) {
      return json({ ok: false, error: "no_credits" }, 402);
    }

    // 3) Debita 1 crédito com guarda contra race
    const { data: updated, error: uErr } = await admin
      .from("campaign_credits")
      .update({ credits_used: credits.credits_used + 1 })
      .eq("organization_id", orgId)
      .eq("credits_used", credits.credits_used)
      .select("id")
      .maybeSingle();
    if (uErr) throw uErr;
    if (!updated) return json({ ok: false, error: "race_retry" }, 409);

    // 4) Enfileira mensagem
    const { error: outErr } = await admin.from("whatsapp_outbox").insert({
      organization_id: orgId,
      phone,
      message,
      event_type: "campaign_test",
      status: "pending",
    });
    if (outErr) {
      // rollback do crédito
      await admin
        .from("campaign_credits")
        .update({ credits_used: credits.credits_used })
        .eq("organization_id", orgId);
      throw outErr;
    }

    // 5) Fire-and-forget do dispatcher
    fetch(`${SUPABASE_URL}/functions/v1/whatsapp-outbox-dispatch`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SERVICE}`,
      },
      body: "{}",
    }).catch(() => {});

    return json({ ok: true });
  } catch (e) {
    console.error("[campaign-send-test] error", e);
    return json({ ok: false, error: "internal", detail: (e as Error).message }, 500);
  }
});