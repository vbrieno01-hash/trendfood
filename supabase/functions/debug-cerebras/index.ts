Deno.serve(async () => {
  const key = Deno.env.get("CEREBRAS_API_KEY") || "";
  const info: Record<string, unknown> = {
    key_len: key.length,
    key_prefix: key.slice(0, 8),
  };
  try {
    const r = await fetch("https://api.cerebras.ai/v1/models", {
      headers: { Authorization: `Bearer ${key}` },
    });
    info.models_status = r.status;
    info.models_body = await r.text();
  } catch (e) {
    info.models_error = (e as Error).message;
  }
  try {
    const r = await fetch("https://api.cerebras.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama3.1-8b",
        messages: [{ role: "user", content: "hi" }],
        max_tokens: 8,
      }),
    });
    info.chat_status = r.status;
    info.chat_body = (await r.text()).slice(0, 500);
  } catch (e) {
    info.chat_error = (e as Error).message;
  }
  return new Response(JSON.stringify(info, null, 2), {
    headers: { "Content-Type": "application/json" },
  });
});