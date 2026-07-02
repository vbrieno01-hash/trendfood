import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── FCM HTTP v1 helpers ───────────────────────────────────────

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");
  const raw = atob(b64);
  const buf = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i);
  return buf.buffer;
}

function b64urlEncode(input: string | Uint8Array): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

let cachedFcmToken: { token: string; expiresAt: number } | null = null;

async function getFcmAccessToken(serviceAccount: any): Promise<string> {
  if (cachedFcmToken && cachedFcmToken.expiresAt > Date.now() + 60_000) {
    return cachedFcmToken.token;
  }

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const unsigned = `${b64urlEncode(JSON.stringify(header))}.${b64urlEncode(JSON.stringify(payload))}`;

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(serviceAccount.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const sig = new Uint8Array(
    await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned))
  );
  const jwt = `${unsigned}.${b64urlEncode(sig)}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!res.ok) throw new Error(`FCM token fetch failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  cachedFcmToken = { token: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
  return json.access_token;
}

// ── Web Push helpers ──────────────────────────────────────────

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


// Simplified: use jwt.io style — create JWT manually and sign with ECDSA
async function createVapidJWT(
  audience: string,
  subject: string,
  privateKeyB64url: string,
  publicKeyB64url: string
): Promise<string> {
  const header = { typ: "JWT", alg: "ES256" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 3600,
    sub: subject,
  };

  const enc = new TextEncoder();
  const headerB64 = uint8ToBase64url(enc.encode(JSON.stringify(header)));
  const payloadB64 = uint8ToBase64url(enc.encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Import private key
  const pubRaw = base64urlToUint8Array(publicKeyB64url);
  // Extract x, y from uncompressed public key (65 bytes: 0x04 || x || y)
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

// ── RFC 8291 encryption (simplified) ──────────────────────────

async function encryptPayload(
  payload: string,
  p256dhB64url: string,
  authB64url: string
): Promise<{ body: Uint8Array; salt: Uint8Array; localPublicKey: Uint8Array }> {
  const enc = new TextEncoder();
  const plaintext = enc.encode(payload);

  // Generate local ECDH key pair
  const localKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );

  const localPublicKeyRaw = new Uint8Array(
    await crypto.subtle.exportKey("raw", localKeyPair.publicKey)
  );

  // Import subscriber public key
  const subscriberPubRaw = base64urlToUint8Array(p256dhB64url);
  const subscriberPub = await crypto.subtle.importKey(
    "raw",
    subscriberPubRaw,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  // Shared secret via ECDH
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "ECDH", public: subscriberPub },
      localKeyPair.privateKey,
      256
    )
  );

  const authSecret = base64urlToUint8Array(authB64url);
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // HKDF helper
  async function hkdf(
    ikm: Uint8Array,
    saltBytes: Uint8Array,
    info: Uint8Array,
    length: number
  ): Promise<Uint8Array> {
    const key = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits(
      { name: "HKDF", hash: "SHA-256", salt: saltBytes, info },
      key,
      length * 8
    );
    return new Uint8Array(bits);
  }

  // info builders
  const keyInfoPrefix = enc.encode("WebPush: info\0");
  const keyInfo = new Uint8Array([
    ...keyInfoPrefix,
    ...subscriberPubRaw,
    ...localPublicKeyRaw,
  ]);

  // PRK = HKDF-Extract(auth_secret, ecdh_secret)
  const prk = await hkdf(sharedSecret, authSecret, keyInfo, 32);

  const ceKeyInfo = enc.encode("Content-Encoding: aes128gcm\0");
  const nonceInfo = enc.encode("Content-Encoding: nonce\0");

  const contentKey = await hkdf(prk, salt, ceKeyInfo, 16);
  const nonce = await hkdf(prk, salt, nonceInfo, 12);

  // Pad plaintext (add delimiter 0x02)
  const padded = new Uint8Array([...plaintext, 2]);

  // Encrypt with AES-128-GCM
  const aesKey = await crypto.subtle.importKey("raw", contentKey, "AES-GCM", false, [
    "encrypt",
  ]);
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aesKey, padded)
  );

  // Build aes128gcm body: salt(16) + rs(4) + idlen(1) + keyid(65) + encrypted
  const rs = 4096;
  const rsBytes = new Uint8Array(4);
  new DataView(rsBytes.buffer).setUint32(0, rs);

  const body = new Uint8Array([
    ...salt,
    ...rsBytes,
    localPublicKeyRaw.length, // idlen
    ...localPublicKeyRaw,
    ...encrypted,
  ]);

  return { body, salt, localPublicKey: localPublicKeyRaw };
}

