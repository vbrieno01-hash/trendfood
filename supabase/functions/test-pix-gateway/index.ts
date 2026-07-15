import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ ok: false, error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ ok: false, error: "Sessão inválida" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const provider = String(body?.provider || "").trim();
    const gwToken = String(body?.token || "").trim();
    if (!provider || !gwToken) {
      return new Response(JSON.stringify({ ok: false, error: "Provedor e token são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      if (provider === "mercadopago") {
        if (!gwToken.startsWith("APP_USR-") && !gwToken.startsWith("TEST-")) {
          return new Response(JSON.stringify({ ok: false, error: "Token do Mercado Pago deve começar com APP_USR- (produção) ou TEST- (sandbox)" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const r = await fetch("https://api.mercadopago.com/users/me", {
          headers: { Authorization: `Bearer ${gwToken}` },
          signal: controller.signal,
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) {
          const msg = j?.message || j?.error || `HTTP ${r.status}`;
          return new Response(JSON.stringify({ ok: false, error: `Mercado Pago: ${msg}` }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const account = j?.nickname || j?.email || j?.first_name || `ID ${j?.id}`;
        const isSandbox = gwToken.startsWith("TEST-");
        return new Response(
          JSON.stringify({
            ok: true,
            account,
            sandbox: isSandbox,
            site_id: j?.site_id,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify({
          ok: true,
          skipped: true,
          error: "Teste automático não disponível para este provedor. Salve e faça um pedido PIX de teste.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    } finally {
      clearTimeout(timeout);
    }
  } catch (e: any) {
    const msg = e?.name === "AbortError" ? "Timeout (10s) — o provedor não respondeu" : (e?.message || "Erro inesperado");
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});