import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limit em memória (process-level)
const lastReqByPhone = new Map<string, number>();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { phone, message, organization_id: orgIdOverride, instance_token: tokenOverride } = await req.json();
    if (!phone || !message) {
      return new Response(JSON.stringify({ error: "phone and message required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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

    // 1) Carregar config: preferir config da própria loja; fallback no singleton
    let config: any = null;
    if (orgIdOverride) {
      const { data } = await supabase
        .from("ai_bot_config")
        .select("*")
        .eq("organization_id", orgIdOverride)
        .maybeSingle();
      config = data;
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
    const effectiveServerUrl = (Deno.env.get("UAZAPI_SERVER_URL") || "https://free.uazapi.com").replace(/\/$/, "");

    // Token sempre vem vivo: do caller (webhook) ou buscado em whatsapp_instances.
    // Sem fallback pra token salvo no ai_bot_config (não existe mais).
    let effectiveToken: string | null = tokenOverride || null;
    if (!effectiveToken && effectiveOrgId) {
      const { data: inst } = await supabase
        .from("whatsapp_instances")
        .select("instance_token")
        .eq("organization_id", effectiveOrgId)
        .maybeSingle();
      effectiveToken = inst?.instance_token || null;
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

    // 2) Carregar contexto da loja (multi-tenant ou test)
    let storeContext = "";
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
        storeContext += `\n\n## LOJA: ${org.name}\n`;
        if (org.description) storeContext += `${org.description}\n`;
        if (org.store_address) storeContext += `Endereço: ${org.store_address}\n`;
        if (org.whatsapp) storeContext += `WhatsApp: ${org.whatsapp}\n`;
        storeContext += `Link do cardápio: https://trendfood.lovable.app/unidade/${org.slug}\n`;

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
      .select("incoming_message, ai_response")
      .eq("phone", phone)
      .not("ai_response", "is", null)
      .order("created_at", { ascending: false })
      .limit(10);
    if (effectiveOrgId) historyQuery = historyQuery.eq("organization_id", effectiveOrgId);
    const { data: history } = await historyQuery;

    const defaultPrompt = `Voce e um atendente de restaurante/lanchonete via WhatsApp. Educado, simpatico, profissional e direto.

REGRAS DE FORMATO (WhatsApp puro):
- Use *negrito* com UM asterisco apenas (nunca **duplo**).
- Envie URLs CRUAS, sem colchetes nem parenteses. Ex: https://trendfood.lovable.app/unidade/slug
- Nada de markdown de titulo (##, ###) nem de link [texto](url).
- Emojis com moderacao (1-2 por mensagem).
- Respostas CURTAS: maximo 4 linhas, exceto quando o cliente pedir o cardapio.

REGRAS DE CONTEUDO:
- Use APENAS as informacoes do contexto da loja (cardapio, horarios, bairros, endereco, link). Se o cliente perguntar algo que nao esta no contexto, diga "vou verificar com a equipe e ja te respondo" ou direcione para o link do cardapio.
- NUNCA invente itens, precos, promocoes ou horarios.
- Quando o cliente pedir o cardapio ou perguntar "o que tem", liste os ITENS reais agrupados por categoria, no formato:

  🍔 *Categoria*
  • Nome do item — R$ 00,00

- Categorias sao titulos de secao, NUNCA cite "Bebidas" ou "Lanches" como se fosse um produto.

REGRAS DE TOM:
- Pedidos fora do escopo (ex: "quero uma casa", "voce vende carro?"): responda curto e com leve bom humor, redirecione para o cardapio.
- Para fazer pedido, sempre oriente o cliente a usar o LINK do cardapio digital (a URL esta no contexto).
- Nao prometa prazo de entrega especifico se nao tiver essa info.
- Se perguntarem se esta aberto, use os horarios do contexto.

Seja util, rapido e nao enrole.`;

    const systemPrompt = config?.system_prompt || defaultPrompt;

    const messages: { role: string; content: string }[] = [
      { role: "system", content: `${systemPrompt}\n${storeContext}` },
    ];
    if (history) {
      for (const h of history.reverse()) {
        messages.push({ role: "user", content: h.incoming_message });
        if (h.ai_response) messages.push({ role: "assistant", content: h.ai_response });
      }
    }
    messages.push({ role: "user", content: message });

    // 4) Chamar Lovable AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config?.model || "google/gemini-2.5-flash",
        messages,
        temperature: 0.7,
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI error:", aiRes.status, errText);
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "ai_rate_limit" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "ai_credits_exhausted" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI gateway error");
    }

    const aiData = await aiRes.json();
    const reply =
      aiData.choices?.[0]?.message?.content ||
      "Desculpa, tive um problema aqui. Pode repetir?";

    // 5) Enviar resposta de volta via uazapiGO
    let sent = false;
    let sendError: string | null = null;
    if (effectiveServerUrl && effectiveToken) {
      try {
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

    return new Response(JSON.stringify({ ok: true, response: reply, sent, sendError }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("ai-bot-respond error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
