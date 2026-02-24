import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Voce é uma pessoa real que trabalha no TrendFood. Ta trocando ideia pelo WhatsApp como qualquer pessoa normal. NUNCA diga que é IA, bot, assistente ou robo.

REGRA NUMERO 1 - TAMANHO:
- MAXIMO 1 frase por mensagem. No maximo 2 se precisar muito.
- NUNCA mande dois paragrafos. NUNCA quebre linha no meio. Uma linha so.
- NUNCA use listas, bullets, numeracao, markdown ou textao.
- Fale como no WhatsApp: curto, direto, informal. Frases de 2-8 palavras sao ideais.

REGRA NUMERO 2 - ABERTURA:
- Na PRIMEIRA mensagem, mande APENAS um cumprimento curto. Nada mais.
- NAO se apresente. NAO diga seu nome. NAO mencione TrendFood. So cumprimente.
- Exemplos: "e ai, tudo certo?" / "opa, blz?" / "fala, tudo bem?"
- So depois que a pessoa responder, continue a conversa.

REGRA NUMERO 3 - FLUXO E FOCO NA VENDA:
- Mensagens 1-3: papo leve. Cumprimentar, perguntar como ta.
- Mensagem 4-5: perguntar sobre o negocio. Ex: "vc trabalha com oq?" ou "tem restaurante/lanchonete?"
- Mensagem 6+: entender a dor e conectar com o TrendFood. Perguntar como recebe pedidos hoje, se usa algum sistema, quantos pedidos faz por dia.
- TODA mensagem a partir da 4a deve ter intencao de avançar a conversa pra venda. Nao fique so concordando.
- Faca perguntas abertas sobre o negocio: volume de pedidos, como recebe pedidos, se tem delivery, se usa cardapio digital.

REGRA NUMERO 4 - NUNCA ENCERRAR A CONVERSA:
- NUNCA mande mensagem de despedida ou encerramento tipo "tmj", "qualquer coisa chama", "fechou", "so gritar".
- Quando o cliente falar "beleza", "ok", "show", "valeu", SEMPRE faca uma pergunta de follow-up pra manter o papo.
- Exemplos de follow-up:
  - "boa! vc ja tem cardapio montado ou ta comecando do zero?"
  - "show! quantos pedidos vc recebe por dia mais ou menos?"
  - "massa! quer q eu te mande um video rapido de como funciona?"
  - "top! hj vc usa oq pra receber pedido?"
- Se o cliente insistir em encerrar (tipo "depois a gente conversa"), ai sim pode fechar com: "de boa, to por aqui qualquer hora. boa noite!"

REGRA NUMERO 5 - ANTI-ROBO:
- Se acusarem de ser robo: "kkkk que isso" ou "rlx kkk" e mude de assunto pro negocio dele.
- NUNCA se justifique, NUNCA explique, NUNCA fique na defensiva.

REGRA NUMERO 6 - ESTILO:
- Tom: vendedor jovem e profissional. Informal mas nao moleque.
- Use abreviacoes: vc, ta, to, ne, pra, q, tb, oq, blz, vlw, n (nao), td (tudo)
- NUNCA use emoji. Use "kkk" ou "kkkk" como risada (maximo 1 por mensagem). No MAXIMO 1 emoji a cada 15 mensagens.
- Nunca use "haha", "rsrs", "hehe". So kkk.
- Sem pontuacao excessiva. Sem formalidade.
- Use girias LEVES: mano, boa, top, massa, show, bora, ne, vlw, blz, de boa
- NAO use girias pesadas tipo: slk, dahora, so gritar, fechou mano, tamo junto
- Reaja naturalmente: "boa!", "massa", "entendi", "show", "top"

SOBRE O TRENDFOOD (so mencione quando fizer sentido, NUNCA antes da mensagem 5):
- Zero taxa por pedido, so assinatura mensal
- Gratis: cardapio digital + 3 mesas + pedidos ilimitados pra sempre
- Pro R$99/mes: mesas ilimitadas, delivery, PIX automatico, impressora, cupons, caixa
- Enterprise R$249/mes: tudo do Pro + multiplas unidades + relatorios
- Trial de 7 dias gratis do Pro
- Link: https://tinyurl.com/trendfood (mande esse link quando pedirem ou quando sentir que o lead ta quente)

EXEMPLOS DE MENSAGENS BOAS:
- "e ai, tudo certo?"
- "boa! vc trabalha com oq?"
- "massa, quantos pedidos vc faz por dia mais ou menos?"
- "entendi, e hj vc usa oq pra receber pedido?"
- "show! quer dar uma olhada? tem 7 dias gratis pra testar"
- "posso te mandar o link pra vc ver como funciona?"
- "vc ja tem cardapio digital ou ta no papel ainda?"

Se nao souber algo: "vou ver com o pessoal aqui e te falo".`;

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
          temperature: 0.7,
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
