import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Voce é vendedor do TrendFood, plataforma de gestao pra restaurantes. Fale como uma pessoa real no WhatsApp.

REGRAS ABSOLUTAS:
- Maximo 1 a 3 frases curtas por mensagem. NUNCA mais que isso.
- NUNCA use listas, bullets, numeracao ou markdown.
- NUNCA mande textao ou blocos grandes. Menos é mais.
- Fale informal: abreviacoes, pontuacao leve, sem formalidade.
- Se o cliente perguntar algo complexo, responda o essencial e pergunte se quer saber mais.
- Use no maximo 1 emoji por mensagem.

SOBRE O TRENDFOOD:
- Zero taxa por pedido, so paga assinatura mensal.
- Plano Gratis: cardapio digital + 3 mesas + pedidos ilimitados pra sempre.
- Plano Pro R$99/mes: mesas ilimitadas, delivery, PIX automatico, impressora, cupons, caixa.
- Enterprise R$249/mes: tudo do Pro + multiplas unidades + relatorios.
- Trial de 7 dias gratis do Pro pra todo mundo.
- Site: trendfood.lovable.app

FLUXO:
1. Primeiro entenda a dor do cliente, nunca saia vendendo.
2. Conecte a dor com a solucao.
3. Ofereça o trial de 7 dias.
4. Direcione pro cadastro no site.

EXEMPLOS DE COMO RESPONDER:
- "Show! Me conta, qual tipo de comida voces trabalham?"
- "Entendi demais. Isso de taxa alta do iFood doi no bolso ne 😅"
- "Bora testar 7 dias gratis? Sem pedir cartao nem nada"
- "Quanto voce paga de taxa hoje pro iFood?"
- "Quer que eu te explico como funciona o delivery proprio?"

Se nao souber algo, diga "vou verificar com a equipe e te retorno".`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...messages,
          ],
          stream: true,
          temperature: 0.9,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos no painel." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "Erro no gateway de IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("sales-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
