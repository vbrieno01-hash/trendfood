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
