import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limit em memória (process-level)
const lastReqByPhone = new Map<string, number>();

// Fire-and-forget: registra métrica de cada resposta do robô p/ o painel admin.
// Nunca deve derrubar a request principal — todos os erros são engolidos.
function maskPhone(phone: string): string {
  const digits = (phone || "").replace(/\D/g, "");
  if (digits.length < 6) return "****";
  return digits.slice(0, 4) + "****" + digits.slice(-2);
}
function recordBotMetric(
  sb: any,
  args: {
    organization_id?: string | null;
    provider?: string | null;
    status: string;
    latency_ms?: number | null;
    phone?: string | null;
    reply?: string | null;
  },
) {
  try {
    if (!sb) return;
    // Sem await — fire-and-forget, latência zero para o cliente.
    sb.from("ai_bot_metrics").insert({
      organization_id: args.organization_id ?? null,
      provider: args.provider ?? null,
      status: args.status,
      latency_ms: args.latency_ms ?? null,
      phone_hash: args.phone ? maskPhone(args.phone) : null,
      reply_preview: args.reply ? args.reply.slice(0, 240) : null,
    }).then(() => {}, (e: any) => {
      console.error("[ai-bot] metric insert failed:", e?.message ?? e);
    });
  } catch (e) {
    console.error("[ai-bot] metric exception:", (e as Error).message);
  }
}

// Cache in-memory: se Groq bater no limite diário (TPD), pula a chamada
// até a próxima meia-noite UTC (quando o quota do Groq reseta).
let groqBlockedUntil = 0;
let groqBlockHydrated = false;
function nextUtcMidnight(): number {
  const now = new Date();
  const next = new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0
  ));
  return next.getTime();
}

// Persistência entre isolates: platform_config.groq_blocked_until.
// Sem isso, cada request cold-start tenta o Groq de novo e leva 429 (~500ms perdidos).
async function hydrateGroqBlock(sb: any) {
  if (groqBlockHydrated) return;
  groqBlockHydrated = true;
  try {
    const { data } = await sb
      .from("platform_config")
      .select("groq_blocked_until")
      .limit(1)
      .maybeSingle();
    const iso = data?.groq_blocked_until;
    if (iso) {
      const ts = new Date(iso).getTime();
      if (!Number.isNaN(ts) && ts > Date.now()) {
        groqBlockedUntil = ts;
        console.log(`[callAI] groq block hydrated from DB until ${new Date(ts).toISOString()}`);
      }
    }
  } catch (e) {
    console.error("[callAI] hydrate groq block failed:", (e as Error).message);
  }
}
async function persistGroqBlock(sb: any, until: number) {
  try {
    const { data } = await sb.from("platform_config").select("id").limit(1).maybeSingle();
    if (data?.id) {
      await sb
        .from("platform_config")
        .update({ groq_blocked_until: new Date(until).toISOString() })
        .eq("id", data.id);
    }
  } catch (e) {
    console.error("[callAI] persist groq block failed:", (e as Error).message);
  }
}

/**
 * Cascata de IA gratuita: Groq → Cerebras. Fallback automático se um
 * provedor zerar limite (429/402), falhar (404/410/5xx) ou vier vazio.
 * Ambos são OpenAI-compatible. NÃO usar Lovable AI aqui.
 * Retorna { ok, content, provider, status?, error? }.
 */
