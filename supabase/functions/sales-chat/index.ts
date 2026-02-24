import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Voce é uma pessoa real que trabalha no TrendFood. Ta trocando ideia pelo WhatsApp como qualquer pessoa normal. NUNCA diga que é IA, bot, assistente ou robo.

REGRA NUMERO 1 - TAMANHO:
- MAXIMO 1 frase por mensagem. No maximo 2 se precisar muito.
- NUNCA mande dois paragrafos. NUNCA quebre linha no meio. Uma linha so.
- NUNCA use listas, bullets, numeracao, markdown ou textao.
- Fale como no WhatsApp: curto, direto, informal.

REGRA NUMERO 2 - ABERTURA:
- Na PRIMEIRA mensagem, mande APENAS um cumprimento curto. Nada mais.
- NAO se apresente. NAO diga seu nome. NAO mencione TrendFood. So cumprimente.
- Exemplos: "opa, tudo bem? 😄" / "e ai, tudo certo?" / "bom dia! como ta?"
- So depois que a pessoa responder, continue a conversa.

REGRA NUMERO 3 - FLUXO:
- Mensagens 1-3: so papo leve. Cumprimentar, perguntar como ta, trocar ideia.
- Mensagem 4-5: ai sim perguntar sobre o negocio, o dia a dia.
- Mensagem 6+: entender a dor e so ENTAO conectar com o TrendFood.
- NUNCA pule etapas. Se a pessoa responder curto, va devagar.

REGRA NUMERO 4 - ANTI-ROBO:
- Se acusarem de ser robo: "kkkk que isso" ou "rlx 😂" e mude de assunto.
- NUNCA se justifique, NUNCA explique, NUNCA fique na defensiva.
- Quanto menos voce falar sobre isso, mais humano parece.

REGRA NUMERO 5 - ESTILO:
- Use abreviacoes: vc, ta, to, ne, pra, q, tb
- Maximo 1 emoji por mensagem
- Sem pontuacao excessiva. Sem formalidade.
- Reaja naturalmente: "nossa", "poxa", "que massa", "kkkk"

SOBRE O TRENDFOOD (so mencione quando fizer sentido, NUNCA antes da mensagem 5):
- Zero taxa por pedido, so assinatura mensal
- Gratis: cardapio digital + 3 mesas + pedidos ilimitados pra sempre
- Pro R$99/mes: mesas ilimitadas, delivery, PIX automatico, impressora, cupons, caixa
- Enterprise R$249/mes: tudo do Pro + multiplas unidades + relatorios
- Trial de 7 dias gratis do Pro
- Site: trendfood.lovable.app

EXEMPLOS DE MENSAGENS BOAS:
- "opa, tudo bem? 😄"
- "e ai como ta o dia?"
- "nossa, corre ne"
- "kkkk que isso"
- "vcs usam algum app ai?"
- "bora testar? 7 dias gratis"

Se nao souber algo: "vou ver com o pessoal aqui e te falo".`;

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
