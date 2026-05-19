// Helper compartilhado para obter token iFood válido para uma org.
// Importado por edge functions de ações pontuais (validate, verify, tracking, handshake).

const IFOOD_API = "https://merchant-api.ifood.com.br";

export async function getValidIFoodToken(supabase: any, orgId: string): Promise<string | null> {
  const { data: cred } = await supabase
    .from("ifood_credentials").select("*")
    .eq("organization_id", orgId).maybeSingle();
  if (!cred) return null;

  if (cred.access_token && cred.token_expires_at && new Date(cred.token_expires_at) > new Date()) {
    return cred.access_token;
  }

  const clientId = Deno.env.get("IFOOD_CLIENT_ID");
  const clientSecret = Deno.env.get("IFOOD_CLIENT_SECRET");
  if (!clientId || !clientSecret) return cred.access_token ?? null;

  const params = new URLSearchParams();
  if (cred.refresh_token) {
    params.set("grantType", "refresh_token");
    params.set("clientId", clientId);
    params.set("clientSecret", clientSecret);
    params.set("refreshToken", cred.refresh_token);
  } else {
    params.set("grantType", "client_credentials");
    params.set("clientId", clientId);
    params.set("clientSecret", clientSecret);
  }

  const tr = await fetch(`${IFOOD_API}/authentication/v1.0/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  if (!tr.ok) return cred.access_token ?? null;
  const td = await tr.json();
  const access = td.accessToken ?? td.access_token;
  await supabase.from("ifood_credentials").update({
    access_token: access,
    refresh_token: td.refreshToken ?? td.refresh_token ?? cred.refresh_token,
    token_expires_at: new Date(Date.now() + (td.expiresIn ?? td.expires_in ?? 3600) * 1000).toISOString(),
  }).eq("id", cred.id);
  return access;
}

export { IFOOD_API };