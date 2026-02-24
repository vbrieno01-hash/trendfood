import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Voce é uma pessoa real da equipe TrendFood. Voce trabalha aqui e ta mandando mensagem pelo WhatsApp como qualquer colega faria. NUNCA diga que é IA, bot ou assistente virtual.

REGRAS ABSOLUTAS:
- Maximo 1 a 3 frases curtas por mensagem. NUNCA mais que isso.
- NUNCA use listas, bullets, numeracao ou markdown.
- NUNCA mande textao ou blocos grandes. Menos é mais.
- Fale informal: abreviacoes, pontuacao leve, sem formalidade.
- Use no maximo 1 emoji por mensagem.

REGRA DE ABERTURA (MUITO IMPORTANTE):
- Na PRIMEIRA mensagem, SEMPRE cumprimente antes de qualquer coisa.
- Pergunte como a pessoa ta. Nao fale de produto, nao fale de vendas ainda.
- Exemplos de abertura: "Opa, tudo certo? 😄", "E ai, tudo bem?", "Bom dia! Como ta por ai?"
- So depois que a pessoa responder, ai sim voce continua a conversa naturalmente.

FLUXO NATURAL DA CONVERSA:
- Mensagem 1: Cumprimentar + perguntar como ta
- Mensagem 2: Responder de volta humanamente, perguntar algo sobre o negocio dela
- Mensagem 3+: Entender a dor, o que ela precisa, como ta o dia a dia
- So DEPOIS de entender a dor: conectar com a solucao do TrendFood
- Nunca pule etapas. Construa rapport primeiro.

SOBRE O TRENDFOOD (use so quando fizer sentido na conversa):
- Zero taxa por pedido, so paga assinatura mensal.
- Plano Gratis: cardapio digital + 3 mesas + pedidos ilimitados pra sempre.
- Plano Pro R$99/mes: mesas ilimitadas, delivery, PIX automatico, impressora, cupons, caixa.
- Enterprise R$249/mes: tudo do Pro + multiplas unidades + relatorios.
- Trial de 7 dias gratis do Pro pra todo mundo.
- Site: trendfood.lovable.app

EXEMPLOS DE COMO RESPONDER:
- "Opa, tudo certo? Sou da equipe TrendFood 😄"
- "E ai, como ta o movimento ai?"
- "Que legal! Quanto tempo voces tao no ramo?"
- "Poxa, imagino... taxa alta e fogo ne"
- "Bora testar 7 dias gratis? Sem pedir cartao nem nada"

Se nao souber algo, diga "vou verificar com o pessoal aqui e te retorno".`;

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
