// Shared PlugNotas helpers used by fiscal-* edge functions.
// Not a deployable function — imported via relative paths from siblings.

export const PLUGNOTAS_BASE = "https://api.plugnotas.com.br";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function requireApiKey(): string {
  const key = Deno.env.get("PLUGNOTAS_API_KEY");
  if (!key) throw new Error("PLUGNOTAS_API_KEY not configured");
  return key;
}

export async function pnFetch(
  method: string,
  path: string,
  body?: unknown,
  extraHeaders: Record<string, string> = {},
): Promise<{ status: number; data: any }> {
  const res = await fetch(`${PLUGNOTAS_BASE}${path}`, {
    method,
    headers: {
      "X-API-KEY": requireApiKey(),
      "Content-Type": "application/json",
      ...extraHeaders,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    data = { raw: await res.text().catch(() => "") };
  }
  return { status: res.status, data };
}

// Map internal payment method to SEFAZ NFC-e codes
// 01=Dinheiro, 03=Crédito, 04=Débito, 17=PIX, 99=Outros
export function mapPaymentToSefaz(method: string | null | undefined): string {
  const m = (method || "").toLowerCase();
  if (m.includes("pix")) return "17";
  if (m.includes("credit") || m.includes("credito") || m.includes("crédito")) return "03";
  if (m.includes("debit") || m.includes("debito") || m.includes("débito")) return "04";
  if (m.includes("cash") || m.includes("dinheiro") || m.includes("espec")) return "01";
  return "99";
}