// ── Main handler ──────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { organization_id, order_number, event_type, stock_item_name, menu_item_name, shortage } = await req.json();

    if (!organization_id) {
      return new Response(JSON.stringify({ error: "organization_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get all push subscriptions for this org
    const { data: subs, error } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("organization_id", organization_id);

    if (error) {
      console.error("Error fetching subscriptions:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch FCM tokens (Android APK / native web)
    const { data: fcmRows } = await supabase
      .from("fcm_tokens")
      .select("token, platform")
      .eq("organization_id", organization_id);

    if ((!subs || subs.length === 0) && (!fcmRows || fcmRows.length === 0)) {
      return new Response(JSON.stringify({ sent: 0, message: "No subscriptions found" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let title: string;
    let body: string;
    let url: string;

    if (event_type === "stock_shortage") {
      title = "⚠️ Estoque insuficiente";
      body =
        `Faltaram ${shortage} de "${stock_item_name}"` +
        (menu_item_name ? ` em ${menu_item_name}` : "") +
        (order_number ? ` (pedido #${order_number})` : "");
      url = "/dashboard?tab=stock";
    } else if (event_type === "order_canceled") {
      title = "❌ Pedido cancelado";
      body = order_number ? `Pedido #${order_number} foi cancelado` : "Um pedido foi cancelado";
      url = "/dashboard?tab=home";
    } else {
      title = "🔔 Novo Pedido!";
      body = order_number ? `Pedido #${order_number} recebido` : "Novo pedido recebido!";
      url = "/dashboard?tab=home";
    }

    const payloadJson = JSON.stringify({ title, body, url });

    let sent = 0;
    let failed = 0;

    // Telegram notifications for merchants are handled by the dedicated
    // `notify-merchant-telegram` edge function, triggered separately by
    // the `notify_new_order` DB trigger. Keeping this function focused on
    // Web Push only avoids coupling the two flows.

    for (const sub of (subs || [])) {
      try {
        const endpointUrl = new URL(sub.endpoint);
        const audience = `${endpointUrl.protocol}//${endpointUrl.host}`;

        const jwt = await createVapidJWT(
          audience,
          "mailto:contato@trendfood.app",
          vapidPrivateKey,
          vapidPublicKey
        );

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
          // Subscription expired — remove from DB
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("endpoint", sub.endpoint);
          failed++;
        } else {
          const text = await response.text();
          console.error(`Push failed ${response.status}: ${text}`);
          failed++;
        }
      } catch (e) {
        console.error("Error sending push:", e);
        failed++;
      }
    }

    // ── FCM HTTP v1 (Android APK / native) ───────────────────
    let fcmSent = 0;
    let fcmFailed = 0;
    const serviceAccountRaw = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_JSON");

    if (fcmRows && fcmRows.length > 0 && serviceAccountRaw) {
      try {
        const serviceAccount = JSON.parse(serviceAccountRaw);
        const accessToken = await getFcmAccessToken(serviceAccount);
        const projectId = serviceAccount.project_id;

        for (const row of fcmRows) {
          try {
            const fcmRes = await fetch(
              `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  message: {
                    token: row.token,
                    notification: { title, body },
                    data: { url, event_type: event_type || "new_order" },
                    android: {
                      priority: "HIGH",
                      notification: {
                        sound: "default",
                        channel_id: "orders",
                      },
                    },
                  },
                }),
              }
            );

            if (fcmRes.ok) {
              fcmSent++;
            } else {
              const txt = await fcmRes.text();
              console.error(`FCM send failed ${fcmRes.status}: ${txt}`);
              if (fcmRes.status === 404 || fcmRes.status === 400 || txt.includes("UNREGISTERED")) {
                await supabase.from("fcm_tokens").delete().eq("token", row.token);
              }
              fcmFailed++;
            }
          } catch (e) {
            console.error("FCM error per token:", e);
            fcmFailed++;
          }
        }
      } catch (e) {
        console.error("FCM setup error:", e);
      }
    }

    return new Response(JSON.stringify({ sent, failed, fcmSent, fcmFailed }), {
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
