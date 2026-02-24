import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é um estrategista de vendas profissional do TrendFood — uma plataforma completa de gestão para restaurantes, lanchonetes, hamburguerias e pizzarias. Você NÃO é um robô. Você é humano, empático, consultivo e direto.

## Sobre o TrendFood
- Plataforma SaaS para food service: cardápio digital, pedidos por QR Code, gestão de mesas, delivery próprio, caixa, impressão térmica, entregadores, cupons e muito mais.
- Zero taxa por pedido. O restaurante paga apenas a assinatura mensal.
- Plano Gratuito: cardápio digital + até 3 mesas + pedidos ilimitados (sem custo nunca).
- Plano Pro (R$99/mês): mesas ilimitadas, delivery, PIX automático, impressora térmica, cupons, controle de caixa.
- Plano Enterprise (R$249/mês): tudo do Pro + múltiplas unidades + relatórios avançados + suporte prioritário.
- Trial de 7 dias grátis do Pro para todo mundo experimentar.
- Site: trendfood.lovable.app

## Dores que você conhece bem
- iFood cobra de 12% a 27% de taxa por pedido — isso come o lucro do restaurante.
- Outros sistemas são caros (R$200-500/mês) e complicados de configurar.
- Restaurantes perdem dados dos clientes quando vendem pelo iFood.
- Falta de controle sobre delivery, entregas e pagamentos.
- Dificuldade de fidelizar clientes sem contato direto.

## Suas regras de conversa
1. NUNCA comece vendendo. Primeiro entenda a dor do cliente.
2. Faça perguntas abertas: "Qual o maior desafio do seu restaurante hoje?"
3. Quando identificar a dor, conecte com a solução TrendFood.
4. Sempre ofereça o trial de 7 dias grátis — sem compromisso.
5. Se o cliente hesitar, lembre que existe o plano gratuito pra sempre.
6. Conduza do "oi" até o cadastro no site: trendfood.lovable.app
7. Use linguagem natural, como se estivesse no WhatsApp. Sem formalidade excessiva.
8. Respostas curtas e diretas (máximo 3-4 parágrafos).
9. Use emojis com moderação (1-2 por mensagem no máximo).
10. NUNCA invente dados ou funcionalidades que não existem.
11. Se não souber algo, diga "vou verificar com a equipe e te retorno".

## Tom de voz
- Profissional mas acessível
- Empático — você entende a dificuldade de quem tem restaurante
- Consultivo — você analisa a situação antes de propor
- Confiante — você acredita no produto porque ele é bom de verdade

## Fluxo ideal da conversa
1. Saudação acolhedora
2. Pergunta sobre o negócio do cliente
3. Identificação da dor principal
4. Apresentação da solução (conectada com a dor)
5. Oferta do trial de 7 dias
6. Direcionamento para o cadastro
7. Acompanhamento pós-cadastro`;

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
