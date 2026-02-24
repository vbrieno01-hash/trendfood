import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    // Evolution API envia o payload com data.message e data.key.remoteJid
    const message = body?.data?.message?.conversation 
      || body?.data?.message?.extendedTextMessage?.text
      || body?.data?.body
      || null;
    
    const phone = body?.data?.key?.remoteJid?.replace("@s.whatsapp.net", "") 
      || body?.data?.from
      || null;

    if (!message || !phone) {
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ignorar mensagens enviadas por nós mesmos
    const fromMe = body?.data?.key?.fromMe ?? false;
    if (fromMe) {
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Buscar histórico recente desta conversa (últimas 10 mensagens)
    const { data: history } = await supabase
      .from("fila_whatsapp")
      .select("incoming_message, ai_response")
      .eq("phone", phone)
      .eq("status", "respondido")
      .order("created_at", { ascending: false })
      .limit(10);

    // Montar contexto de conversa
    const conversationMessages: { role: string; content: string }[] = [];
    if (history && history.length > 0) {
      // Reverter pra ordem cronológica
      for (const msg of history.reverse()) {
        conversationMessages.push({ role: "user", content: msg.incoming_message });
        if (msg.ai_response) {
          conversationMessages.push({ role: "assistant", content: msg.ai_response });
        }
      }
    }
    conversationMessages.push({ role: "user", content: message });

    // Gerar resposta com IA
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const aiResponse = await fetch(
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
            ...conversationMessages,
          ],
          temperature: 0.9,
        }),
      }
    );

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      throw new Error("AI gateway error");
    }

    const aiData = await aiResponse.json();
    const reply = aiData.choices?.[0]?.message?.content || "Desculpa, tive um problema aqui. Pode repetir?";

    // Salvar na fila com resposta já gerada
    await supabase.from("fila_whatsapp").insert({
      phone,
      incoming_message: message,
      ai_response: reply,
      status: "pendente",
    });

    return new Response(JSON.stringify({ ok: true, reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("whatsapp-webhook error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
