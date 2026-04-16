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
    const { phone, message } = await req.json();
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

    // 1) Carregar config
    const { data: config } = await supabase
      .from("ai_bot_config")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!config || !config.enabled) {
      return new Response(JSON.stringify({ ok: true, skipped: true, reason: "bot_disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2) Carregar contexto da loja de teste
    let storeContext = "";
    if (config.test_org_id) {
      const [{ data: org }, { data: menu }, { data: hoods }] = await Promise.all([
        supabase
          .from("organizations")
          .select("name, slug, whatsapp, store_address, business_hours, description")
          .eq("id", config.test_org_id)
          .maybeSingle(),
        supabase
          .from("menu_items")
          .select("name, description, price, category")
          .eq("organization_id", config.test_org_id)
          .eq("available", true)
          .order("category"),
        supabase
          .from("delivery_neighborhoods")
          .select("name, fee")
          .eq("organization_id", config.test_org_id)
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
    const { data: history } = await supabase
      .from("fila_whatsapp")
      .select("incoming_message, ai_response")
      .eq("phone", phone)
      .not("ai_response", "is", null)
      .order("created_at", { ascending: false })
      .limit(10);

    const messages: { role: string; content: string }[] = [
      { role: "system", content: `${config.system_prompt}\n${storeContext}` },
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
        model: config.model || "google/gemini-2.5-flash",
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

    // 5) Salvar
    await supabase.from("fila_whatsapp").insert({
      phone,
      incoming_message: message,
      ai_response: reply,
      status: "respondido",
      responded_at: new Date().toISOString(),
    });

    return new Response(JSON.stringify({ ok: true, response: reply }), {
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
