import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limit em memória (process-level)
const lastReqByPhone = new Map<string, number>();

// Anti-repeat do pool de mensagens prontas (por telefone, best-effort no isolate)
const lastFallbackIdxByPhone = new Map<string, number>();

// ============ Store status (loja aberta agora?) — port de src/lib/storeStatus.ts ============
const DAY_MAP: Record<number, string> = { 0: "dom", 1: "seg", 2: "ter", 3: "qua", 4: "qui", 5: "sex", 6: "sab" };
const DAY_LABELS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

function nowInBrasilia(): { dow: number; minutes: number } {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false,
  });
  const parts = fmt.formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const wk: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const h = parseInt(get("hour"), 10);
  const mi = parseInt(get("minute"), 10);
  return {
    dow: wk[get("weekday")] ?? 0,
    minutes: (Number.isFinite(h) ? h % 24 : 0) * 60 + (Number.isFinite(mi) ? mi : 0),
  };
}
function toMin(t: string): number {
  const [h, m] = (t || "00:00").split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}
function toMinClose(t: string): number {
  const v = toMin(t);
  return v === 0 ? 1440 : v;
}

type StoreStatusLite = { open: true } | { open: false; opensAt: string | null; opensDayLabel: string | null };

function isStoreOpenNow(bh: any, paused?: boolean, forceOpen?: boolean): StoreStatusLite {
  if (paused === true) return { open: false, opensAt: null, opensDayLabel: null };
  if (!bh || !bh.enabled || !bh.schedule) return { open: true };
  const { dow, minutes } = nowInBrasilia();

  // Turno do dia anterior que cruza meia-noite
  const prevKey = DAY_MAP[(dow + 6) % 7];
  const prev = bh.schedule[prevKey];
  if (prev && prev.open) {
    const pf = toMin(prev.from);
    const pt = toMinClose(prev.to);
    if (pt < pf && minutes < pt) {
      if (prev.break_from && prev.break_to) {
        const bf = toMin(prev.break_from), bt = toMin(prev.break_to);
        if (minutes >= bf && minutes < bt) return { open: false, opensAt: prev.break_to, opensDayLabel: null };
      }
      return { open: true };
    }
  }

  const today = bh.schedule[DAY_MAP[dow]];
  const findNext = (): { time: string; offset: number } | null => {
    for (let i = 1; i <= 7; i++) {
      const d = bh.schedule[DAY_MAP[(dow + i) % 7]];
      if (d && d.open) return { time: d.from, offset: i };
    }
    return null;
  };
  const labelFromOffset = (off: number) =>
    off <= 0 ? null : off === 1 ? "amanhã" : (DAY_LABELS[(dow + off) % 7] ?? null);

  if (forceOpen) {
    if (today?.break_from && today?.break_to) {
      const bf = toMin(today.break_from), bt = toMin(today.break_to);
      if (minutes >= bf && minutes < bt) return { open: false, opensAt: today.break_to, opensDayLabel: null };
    }
    return { open: true };
  }

  if (!today || !today.open) {
    const nx = findNext();
    return { open: false, opensAt: nx?.time ?? null, opensDayLabel: nx ? labelFromOffset(nx.offset) : null };
  }
  const fm = toMin(today.from);
  const tm = toMinClose(today.to);
  const isOpen = tm > fm ? (minutes >= fm && minutes < tm) : (minutes >= fm);
  if (isOpen) {
    if (today.break_from && today.break_to) {
      const bf = toMin(today.break_from), bt = toMin(today.break_to);
      if (minutes >= bf && minutes < bt) return { open: false, opensAt: today.break_to, opensDayLabel: null };
    }
    return { open: true };
  }
  if (minutes < fm) return { open: false, opensAt: today.from, opensDayLabel: null };
  const nx = findNext();
  return { open: false, opensAt: nx?.time ?? null, opensDayLabel: nx ? labelFromOffset(nx.offset) : null };
}
// ==========================================================================================

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

    // GATE POR ADD-ON: se a loja está flageada como requires_ai_bot_addon,
    // o add-on precisa estar 'active' E dentro do período pago.
    // Espelha exatamente a lógica de usePlanLimits para não criar divergência.
    if (effectiveOrgId) {
      const { data: orgFlag } = await supabase
        .from("organizations")
        .select("requires_ai_bot_addon")
        .eq("id", effectiveOrgId)
        .maybeSingle();

      if ((orgFlag as any)?.requires_ai_bot_addon) {
        const { data: addon } = await supabase
          .from("org_addons")
          .select("status, current_period_end")
          .eq("organization_id", effectiveOrgId)
          .eq("addon_key", "ai_bot")
          .maybeSingle();

        const periodEnd = addon?.current_period_end ? new Date(addon.current_period_end) : null;
        const addonActive = addon?.status === "active" && !!periodEnd && periodEnd > new Date();

        if (!addonActive) {
          console.log(`[ai-bot] skipped org=${effectiveOrgId} reason=addon_expired_or_missing`);
          return new Response(
            JSON.stringify({ ok: true, skipped: true, reason: "addon_expired_or_missing" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      }
    }

    // 2) Carregar contexto da loja (multi-tenant ou test)
    let storeContext = "";
    let orgSlug: string | null = null;
    let orgData: any = null;
    let hoodsData: Array<{ name: string; fee: number }> = [];
    if (effectiveOrgId) {
      const [{ data: org }, { data: menu }, { data: hoods }] = await Promise.all([
        supabase
          .from("organizations")
          .select("name, slug, whatsapp, store_address, business_hours, description, paused, force_open")
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
        orgData = org;
        storeContext += `\n\n## LOJA: ${org.name}\n`;
        if (org.description) storeContext += `${org.description}\n`;
        if (org.store_address) storeContext += `Endereço: ${org.store_address}\n`;
        if (org.whatsapp) storeContext += `WhatsApp: ${org.whatsapp}\n`;
        storeContext += `Link do cardápio: https://trendfood.site/${org.slug}\n`;

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
        hoodsData = hoods as any;
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

    // === Flag: envio automático de link ===
    // Quando `send_menu_link === false`, o robô só envia o link do cardápio se
    // o cliente PEDIR explicitamente. Default `true` = comportamento antigo.
    const sendMenuLinkAllowed = config?.send_menu_link !== false;
    const msgLowForLinkAsk = String(message)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    const clientAskedForLink =
      /\b(link|cardap[io]o?|menu|catalogo|url|site|quero\s+pedir|fazer\s+pedido|bora\s+pedir|como\s+pe[cç]o|onde\s+pe[cç]o)\b/i.test(
        msgLowForLinkAsk,
      );
    const canSendLink = sendMenuLinkAllowed || clientAskedForLink;

    // === FALLBACK LINK-ONLY (rede de segurança) ===
    // Só é chamado se Groq E Cerebras falharem. Nunca substitui a IA
    // quando ela está disponível — apenas cobre o pior cenário para o
    // cliente nunca ficar sem resposta.
    const sendLinkFallback = async (reason: string): Promise<Response | null> => {
      if (!orgSlug) return null;
      // Loja desligou envio automático e o cliente não pediu → não manda link.
      if (!canSendLink) return null;
      const menuUrl = `https://trendfood.site/${orgSlug}`;
      const variations = [
        `Olá! 😊 Aqui está o nosso cardápio:\n${menuUrl}\n\nÉ só escolher os itens e finalizar o pedido por lá.`,
        `Oi, tudo bem? 👋 Dá uma olhada no cardápio:\n${menuUrl}\n\nQualquer dúvida é só chamar!`,
        `Fala! 🙌 Segue o link do cardápio digital:\n${menuUrl}\n\nMonta seu pedido por aí e a gente já prepara.`,
        `Opa! 😄 Bora pedir? Nosso cardápio tá aqui:\n${menuUrl}\n\nÉ rapidinho pra finalizar.`,
        `Bem-vindo(a)! 🍔 Escolhe o que quiser no cardápio:\n${menuUrl}\n\nA gente cuida do resto. 💜`,
      ];
      const linkReply = variations[Math.floor(Math.random() * variations.length)];
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
        provider: `link-fallback:${reason}`,
        status: sentLink ? "sent" : "wa_send_failed",
        latency_ms: Date.now() - reqT0,
        phone,
        reply: linkReply,
      });
      console.log(`[ai-bot] link-fallback reason=${reason} org=${effectiveOrgId ?? "null"} sent=${sentLink}`);
      return new Response(
        JSON.stringify({ ok: true, mode: "link-fallback", reason, sent: sentLink, sendError: linkErr, response: linkReply }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    };

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
- URLs cruas, sem colchetes nem parenteses. Ex: https://trendfood.site/unidade/slug
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

    // === LOJA FECHADA: curto-circuita antes de qualquer resposta ===
    // Se a loja está pausada, fora do horário ou em pausa (almoço/janta),
    // NÃO manda link, cardápio, horários — só o aviso de fechado.
    const storeStatus = isStoreOpenNow(orgData?.business_hours, orgData?.paused, orgData?.force_open);
    if (storeStatus && !storeStatus.open) {
      // Anti-spam: se JÁ avisamos "fechado" em qualquer resposta recente (últimas 10),
      // NÃO responde de novo — só arquiva a mensagem recebida.
      const recentClosed = (history || [])
        .some((h: any) => /estamos\s+fechad/i.test(h?.ai_response || ""));

      if (recentClosed) {
        await supabase.from("fila_whatsapp").insert({
          phone,
          incoming_message: message,
          ai_response: null,
          status: "ignored_closed",
          responded_at: new Date().toISOString(),
          organization_id: effectiveOrgId,
        });
        recordBotMetric(supabase, {
          organization_id: effectiveOrgId,
          provider: "closed:skipped",
          status: "skipped",
          latency_ms: Date.now() - reqT0,
          phone,
        });
        console.log(`[ai-bot] closed-skip org=${effectiveOrgId ?? "null"} phone=${maskPhone(phone)}`);
        return new Response(
          JSON.stringify({ ok: true, mode: "closed_skipped" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const reopenStr = storeStatus.opensAt
        ? ` Abrimos ${storeStatus.opensDayLabel ? storeStatus.opensDayLabel + " " : ""}às ${storeStatus.opensAt}.`
        : "";
      const closedReply = `😴 No momento estamos fechados.${reopenStr} Pode mandar sua mensagem que respondemos assim que abrirmos!`;

      let sentClosed = false;
      let closedErr: string | null = null;
      if (effectiveServerUrl && effectiveToken) {
        try {
          const r = await fetch(`${effectiveServerUrl}/send/text`, {
            method: "POST",
            headers: { "Content-Type": "application/json", token: effectiveToken },
            body: JSON.stringify({ number: phone, text: closedReply }),
          });
          sentClosed = r.ok;
          if (!r.ok) closedErr = await r.text();
        } catch (e) { closedErr = (e as Error).message; }
      }
      await supabase.from("fila_whatsapp").insert({
        phone,
        incoming_message: message,
        ai_response: closedReply,
        status: "respondido",
        responded_at: new Date().toISOString(),
        organization_id: effectiveOrgId,
      });
      recordBotMetric(supabase, {
        organization_id: effectiveOrgId,
        provider: "closed",
        status: sentClosed ? "sent" : "wa_send_failed",
        latency_ms: Date.now() - reqT0,
        phone,
        reply: closedReply,
      });
      console.log(`[ai-bot] store-closed org=${effectiveOrgId ?? "null"} sent=${sentClosed}`);
      return new Response(
        JSON.stringify({ ok: true, mode: "closed", sent: sentClosed, sendError: closedErr, response: closedReply }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // === Fast-path: cliente pediu explicitamente o link/cardápio ===
    // Evita ~3-4s de latência do LLM só pra devolver um link que já sabemos.
    // Só dispara quando: (a) temos slug da loja, (b) msg é curta e claramente
    // pedindo cardápio/link, (c) não mandamos link nas últimas 3 respostas.
    const msgLowFast = String(message).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const explicitMenuAsk = /^(?:me\s+)?(?:manda|envia|passa|quero|tem|qual|onde|como)?\s*(?:o\s+)?(?:link|cardap[io]o?|menu|pedir|fazer\s+pedido|pedido)\??$/i.test(msgLowFast.trim()) ||
      /\b(manda|envia|passa|quero)\s+(?:o\s+)?(?:link|cardap[io]o?|menu)\b/i.test(msgLowFast) ||
      /\b(tem\s+link|qual\s+(?:o\s+)?link|onde\s+pe[cç]o|como\s+pe[cç]o)\b/i.test(msgLowFast);
    const recentRepliesFast = (history || []).slice(0, 3).map(h => h.ai_response || "").join("\n");
    const linkRecentFast = /https?:\/\/[^\s]*trendfood\.site/i.test(recentRepliesFast);
    if (orgSlug && explicitMenuAsk && !linkRecentFast && msgLowFast.length <= 60) {
      const fastReply = `Aqui está o link do nosso cardápio: https://trendfood.site/unidade/${orgSlug}`;
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

    // 4) Roteador por palavra-chave (SEM IA). Se casar em algum bucket, responde
    //    com dado real da loja. Se não casar, cai no pool de 50 mensagens prontas.
    const url = orgSlug ? `https://trendfood.site/${orgSlug}` : null;
    const m = msgLow;

    // Guard anti-spam de link: se já mandamos o link do cardápio nesta conversa
    // (qualquer resposta anterior do bot contém trendfood.site), não reenviamos
    // automaticamente. Só o fast-path e o bucket `menu` (cliente PEDIU) ignoram
    // esse guard.
    const linkAlreadySent = (history || []).some((h: any) =>
      /trendfood\.site/i.test(h?.ai_response || ""),
    );
    // Se o envio automático de link está desligado E o cliente não pediu,
    // suprime o rodapé com link em todas as respostas de bucket.
    const suppressLink = linkAlreadySent || !canSendLink;
    const urlFooter = suppressLink ? "" : (url ? `\n\nCardápio: ${url}` : "");
    const urlFooterOrder = suppressLink ? "" : (url ? `\n\nMonta seu pedido: ${url}` : "");
    const urlFooterContact = suppressLink ? "" : (url ? `\n\nOu peça direto: ${url}` : "");

    let routedReply: string | null = null;
    let routedBucket: string | null = null;

    if (/\b(cardapio|menu|link|catalogo|quero\s+pedir|fazer\s+pedido|pedir|bora\s+pedir)\b/.test(m)) {
      routedBucket = "menu";
      routedReply = url ? `Aqui está o link do nosso cardápio: ${url}` : null;
    } else if (/\b(horario|aberto|fechado|que\s+horas?|funciona|abre|fecha|funcionamento)\b/.test(m)) {
      routedBucket = "hours";
      const hours = orgData?.business_hours;
      if (hours && typeof hours === "object") {
        const days: Array<[string, string]> = [
          ["monday", "Segunda"], ["tuesday", "Terça"], ["wednesday", "Quarta"],
          ["thursday", "Quinta"], ["friday", "Sexta"], ["saturday", "Sábado"], ["sunday", "Domingo"],
          ["segunda", "Segunda"], ["terca", "Terça"], ["quarta", "Quarta"],
          ["quinta", "Quinta"], ["sexta", "Sexta"], ["sabado", "Sábado"], ["domingo", "Domingo"],
        ];
        const seen = new Set<string>();
        const lines: string[] = [];
        for (const [k, label] of days) {
          const h = (hours as any)[k];
          if (!h || seen.has(label)) continue;
          seen.add(label);
          if (h.closed) lines.push(`${label}: fechado`);
          else if (h.open && h.close) lines.push(`${label}: ${h.open} - ${h.close}`);
        }
        routedReply = lines.length
          ? `🕐 Nossos horários:\n${lines.join("\n")}${urlFooter}`
          : (linkAlreadySent ? `Confira nossos horários acima 👆` : (url ? `Confira nosso horário no cardápio: ${url}` : null));
      } else {
        routedReply = linkAlreadySent ? `Confira nossos horários no cardápio que já mandei 👆` : (url ? `Confira nosso horário no cardápio: ${url}` : null);
      }
    } else if (/\b(entrega|entregam|taxa|frete|bairro|bairros|delivery)\b/.test(m)) {
      routedBucket = "delivery";
      if (hoodsData.length) {
        const lines = hoodsData.slice(0, 25).map((h) => `• ${h.name}: R$ ${Number(h.fee).toFixed(2)}`);
        routedReply = `🛵 Bairros que entregamos:\n${lines.join("\n")}${urlFooterOrder}`;
      } else {
        routedReply = linkAlreadySent ? `A taxa aparece na hora de finalizar no cardápio 👆` : (url ? `A taxa aparece na hora de finalizar: ${url}` : null);
      }
    } else if (/\b(pix|pagamento|pagar|forma\s+de\s+pagamento|cartao|credito|debito|dinheiro|troco)\b/.test(m)) {
      routedBucket = "payment";
      routedReply = `💳 Aceitamos Pix, cartão (crédito/débito) e dinheiro na entrega.${urlFooterOrder}`;
    } else if (/\b(endereco|onde\s+fica|onde\s+voces?\s+ficam|localizacao|local\s+da\s+loja)\b/.test(m)) {
      routedBucket = "address";
      if (orgData?.store_address) {
        routedReply = `📍 Nosso endereço: ${orgData.store_address}${urlFooter}`;
      } else {
        routedReply = linkAlreadySent ? `Nosso atendimento é pelo cardápio digital que já mandei 👆` : (url ? `Nosso atendimento é pelo cardápio digital: ${url}` : null);
      }
    } else if (/\b(whatsapp|whats|telefone|numero|contato|zap|falar\s+com\s+a\s+loja)\b/.test(m)) {
      routedBucket = "contact";
      if (orgData?.whatsapp) {
        routedReply = `📱 Nosso contato: ${orgData.whatsapp}${urlFooterContact}`;
      } else {
        routedReply = linkAlreadySent ? `Você já está no nosso canal 🙂` : (url ? `Você já está no nosso canal. Cardápio: ${url}` : null);
      }
    }

    // Sufixo :no_link nas métricas quando o guard removeu o link do rodapé
    const bucketUsedNoLink = linkAlreadySent && routedBucket && routedBucket !== "menu";

    // Pool de 50 mensagens prontas (usado quando nenhum bucket casa)
    const menuUrl = url ?? "";
    const pool: string[] = [
      `Olá! 😊 Aqui está o nosso cardápio:\n${menuUrl}`,
      `Oi, tudo bem? 👋 Dá uma olhada no cardápio:\n${menuUrl}`,
      `Fala! 🙌 Segue o link do cardápio digital:\n${menuUrl}`,
      `Opa! 😄 Bora pedir? Nosso cardápio tá aqui:\n${menuUrl}`,
      `Bem-vindo(a)! 🍔 Escolhe o que quiser no cardápio:\n${menuUrl}`,
      `E aí! 😉 Cardápio completo:\n${menuUrl}`,
      `Oi! Aqui você monta seu pedido rapidinho:\n${menuUrl}`,
      `Tudo certo? 🙂 Nosso cardápio digital:\n${menuUrl}`,
      `Salve! 🤙 Cardápio aqui ó:\n${menuUrl}`,
      `Oi! ✨ Vem escolher pelo cardápio:\n${menuUrl}`,
      `Olá 👋 é só clicar e pedir por aqui:\n${menuUrl}`,
      `Fala meu amigo! 😃 Cardápio na mão:\n${menuUrl}`,
      `Oiê! 💜 Bora fazer seu pedido? ${menuUrl}`,
      `Boa! 👌 Segue o cardápio digital:\n${menuUrl}`,
      `Prazer! 😊 Olha só o cardápio:\n${menuUrl}`,
      `Opa, bem-vindo(a)! Monta seu pedido aqui:\n${menuUrl}`,
      `Oi! 🍟 Confere as opções e finaliza por aqui:\n${menuUrl}`,
      `Fala fera! 🔥 Cardápio digital:\n${menuUrl}`,
      `Olá! Já tá com fome? 😋 Cardápio aqui:\n${menuUrl}`,
      `Oi! 🥤 Nosso menu completo:\n${menuUrl}`,
      `E aí, tudo joia? 😎 Cardápio pra você:\n${menuUrl}`,
      `Oi 💫 escolhe o que quiser por aqui:\n${menuUrl}`,
      `Olá! 🍕 Vem ver as opções:\n${menuUrl}`,
      `Bom te ver por aqui! Cardápio:\n${menuUrl}`,
      `Oi! Vamo pedir? 🚀 ${menuUrl}`,
      `Salve! 🙏 Nosso cardápio digital:\n${menuUrl}`,
      `Fala! Aqui você monta e finaliza:\n${menuUrl}`,
      `Bem-vindo(a)! ✅ Cardápio completo:\n${menuUrl}`,
      `Olá! 🌟 Escolhe pelo cardápio:\n${menuUrl}`,
      `Oi, seja bem-vindo(a)! 💚 ${menuUrl}`,
      `Opa! Cardápio na palma da mão:\n${menuUrl}`,
      `Fala! 🍔 Faz seu pedido por aqui:\n${menuUrl}`,
      `Oi! Aproveita e monta seu pedido:\n${menuUrl}`,
      `Olá 👋 se joga no cardápio:\n${menuUrl}`,
      `E aí! Tô com fome já 😅 Cardápio:\n${menuUrl}`,
      `Oi! 🎯 Direto ao ponto — cardápio aqui: ${menuUrl}`,
      `Fala! Escolhe o que tá com vontade:\n${menuUrl}`,
      `Olá! Prazer te atender 😊 Cardápio:\n${menuUrl}`,
      `Oi! 🛒 Adiciona no carrinho por aqui:\n${menuUrl}`,
      `Opa! Segue o link pra pedir:\n${menuUrl}`,
      `Fala fera 🤝 cardápio digital:\n${menuUrl}`,
      `Oi! 🍽️ Bora escolher? ${menuUrl}`,
      `Olá! Nossa carta de sabores tá aqui:\n${menuUrl}`,
      `E aí! Vem experimentar 😋 ${menuUrl}`,
      `Fala! Cardápio pra pedir agora:\n${menuUrl}`,
      `Oi! Se joga nas opções:\n${menuUrl}`,
      `Olá 🌈 monta seu pedido aqui:\n${menuUrl}`,
      `Boa! Confere o cardápio e finaliza:\n${menuUrl}`,
      `Oi! 💥 Cardápio completo, taxas certinho:\n${menuUrl}`,
      `Fala! Rapidinho por aqui:\n${menuUrl}`,
    ];

    let finalReply = routedReply;
    let provider = routedBucket
      ? `keyword:${routedBucket}${bucketUsedNoLink ? ":no_link" : ""}`
      : "";

    if (!finalReply) {
      if (!menuUrl) {
        console.log(`[ai-bot] finalized reason=no_org_slug`);
        return new Response(JSON.stringify({ ok: true, skipped: true, reason: "no_org_slug" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Pool curto SEM link, usado quando o link já foi enviado nesta conversa
      // e o cliente não pediu de novo (não caiu em nenhum bucket).
      const poolNoLink: string[] = [
        `Tô por aqui, qualquer coisa é só chamar 🙂`,
        `Se precisar de algo é só falar!`,
        `Beleza! Qualquer dúvida manda ver 👍`,
        `Tranquilo, tô ligado por aqui.`,
        `De boa! Tô à disposição 😉`,
        `Show! Qualquer coisa me chama.`,
        `Fechou! Tô por aqui.`,
        `Certo! Se pintar dúvida é só mandar.`,
      ];
      const activePool = linkAlreadySent ? poolNoLink : pool;
      const lastIdx = lastFallbackIdxByPhone.get(phone) ?? -1;
      let idx = Math.floor(Math.random() * activePool.length);
      if (activePool.length > 1 && idx === lastIdx) idx = (idx + 1) % activePool.length;
      lastFallbackIdxByPhone.set(phone, idx);
      finalReply = activePool[idx];
      provider = linkAlreadySent ? "link-fallback:already_sent" : "link-fallback:no_match";
    }

    // Enviar via uazapi
    let sent = false;
    let sendError: string | null = null;
    if (effectiveServerUrl && effectiveToken) {
      try {
        const sendT0 = Date.now();
        const sendRes = await fetch(`${effectiveServerUrl}/send/text`, {
          method: "POST",
          headers: { "Content-Type": "application/json", token: effectiveToken },
          body: JSON.stringify({ number: phone, text: finalReply }),
        });
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

    // Persistir na fila e registrar métrica
    await supabase.from("fila_whatsapp").insert({
      phone,
      incoming_message: message,
      ai_response: finalReply,
      status: "respondido",
      responded_at: new Date().toISOString(),
      organization_id: effectiveOrgId,
    });

    console.log(`[ai-bot] finalized reason=${sent ? "sent" : "wa_send_failed"} provider=${provider} err=${sendError ?? ""}`);
    recordBotMetric(supabase, {
      organization_id: effectiveOrgId,
      provider,
      status: sent ? "sent" : "wa_send_failed",
      latency_ms: Date.now() - reqT0,
      phone,
      reply: finalReply,
    });
    return new Response(JSON.stringify({ ok: true, response: finalReply, sent, sendError, provider }), {
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