async function callAICascade(
  messages: Array<{ role: string; content: string }>,
  maxTokens = 200,
  sb?: any,
) {
  const providers: Array<{
    name: string;
    key: string | undefined;
    url: string;
    model: string;
    authStyle?: "bearer" | "lovable";
  }> = [
    {
      name: "groq",
      key: Deno.env.get("GROQ_API_KEY"),
      url: "https://api.groq.com/openai/v1/chat/completions",
      model: "llama-3.3-70b-versatile",
    },
    {
      name: "cerebras",
      key: Deno.env.get("CEREBRAS_API_KEY"),
      url: "https://api.cerebras.ai/v1/chat/completions",
      model: "llama-3.3-70b",
    },
    {
      name: "cerebras-fallback",
      key: Deno.env.get("CEREBRAS_API_KEY"),
      url: "https://api.cerebras.ai/v1/chat/completions",
      model: "llama3.1-8b",
    },
    {
      name: "groq-8b",
      key: Deno.env.get("GROQ_API_KEY"),
      url: "https://api.groq.com/openai/v1/chat/completions",
      model: "llama-3.1-8b-instant",
    },
    // Lovable AI Gateway — cobertura extra quando Groq/Cerebras falham.
    // A chave LOVABLE_API_KEY é provisionada automaticamente pela plataforma.
    {
      name: "lovable-gemini-flash",
      key: Deno.env.get("LOVABLE_API_KEY"),
      url: "https://ai.gateway.lovable.dev/v1/chat/completions",
      model: "google/gemini-3-flash-preview",
      authStyle: "lovable",
    },
    {
      name: "lovable-gemini-lite",
      key: Deno.env.get("LOVABLE_API_KEY"),
      url: "https://ai.gateway.lovable.dev/v1/chat/completions",
      model: "google/gemini-3.1-flash-lite",
      authStyle: "lovable",
    },
    {
      name: "lovable-gpt5-nano",
      key: Deno.env.get("LOVABLE_API_KEY"),
      url: "https://ai.gateway.lovable.dev/v1/chat/completions",
      model: "openai/gpt-5-nano",
      authStyle: "lovable",
    },
  ];

  let lastStatus: "rate_limit" | "error" = "error";
  let lastError = "no provider configured";

  for (const p of providers) {
    if (!p.key) {
      console.log(`[callAI] ${p.name}: no key, skipping`);
      continue;
    }
    if (p.name === "groq" && Date.now() < groqBlockedUntil) {
      console.log(`[callAI] groq: TPD cache active, skipping until ${new Date(groqBlockedUntil).toISOString()}`);
      continue;
    }
    // Cerebras às vezes devolve content="" no primeiro shot; permite 1 retry.
    const attempts = p.name.startsWith("cerebras") ? 2 : 1;
    const authHeaders: Record<string, string> = p.authStyle === "lovable"
      ? { "Lovable-API-Key": p.key!, "Content-Type": "application/json" }
      : { Authorization: `Bearer ${p.key}`, "Content-Type": "application/json" };
    let gotEmpty = false;
    for (let attempt = 0; attempt < attempts; attempt++) {
      try {
        const t0 = Date.now();
        const res = await fetch(p.url, {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({
            model: p.model,
            messages,
            temperature: 0.7,
            max_tokens: maxTokens,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          const content = data.choices?.[0]?.message?.content || "";
          if (content) {
            console.log(`[callAI] ${p.name} ok in ${Date.now() - t0}ms${attempt > 0 ? ` (retry ${attempt})` : ""}`);
            return { ok: true as const, content, provider: p.name };
          }
          lastError = `${p.name}: empty content`;
          gotEmpty = true;
          console.log(`[callAI] ${p.name} empty content (attempt ${attempt + 1}/${attempts})`);
          continue; // tenta de novo se ainda tem attempts
        }
        const txt = await res.text();
        console.error(`[callAI] ${p.name} ${res.status}: ${txt.slice(0, 200)}`);
        lastError = `${p.name} ${res.status}`;
        lastStatus = res.status === 429 || res.status === 402 ? "rate_limit" : "error";
        if ((p.name === "groq" || p.name === "groq-8b") && res.status === 429 && /tokens per day|TPD/i.test(txt)) {
          // só bloqueia o groq principal — o 8b tem cota separada
          if (p.name === "groq") {
            groqBlockedUntil = nextUtcMidnight();
            console.log(`[callAI] groq TPD hit, blocking until ${new Date(groqBlockedUntil).toISOString()}`);
            if (sb) persistGroqBlock(sb, groqBlockedUntil).catch(() => {});
          }
        }
        break; // erro HTTP: pula pro próximo provider
      } catch (e) {
        console.error(`[callAI] ${p.name} threw:`, e);
        lastError = `${p.name}: ${(e as Error).message}`;
        break;
      }
    }
    void gotEmpty;
  }
  return { ok: false as const, status: lastStatus, error: lastError };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const reqT0 = Date.now();
    const {
      phone,
      message,
      organization_id: orgIdOverride,
      instance_token: tokenOverride,
      server_url: serverUrlOverride,
    } = await req.json();
    if (!phone || !message) {
      return new Response(JSON.stringify({ error: "phone and message required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ignorar mensagens automáticas de pedido/notificação (o bot não deve responder a si mesmo
    // nem a mensagens enviadas pelo sistema da loja). Se o texto casar com padrões de notificação
    // automática, retornar silenciosamente.
    const autoPatterns = [
      /novo pedido/i,
      /pedido\s*(#|n[º°o]|num)/i,
      /pedido\s+(aceito|confirmado|em prepara|pronto|despachado|saiu para entrega|entregue|cancelado|recusado)/i,
      /(aceito|confirmado|despachado|entregue|cancelado|recusado)\s*[!.:]/i,
      /^\s*(itens?|total|subtotal|forma de pagamento|troco|endere[çc]o de entrega)\s*[:\-]/im,
      /saiu para entrega/i,
      /seu pedido/i,
      /obrigado pela prefer[êe]ncia/i,
      /acompanhe seu pedido/i,
    ];
    if (autoPatterns.some((re) => re.test(message))) {
      console.log("[ai-bot] skipped auto-notification message");
      return new Response(
        JSON.stringify({ ok: true, skipped: true, reason: "auto_notification" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Rate limit: 1 req/seg por phone
    const now = Date.now();
    const last = lastReqByPhone.get(phone) ?? 0;
    if (now - last < 1000) {
      return new Response(JSON.stringify({ error: "rate_limited" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    lastReqByPhone.set(phone, now);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Hidrata bloqueio persistido do Groq (não tenta Groq se o dia bateu no teto)
    await hydrateGroqBlock(supabase);

    // 1) Carregar config: preferir config da própria loja; fallback no singleton
    let config: any = null;
    if (orgIdOverride) {
      const { data } = await supabase
        .from("ai_bot_config")
        .select("*")
        .eq("organization_id", orgIdOverride)
        .maybeSingle();
      config = data;
      // ISOLAMENTO: se veio organization_id (loja real), NÃO cair no singleton global.
      // Cada loja responde com sua própria config; se não tem config, fica em silêncio.
      if (!config) {
        console.log(`[ai-bot] skipped org=${orgIdOverride} reason=store_bot_config_missing`);
        return new Response(
          JSON.stringify({ ok: true, skipped: true, reason: "store_bot_config_missing" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }
    if (!config) {
      const { data } = await supabase
        .from("ai_bot_config")
        .select("*")
        .is("organization_id", null)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      config = data;
    }

    const effectiveOrgId = orgIdOverride || config?.test_org_id || null;
    const defaultServerUrl = (Deno.env.get("UAZAPI_SERVER_URL") || "https://free.uazapi.com").replace(/\/$/, "");
    let effectiveServerUrl = serverUrlOverride
      ? String(serverUrlOverride).replace(/\/$/, "")
      : defaultServerUrl;

    // Token sempre vem vivo: do caller (webhook) ou buscado em whatsapp_instances.
    // Sem fallback pra token salvo no ai_bot_config (não existe mais).
    let effectiveToken: string | null = tokenOverride || null;
    if (!effectiveToken && effectiveOrgId) {
      const { data: inst } = await supabase
        .from("whatsapp_instances")
        .select("instance_token, server_url")
        .eq("organization_id", effectiveOrgId)
        .maybeSingle();
      effectiveToken = inst?.instance_token || null;
      if (inst?.server_url) effectiveServerUrl = inst.server_url.replace(/\/$/, "");
    } else if (effectiveOrgId) {
      // Token veio do caller; ainda assim tenta puxar server_url da loja
      const { data: inst } = await supabase
        .from("whatsapp_instances")
        .select("server_url")
        .eq("organization_id", effectiveOrgId)
        .maybeSingle();
      if (inst?.server_url) effectiveServerUrl = inst.server_url.replace(/\/$/, "");
    }

    if (!effectiveToken) {
      return new Response(
        JSON.stringify({ ok: true, skipped: true, reason: "no_instance" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Respeitar enabled da config (singleton ou da loja)
    if (!config || !config.enabled) {
      return new Response(JSON.stringify({ ok: true, skipped: true, reason: "bot_disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GATE POR PLANO: bot só responde para lojas no plano pago (pro/enterprise/lifetime).
    // Lojas no Free (ou com assinatura expirada) param de receber respostas automáticas
    // até renovarem. Retorna 200 silencioso pra não quebrar o webhook do uazapi.
    if (effectiveOrgId) {
      const { data: planResult } = await supabase
        .rpc("get_effective_plan", { _org_id: effectiveOrgId });
      const effectivePlan = (planResult as string) || "free";
      if (effectivePlan === "free") {
        return new Response(
          JSON.stringify({ ok: true, skipped: true, reason: "plan_free_or_expired" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // GATE POR LOJA: admin controla via organizations.whatsapp_bot_allowed.
    // Se a chave estiver desligada para esta loja específica, o bot fica em silêncio
    // só nela — outras lojas continuam respondendo normalmente.
    if (effectiveOrgId) {
      const { data: orgGate } = await supabase
        .from("organizations")
        .select("whatsapp_bot_allowed")
        .eq("id", effectiveOrgId)
        .maybeSingle();
      if (!orgGate?.whatsapp_bot_allowed) {
        console.log(`[ai-bot] skipped org=${effectiveOrgId} reason=bot_not_allowed_for_org`);
        return new Response(
          JSON.stringify({ ok: true, skipped: true, reason: "bot_not_allowed_for_org" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // 2) Carregar contexto da loja (multi-tenant ou test)
    let storeContext = "";
    let orgSlug: string | null = null;
    if (effectiveOrgId) {
      const [{ data: org }, { data: menu }, { data: hoods }] = await Promise.all([
        supabase
          .from("organizations")
          .select("name, slug, whatsapp, store_address, business_hours, description")
          .eq("id", effectiveOrgId)
          .maybeSingle(),
        supabase
          .from("menu_items")
          .select("name, description, price, category")
          .eq("organization_id", effectiveOrgId)
          .eq("available", true)
          .gt("price", 0)
          .order("category"),
        supabase
          .from("delivery_neighborhoods")
          .select("name, fee")
          .eq("organization_id", effectiveOrgId)
          .eq("active", true),
      ]);

      if (org) {
        orgSlug = org.slug ?? null;
        storeContext += `\n\n## LOJA: ${org.name}\n`;
        if (org.description) storeContext += `${org.description}\n`;
        if (org.store_address) storeContext += `Endereço: ${org.store_address}\n`;
        if (org.whatsapp) storeContext += `WhatsApp: ${org.whatsapp}\n`;
        storeContext += `Link do cardápio: https://trendfood.site/unidade/${org.slug}\n`;

        if (org.business_hours) {
          storeContext += `\n## HORÁRIOS\n${JSON.stringify(org.business_hours)}\n`;
        }
      }

      if (menu && menu.length > 0) {
        const byCat: Record<string, typeof menu> = {};
        for (const item of menu) {
          const cat = item.category || "Outros";
          (byCat[cat] ||= []).push(item);
        }
        storeContext += `\n## CARDÁPIO\n`;
        for (const [cat, items] of Object.entries(byCat)) {
          storeContext += `\n### ${cat}\n`;
          for (const i of items) {
            storeContext += `- ${i.name} — R$ ${Number(i.price).toFixed(2)}${i.description ? ` (${i.description})` : ""}\n`;
          }
        }
      }

      if (hoods && hoods.length > 0) {
        storeContext += `\n## ENTREGA - BAIRROS\n`;
        for (const h of hoods) {
          storeContext += `- ${h.name}: R$ ${Number(h.fee).toFixed(2)}\n`;
        }
      }
    }

    // 3) Histórico (últimas 10 trocas)
    let historyQuery = supabase
      .from("fila_whatsapp")
      .select("incoming_message, ai_response, status, created_at")
      .eq("phone", phone)
      .not("ai_response", "is", null)
      .order("created_at", { ascending: false })
      .limit(10);
    if (effectiveOrgId) historyQuery = historyQuery.eq("organization_id", effectiveOrgId);
    const { data: history } = await historyQuery;

    // === HANDOFF HUMANO ===
    // 3.1) Sem silêncio persistente. O robô só cala a boca se a MENSAGEM ATUAL
    //      tem gatilho (pediu humano, reclamou, repetiu). Handoffs antigos não
    //      bloqueiam mais mensagens novas como "oi", "link", "cardápio".
    // 3.2) Detectar gatilhos de handoff na mensagem atual
    const normMsg = (s: string) =>
      (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
    const msgLow = normMsg(message);
    const asksHuman =
      /\b(humano|atendente|pessoa|gerente|dono|responsavel|nao\s+sou\s+robo|chama\s+(o|a)\s+dono)\b/.test(msgLow) ||
      /\bfalar\s+com\s+(alguem|voce|um|uma|humano|atendente|pessoa|gerente|dono)\b/.test(msgLow);
    const isComplaint =
      /\b(reclama|reclamacao|reembolso|estornar|cancelar\s+pedido|nao\s+chegou|veio\s+errado|frio|atrasou|demorou\s+demais|pessimo|horrivel|pra\s?ga|golpe|fraude)\b/.test(msgLow);
    let repeated = false;
    if (history && history.length >= 2) {
      const prev = history.slice(0, 2).map((h) => normMsg(h.incoming_message || ""));
      if (msgLow.length >= 3 && prev.some((p) => p && p === msgLow)) repeated = true;
    }
    const handoffReason = asksHuman
      ? "humano_pedido"
      : isComplaint
        ? "reclamacao"
        : repeated
          ? "repeticao"
          : null;

    if (handoffReason) {
      const handoffText = "Vou chamar o pessoal da loja aqui pra te atender, um minutinho 🙏";
      // Enviar msg fixa pro cliente via uazapi
      let sentHandoff = false;
      let handoffErr: string | null = null;
      if (effectiveServerUrl && effectiveToken) {
        try {
          const r = await fetch(`${effectiveServerUrl}/send/text`, {
            method: "POST",
            headers: { "Content-Type": "application/json", token: effectiveToken },
            body: JSON.stringify({ number: phone, text: handoffText }),
          });
          sentHandoff = r.ok;
          if (!r.ok) handoffErr = await r.text();
        } catch (e) { handoffErr = (e as Error).message; }
      }
      // Marcar handoff no histórico
      await supabase.from("fila_whatsapp").insert({
        phone,
        incoming_message: message,
        ai_response: handoffText,
        status: "humano",
        responded_at: new Date().toISOString(),
        organization_id: effectiveOrgId,
      });
      // Notificar dono via mesma instância (best-effort). Manda pro WhatsApp da loja.
      if (effectiveOrgId) {
        try {
          const { data: org } = await supabase
            .from("organizations")
            .select("whatsapp")
            .eq("id", effectiveOrgId)
            .maybeSingle();
          const ownerPhone = (org?.whatsapp || "").replace(/\D/g, "");
          if (ownerPhone && ownerPhone !== phone && effectiveServerUrl && effectiveToken) {
            const notice =
              `⚠️ Cliente ${phone} pediu atendimento humano (motivo: ${handoffReason}).\n` +
              `Última mensagem: "${String(message).slice(0, 200)}"`;
            await fetch(`${effectiveServerUrl}/send/text`, {
              method: "POST",
              headers: { "Content-Type": "application/json", token: effectiveToken },
              body: JSON.stringify({ number: ownerPhone, text: notice }),
            }).catch(() => {});
          }
        } catch (_) { /* no-op */ }
      }
      console.log(`[ai-bot] handoff org=${effectiveOrgId ?? "null"} reason=${handoffReason} phone=${phone} sent=${sentHandoff}`);
      return new Response(
        JSON.stringify({ ok: true, handoff: true, reason: handoffReason, sent: sentHandoff, sendError: handoffErr }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // === MODO LINK-ONLY ===
    // Fluxo padrão: qualquer mensagem que não seja handoff/auto-notificação
    // recebe imediatamente o link do cardápio. Sem IA, sem token.
    if (orgSlug) {
      const menuUrl = `https://trendfood.site/unidade/${orgSlug}`;
      const recentReplies = (history || []).slice(0, 2).map((h) => h.ai_response || "").join("\n");
      const linkSentRecently = /https?:\/\/[^\s]*trendfood\.(site|lovable\.app)/i.test(recentReplies);
      const linkReply = linkSentRecently
        ? `Link: ${menuUrl}`
        : `Olá! 😊 Aqui está o link do nosso cardápio:\n${menuUrl}\n\nÉ só escolher os itens e finalizar o pedido por lá.`;

      let sentLink = false;
      let linkErr: string | null = null;
      if (effectiveServerUrl && effectiveToken) {
        try {
          const r = await fetch(`${effectiveServerUrl}/send/text`, {
            method: "POST",
            headers: { "Content-Type": "application/json", token: effectiveToken },
            body: JSON.stringify({ number: phone, text: linkReply }),
          });
          sentLink = r.ok;
          if (!r.ok) linkErr = await r.text();
        } catch (e) { linkErr = (e as Error).message; }
      }
      await supabase.from("fila_whatsapp").insert({
        phone,
        incoming_message: message,
        ai_response: linkReply,
        status: "respondido",
        responded_at: new Date().toISOString(),
        organization_id: effectiveOrgId,
      });
      recordBotMetric(supabase, {
        organization_id: effectiveOrgId,
        provider: "link-only",
        status: sentLink ? "sent" : "wa_send_failed",
        latency_ms: Date.now() - reqT0,
        phone,
        reply: linkReply,
      });
      console.log(`[ai-bot] link-only org=${effectiveOrgId ?? "null"} sent=${sentLink} in ${Date.now() - reqT0}ms`);
      return new Response(
        JSON.stringify({ ok: true, mode: "link-only", sent: sentLink, sendError: linkErr, response: linkReply }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Sem orgSlug (config singleton sem loja): fallback pra saudação simples se configurada.
    const greetingMessage: string | null = (config?.greeting_message || "").toString().trim() || null;
    if ((!history || history.length === 0) && greetingMessage) {
      let sentGreet = false;
      let greetErr: string | null = null;
      try {
        const sendRes = await fetch(`${effectiveServerUrl}/send/text`, {
          method: "POST",
          headers: { "Content-Type": "application/json", token: effectiveToken },
          body: JSON.stringify({ number: phone, text: greetingMessage }),
        });
        sentGreet = sendRes.ok;
        if (!sendRes.ok) greetErr = await sendRes.text();
      } catch (e) {
        greetErr = (e as Error).message;
      }
      await supabase.from("fila_whatsapp").insert({
        phone,
        incoming_message: message,
        ai_response: greetingMessage,
        status: "respondido",
        responded_at: new Date().toISOString(),
        organization_id: effectiveOrgId,
      });
      console.log(`[ai-bot] greeting-sent org=${effectiveOrgId ?? "null"} ok=${sentGreet}`);
      return new Response(
        JSON.stringify({ ok: true, greeting: true, sent: sentGreet, sendError: greetErr }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const defaultPrompt = `Voce e o atendente virtual da loja no WhatsApp. Seu nome e *Leo*. Se apresente como Leo APENAS na primeira mensagem da conversa; depois disso, nao repita o nome.

MISSAO: atender rapido, tirar duvida com informacao real, ajudar o cliente a fechar o pedido. Voce nao e um FAQ, e um atendente humano-digital.

REGRAS DE FORMATO (WhatsApp puro):
- Use *negrito* com UM asterisco apenas (nunca **duplo**).
- URLs cruas, sem colchetes nem parenteses. Ex: https://trendfood.lovable.app/unidade/slug
- Nada de markdown de titulo (##, ###) nem link [texto](url).
- 1 a 2 emojis por mensagem, no maximo.
- Respostas CURTAS: no maximo 4 linhas. Excecao: quando listar o cardapio.
- Uma pergunta por vez. Nunca dispare 3 perguntas juntas.

REGRAS DE CONTEUDO (anti-alucinacao):
- Use APENAS o que esta no contexto da loja (cardapio, horarios, bairros, taxas, endereco, link). Se o cliente perguntar algo que nao esta no contexto, diga "deixa eu confirmar com o pessoal da loja e ja te falo" e pare.
- NUNCA invente item, preco, promocao, horario, bairro ou taxa.
- Quando o cliente pedir o cardapio ou perguntar "o que tem", liste os ITENS reais agrupados por categoria:

  🍔 *Categoria*
  • Nome do item — R$ 00,00

- Categoria e titulo de secao. NUNCA cite "Bebidas" ou "Lanches" como se fosse um produto.
- Se perguntarem se esta aberto, responda com base nos horarios do contexto. Nao chute.
- Nao prometa prazo de entrega especifico se nao tiver essa info no contexto.

REGRAS DE TOM:
- Fale como brasileiro de verdade: leve, direto, educado, sem gerundio robotico ("estarei enviando").
- Responda a pergunta do cliente PRIMEIRO com informacao concreta. Depois, se fizer sentido, uma perguntinha curta pra manter o papo.
- NUNCA responda somente com um link. Sempre uma frase amigavel antes.
- So envie o link do cardapio quando o cliente PEDIR ("manda o cardapio", "quero fazer pedido", "tem link?", "como peco?"). Fora disso, nao mande link.
- Pedidos fora do escopo (ex: "voce vende carro?"): responde curto, com leve bom humor, e puxa pra algo do cardapio.

ANTI-REPETICAO:
- NUNCA repita a mesma frase ou pergunta duas vezes seguidas. Se o cliente nao respondeu, muda o angulo ou espera.
- Nao mande a mesma saudacao mais de uma vez na conversa.
- Nao repita o link do cardapio se ja mandou nas ultimas mensagens.

FLUXO DE PEDIDO (quando o cliente quiser pedir):
Colete UMA coisa por vez, nesta ordem:
1) O que ele quer (item + adicionais).
2) Retirada, mesa ou entrega. Se entrega: bairro + endereco (rua, numero, referencia).
3) Forma de pagamento (PIX, cartao na entrega, dinheiro/troco).
4) Confirme o resumo com TOTAL antes de fechar: itens, endereco, pagamento, total em R$.
5) So depois disso mande o link pra ele finalizar no site (se ele preferir), ou avise que ja passou pra cozinha.

ESCALONAMENTO PRO HUMANO:
- Se o cliente pedir pra falar com pessoa, reclamar de pedido, cancelar pedido ja feito, pedir reembolso, ou repetir a mesma duvida duas vezes sem entender sua resposta: responda "Vou chamar o pessoal da loja aqui, um minutinho 🙏" e PARE de responder.

Seja util, humano, rapido e nao enrole.`;

    const systemPrompt = config?.system_prompt || defaultPrompt;

    // === Anti-repetição: últimas 3 respostas do robô + detecção de "cliente não avançou" ===
    const normalize = (s: string) =>
      (s || "")
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/https?:\/\/\S+/g, "")
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .replace(/\s+/g, " ")
        .trim();
    const lastBotReplies = (history || [])
      .slice(0, 3)
      .map((h) => (h.ai_response || "").trim())
      .filter(Boolean);
    const lastIncoming = normalize((history || [])[0]?.incoming_message || "");
    const curIncoming = normalize(message);
    const clientDidNotAdvance =
      lastBotReplies.length > 0 &&
      (curIncoming.length < 3 || curIncoming === lastIncoming);

    let antiRepeatBlock = "";
    if (lastBotReplies.length > 0) {
      const bullets = lastBotReplies.map((r) => `- "${r.replace(/\n/g, " ").slice(0, 180)}"`).join("\n");
      antiRepeatBlock =
        `\n\n## ULTIMAS RESPOSTAS QUE VOCE JA MANDOU (NAO REPITA)\n${bullets}\n` +
        `REGRA: nao repita frase, pergunta ou saudacao ja enviada acima. ` +
        (clientDidNotAdvance
          ? `O cliente NAO avançou desde sua ultima mensagem — MUDE de angulo: proponha outra coisa, faca outra pergunta OU seja breve. Nao reenvie a mesma saudacao/pergunta.`
          : `Se o cliente nao avancou, mude de angulo (proponha outra coisa, faca outra pergunta).`);
    }

    const messages: { role: string; content: string }[] = [
      { role: "system", content: `${systemPrompt}\n${storeContext}${antiRepeatBlock}` },
    ];
    if (history) {
      for (const h of history.reverse()) {
        messages.push({ role: "user", content: h.incoming_message });
        if (h.ai_response) messages.push({ role: "assistant", content: h.ai_response });
      }
    }
    messages.push({ role: "user", content: message });

    // === Fast-path: cliente pediu explicitamente o link/cardápio ===
    // Evita ~3-4s de latência do LLM só pra devolver um link que já sabemos.
    // Só dispara quando: (a) temos slug da loja, (b) msg é curta e claramente
    // pedindo cardápio/link, (c) não mandamos link nas últimas 3 respostas.
    const msgLowFast = String(message).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const explicitMenuAsk = /^(?:me\s+)?(?:manda|envia|passa|quero|tem|qual|onde|como)?\s*(?:o\s+)?(?:link|cardap[io]o?|menu|pedir|fazer\s+pedido|pedido)\??$/i.test(msgLowFast.trim()) ||
      /\b(manda|envia|passa|quero)\s+(?:o\s+)?(?:link|cardap[io]o?|menu)\b/i.test(msgLowFast) ||
      /\b(tem\s+link|qual\s+(?:o\s+)?link|onde\s+pe[cç]o|como\s+pe[cç]o)\b/i.test(msgLowFast);
    const recentRepliesFast = (history || []).slice(0, 3).map(h => h.ai_response || "").join("\n");
    const linkRecentFast = /https?:\/\/[^\s]*trendfood\.lovable\.app/i.test(recentRepliesFast);
    if (orgSlug && explicitMenuAsk && !linkRecentFast && msgLowFast.length <= 60) {
      const fastReply = `Aqui está o link do nosso cardápio: https://trendfood.lovable.app/unidade/${orgSlug}`;
      let sentFast = false;
      let fastErr: string | null = null;
      if (effectiveServerUrl && effectiveToken) {
        try {
          const r = await fetch(`${effectiveServerUrl}/send/text`, {
            method: "POST",
            headers: { "Content-Type": "application/json", token: effectiveToken },
            body: JSON.stringify({ number: phone, text: fastReply }),
          });
          sentFast = r.ok;
          if (!r.ok) fastErr = await r.text();
        } catch (e) { fastErr = (e as Error).message; }
      }
      await supabase.from("fila_whatsapp").insert({
        phone,
        incoming_message: message,
        ai_response: fastReply,
        status: "respondido",
        responded_at: new Date().toISOString(),
        organization_id: effectiveOrgId,
      });
      console.log(`[ai-bot] fast-link-path org=${effectiveOrgId ?? "null"} sent=${sentFast} in ${Date.now() - reqT0}ms`);
      recordBotMetric(supabase, {
        organization_id: effectiveOrgId,
        provider: "fast-link",
        status: sentFast ? "sent" : "wa_send_failed",
        latency_ms: Date.now() - reqT0,
        phone,
        reply: fastReply,
      });
      return new Response(
        JSON.stringify({ ok: true, fastPath: "link", sent: sentFast, sendError: fastErr, response: fastReply }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 4) Cascata IA free: Groq → Cerebras (fallback automático se um zerar/falhar)
    const aiT0 = Date.now();
    let aiData = await callAICascade(messages, 200, supabase);
    console.log(`[ai-bot] ai-call total ${Date.now() - aiT0}ms`);
    if (aiData.status === "rate_limit") {
      console.log(`[ai-bot] finalized reason=ai_rate_limit`);
      recordBotMetric(supabase, { organization_id: effectiveOrgId, provider: aiData.provider, status: "ai_rate_limit", latency_ms: Date.now() - reqT0, phone });
      return new Response(JSON.stringify({ error: "ai_rate_limit" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiData.ok) {
      console.error("[ai-bot-respond] all providers failed:", aiData.error);
      console.log(`[ai-bot] finalized reason=ai_unavailable detail=${aiData.error}`);
      recordBotMetric(supabase, { organization_id: effectiveOrgId, provider: aiData.provider, status: "ai_unavailable", latency_ms: Date.now() - reqT0, phone });
      return new Response(
        JSON.stringify({ error: "ai_unavailable", fallback: true, detail: aiData.error }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    console.log(`[ai-bot-respond] provider=${aiData.provider}`);
    let reply =
      aiData.content || "Desculpa, tive um problema aqui. Pode repetir?";

    // === Guard pós-geração: similaridade com últimas 3 respostas ===
    const isDuplicateOf = (candidate: string): boolean => {
      const cand = normalize(candidate);
      if (!cand) return false;
      const candTokens = new Set(cand.split(" ").filter((t) => t.length > 2));
      const candFirst = cand.split(/[.!?\n]/)[0]?.trim() || cand;
      for (const prev of lastBotReplies) {
        const p = normalize(prev);
        if (!p) continue;
        const pFirst = p.split(/[.!?\n]/)[0]?.trim() || p;
        if (candFirst && candFirst === pFirst) return true;
        const pTokens = new Set(p.split(" ").filter((t) => t.length > 2));
        if (candTokens.size === 0 || pTokens.size === 0) continue;
        let inter = 0;
        for (const t of candTokens) if (pTokens.has(t)) inter++;
        const union = new Set([...candTokens, ...pTokens]).size;
        const jaccard = union ? inter / union : 0;
        if (jaccard >= 0.75) return true;
      }
      return false;
    };

    let duplicate = false;
    let retried = false;
    let suppressed = false;
    // Só re-chama o LLM se a resposta for longa o bastante pra valer a pena;
    // saudações curtas ("opa tudo bem?") baterem em duplicate é esperado e o
    // retry só adiciona ~1-2s de latência sem ganho real.
    if (reply.length >= 40 && isDuplicateOf(reply)) {
      duplicate = true;
      retried = true;
      const retryMessages = [
        ...messages,
        { role: "assistant", content: reply },
        {
          role: "system",
          content:
            "A resposta anterior ficou muito parecida com algo que voce ja mandou. Reformule com OUTRO angulo, outra pergunta, e NAO repita saudacao. Seja curto.",
        },
      ];
      const retryData = await callAICascade(retryMessages, 200, supabase);
      if (retryData.ok && retryData.content) {
        reply = retryData.content;
        if (isDuplicateOf(reply)) suppressed = true;
      } else {
        suppressed = true;
      }
    }
    console.log(`[ai-bot] anti-repeat org=${effectiveOrgId ?? "null"} duplicate=${duplicate} retried=${retried} suppressed=${suppressed}`);
    if (suppressed) {
      console.log(`[ai-bot] finalized reason=duplicate_reply_suppressed`);
      recordBotMetric(supabase, { organization_id: effectiveOrgId, provider: aiData.provider, status: "duplicate_reply_suppressed", latency_ms: Date.now() - reqT0, phone, reply });
      return new Response(
        JSON.stringify({ ok: true, skipped: true, reason: "duplicate_reply_suppressed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // === Anti-spam de link do cardápio ===
    // 1) Só permite link se o cliente pediu explicitamente NESTA mensagem.
    // 2) Se já mandamos o link nas últimas 3 respostas, não repete.
    const askedForMenu = /\b(cardap|menu|link|pedir|pedido|fazer\s+pedido|como\s+pe[cç]o|onde\s+pe[cç]o)\b/i.test(message);
    const recentReplies = (history || []).slice(0, 3).map(h => h.ai_response || "").join("\n");
    const linkAlreadySentRecently = /https?:\/\/[^\s]*trendfood\.lovable\.app/i.test(recentReplies);
    const replyHasLink = /https?:\/\/[^\s]*trendfood\.lovable\.app/i.test(reply);
    if (askedForMenu) {
      // Cliente pediu link/cardápio: NUNCA cortar URL. Se a IA esqueceu de
      // mandar, a gente completa com o link determinístico.
      if (!replyHasLink && orgSlug) {
        const url = `https://trendfood.lovable.app/unidade/${orgSlug}`;
        reply = reply.trim()
          ? `${reply.trim()}\n${url}`
          : `Aqui está o link do nosso cardápio: ${url}`;
      }
    } else {
      // Cliente NÃO pediu link: remove URL para não spammar.
      reply = reply
        .replace(/https?:\/\/(?:www\.)?trendfood\.lovable\.app\/\S*/gi, "")
        .replace(/[ \t]{2,}/g, " ")
        .replace(/\s*\n\s*\n\s*/g, "\n\n")
        .replace(/^[\s•\-–—:]+$/gm, "")
        .trim();
      if (!reply) {
        reply = "Tô por aqui! Me diz o que você quer que eu te ajudo.";
      }
    }
    console.log(`[ai-bot] llm-reply len=${reply.length} askedMenu=${askedForMenu} linkRecent=${linkAlreadySentRecently} hasLink=${replyHasLink}`);

    // 5) Enviar resposta de volta via uazapiGO
    let sent = false;
    let sendError: string | null = null;
    if (effectiveServerUrl && effectiveToken) {
      try {
        const sendT0 = Date.now();
        const sendRes = await fetch(
          `${effectiveServerUrl}/send/text`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              token: effectiveToken,
            },
            body: JSON.stringify({ number: phone, text: reply }),
          },
        );
        sent = sendRes.ok;
        console.log(`[ai-bot] wa-send ${sendRes.status} in ${Date.now() - sendT0}ms`);
        if (!sendRes.ok) {
          sendError = await sendRes.text();
          console.error("uazapi send error:", sendRes.status, sendError);
        }
      } catch (e) {
        sendError = (e as Error).message;
        console.error("uazapi send exception:", sendError);
      }
    }

    // 6) Salvar
    await supabase.from("fila_whatsapp").insert({
      phone,
      incoming_message: message,
      ai_response: reply,
      status: "respondido",
      responded_at: new Date().toISOString(),
      organization_id: effectiveOrgId,
    });

    console.log(`[ai-bot] finalized reason=${sent ? "sent" : "wa_send_failed"} err=${sendError ?? ""}`);
    recordBotMetric(supabase, {
      organization_id: effectiveOrgId,
      provider: aiData.provider,
      status: sent ? "sent" : "wa_send_failed",
      latency_ms: Date.now() - reqT0,
      phone,
      reply,
    });
    return new Response(JSON.stringify({ ok: true, response: reply, sent, sendError }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("ai-bot-respond error:", err);
    console.log(`[ai-bot] finalized reason=exception msg=${(err as Error).message}`);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
