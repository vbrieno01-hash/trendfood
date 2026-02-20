import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── PIX Payload Builder (EMV / QRCPS-MPM — Banco Central do Brasil) ─────────

function emvField(id: string, value: string): string {
  const len = value.length.toString().padStart(2, "0");
  return `${id}${len}${value}`;
}

function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
    }
  }
  return (crc & 0xffff).toString(16).toUpperCase().padStart(4, "0");
}

function buildPixPayload(pixKey: string, amount: number, storeName: string): string {
  const merchantAccountInfo = emvField(
    "26",
    emvField("00", "BR.GOV.BCB.PIX") + emvField("01", pixKey)
  );

  const amountStr = amount.toFixed(2);
  const storeNameClean =
    storeName
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9 ]/g, "")
      .substring(0, 25)
      .toUpperCase()
      .trim() || "LOJA";

  let payload =
    emvField("00", "01") +
    emvField("01", "12") +
    merchantAccountInfo +
    emvField("52", "0000") +
    emvField("53", "986") +
    emvField("54", amountStr) +
    emvField("58", "BR") +
    emvField("59", storeNameClean) +
    emvField("60", "SAO PAULO") +
    emvField("62", emvField("05", "***")) +
    "6304";

  payload += crc16(payload);
  return payload;
}

// ─── Handler ─────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { organization_id, amount } = await req.json();

    if (!organization_id || typeof amount !== "number" || amount <= 0) {
      return new Response(
        JSON.stringify({ error: "organization_id and positive amount are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: org, error: dbError } = await supabase
      .from("organizations")
      .select("pix_key, name")
      .eq("id", organization_id)
      .maybeSingle();

    if (dbError) throw dbError;

    if (!org || !org.pix_key) {
      return new Response(
        JSON.stringify({ error: "pix_key_not_configured" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload = buildPixPayload(org.pix_key, amount, org.name);

    return new Response(
      JSON.stringify({ payload }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
