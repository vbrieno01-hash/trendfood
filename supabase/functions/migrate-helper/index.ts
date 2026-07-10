const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Throwaway helper: activates Google OAuth on the NEW Supabase project.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = Deno.env.get("NEW_SUPABASE_URL");
  const sr = Deno.env.get("NEW_SUPABASE_SERVICE_ROLE");
  const cid = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID");
  const csec = Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET");

  if (!url || !sr || !cid || !csec) {
    return new Response(JSON.stringify({ error: "missing envs" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const patch = await fetch(`${url}/auth/v1/admin/config`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${sr}`,
      apikey: sr,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      external_google_enabled: true,
      external_google_client_id: cid,
      external_google_secret: csec,
    }),
  });

  const patchBody = await patch.text();

  const settings = await fetch(`${url}/auth/v1/settings`, {
    headers: { apikey: sr },
  });
  const settingsJson = await settings.json().catch(() => null);

  return new Response(
    JSON.stringify({
      patch_status: patch.status,
      patch_body: patchBody.slice(0, 500),
      google_enabled: settingsJson?.external?.google,
      external: settingsJson?.external,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});