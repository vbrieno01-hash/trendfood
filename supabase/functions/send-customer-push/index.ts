import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Web Push helpers (shared with send-push-notification) ────

function base64urlToUint8Array(b64url: string): Uint8Array {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const pad = (4 - (b64.length % 4)) % 4;
  const raw = atob(b64 + "=".repeat(pad));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

function uint8ToBase64url(arr: Uint8Array): string {
  let b = "";
  arr.forEach((byte) => (b += String.fromCharCode(byte)));
  return btoa(b).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function createVapidJWT(
  audience: string,
  subject: string,
  privateKeyB64url: string,
  publicKeyB64url: string
): Promise<string> {
  const header = { typ: "JWT", alg: "ES256" };
  const now = Math.floor(Date.now() / 1000);
  const payload = { aud: audience, exp: now + 12 * 3600, sub: subject };

  const enc = new TextEncoder();
  const headerB64 = uint8ToBase64url(enc.encode(JSON.stringify(header)));
  const payloadB64 = uint8ToBase64url(enc.encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  const pubRaw = base64urlToUint8Array(publicKeyB64url);
  const x = uint8ToBase64url(pubRaw.slice(1, 33));
  const y = uint8ToBase64url(pubRaw.slice(33, 65));

  const key = await crypto.subtle.importKey(
    "jwk",
    { kty: "EC", crv: "P-256", x, y, d: privateKeyB64url },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const sig = new Uint8Array(
    await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      key,
      enc.encode(unsignedToken)
    )
  );

  return `${unsignedToken}.${uint8ToBase64url(sig)}`;
}

async function encryptPayload(
  payload: string,
  p256dhB64url: string,
  authB64url: string
): Promise<{ body: Uint8Array }> {
  const enc = new TextEncoder();
  const plaintext = enc.encode(payload);

  const localKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );

  const localPublicKeyRaw = new Uint8Array(
    await crypto.subtle.exportKey("raw", localKeyPair.publicKey)
  );

  const subscriberPubRaw = base64urlToUint8Array(p256dhB64url);
  const subscriberPub = await crypto.subtle.importKey(
    "raw",
    subscriberPubRaw,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "ECDH", public: subscriberPub },
      localKeyPair.privateKey,
      256
    )
  );

  const authSecret = base64urlToUint8Array(authB64url);
  const salt = crypto.getRandomValues(new Uint8Array(16));

  async function hkdf(ikm: Uint8Array, saltBytes: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
    const key = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits(
      { name: "HKDF", hash: "SHA-256", salt: saltBytes, info },
      key,
      length * 8
    );
    return new Uint8Array(bits);
  }

  const keyInfoPrefix = enc.encode("WebPush: info\0");
  const keyInfo = new Uint8Array([...keyInfoPrefix, ...subscriberPubRaw, ...localPublicKeyRaw]);

  const prk = await hkdf(sharedSecret, authSecret, keyInfo, 32);
  const ceKeyInfo = enc.encode("Content-Encoding: aes128gcm\0");
  const nonceInfo = enc.encode("Content-Encoding: nonce\0");
  const contentKey = await hkdf(prk, salt, ceKeyInfo, 16);
  const nonce = await hkdf(prk, salt, nonceInfo, 12);

  const padded = new Uint8Array([...plaintext, 2]);
  const aesKey = await crypto.subtle.importKey("raw", contentKey, "AES-GCM", false, ["encrypt"]);
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aesKey, padded)
  );

  const rs = 4096;
  const rsBytes = new Uint8Array(4);
  new DataView(rsBytes.buffer).setUint32(0, rs);

  const body = new Uint8Array([
    ...salt,
    ...rsBytes,
    localPublicKeyRaw.length,
    ...localPublicKeyRaw,
    ...encrypted,
  ]);

  return { body };
}

// ── Status message map ───────────────────────────────────────

function getStatusMessage(status: string, orderNumber: number | null) {
  const num = orderNumber ? `#${orderNumber}` : "";
  switch (status) {
    case "preparing":
      return { title: "🍳 Pedido aceito!", body: `Seu pedido ${num} está sendo preparado` };
    case "ready":
      return { title: "✅ Pedido pronto!", body: `Retire seu pedido ${num}!` };
    case "delivered":
      return { title: "🎉 Entregue!", body: `Bom apetite! Avalie seu pedido ${num}` };
    default:
      return { title: "📦 Atualização", body: `Seu pedido ${num} foi atualizado` };
  }
}

// ── Main handler ─────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { order_id, new_status, order_number } = await req.json();

    if (!order_id || !new_status) {
      return new Response(JSON.stringify({ error: "order_id and new_status required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: subs, error } = await supabase
      .from("customer_push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("order_id", order_id);

    if (error) {
      console.error("Error fetching customer subs:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: "No customer subscriptions" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { title, body: msgBody } = getStatusMessage(new_status, order_number);
    const payloadJson = JSON.stringify({ title, body: msgBody, url: "/" });

    let sent = 0;
    let failed = 0;

    for (const sub of subs) {
      try {
        const endpointUrl = new URL(sub.endpoint);
        const audience = `${endpointUrl.protocol}//${endpointUrl.host}`;

        const jwt = await createVapidJWT(audience, "mailto:contato@trendfood.app", vapidPrivateKey, vapidPublicKey);
        const { body } = await encryptPayload(payloadJson, sub.p256dh, sub.auth);

        const response = await fetch(sub.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/octet-stream",
            "Content-Encoding": "aes128gcm",
            Authorization: `vapid t=${jwt}, k=${vapidPublicKey}`,
            TTL: "86400",
            Urgency: "high",
          },
          body,
        });

        if (response.status === 201 || response.status === 200) {
          sent++;
        } else if (response.status === 410 || response.status === 404) {
          await supabase.from("customer_push_subscriptions").delete().eq("endpoint", sub.endpoint);
          failed++;
        } else {
          const text = await response.text();
          console.error(`Customer push failed ${response.status}: ${text}`);
          failed++;
        }
      } catch (e) {
        console.error("Error sending customer push:", e);
        failed++;
      }
    }

    return new Response(JSON.stringify({ sent, failed }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Unhandled error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
