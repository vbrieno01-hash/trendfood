import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  const expectedToken = Deno.env.get("PRINTER_ROBOT_TOKEN");

  if (
    !expectedToken ||
    !authHeader ||
    authHeader !== `Bearer ${expectedToken}`
  ) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    if (req.method === "GET") {
      const url = new URL(req.url);
      const orgId = url.searchParams.get("org_id");

      if (!orgId) {
        return new Response(
          JSON.stringify({ error: "org_id query parameter is required" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Atomic claim: marks jobs as 'imprimindo' and returns them.
      // Even with multiple polling robots/tabs, each job goes to exactly ONE caller.
      // If the robot crashes mid-print, a pg_cron job returns 'imprimindo' jobs
      // older than 60s back to 'pendente'.
      const { data, error } = await supabase.rpc("claim_print_jobs", {
        _org_id: orgId,
      });

      if (error) throw error;

      return new Response(JSON.stringify(data ?? []), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST") {
      const body = await req.json();
      const { id } = body;

      if (!id) {
        return new Response(
          JSON.stringify({ error: "id is required in body" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const { error } = await supabase
        .from("fila_impressao")
        .update({ status: "impresso", printed_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
