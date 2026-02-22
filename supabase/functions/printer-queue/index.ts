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

  // Validate PRINTER_ROBOT_TOKEN
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

  // Create admin client with service role
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

      const { data, error } = await supabase
        .from("fila_impressao")
        .select("*")
        .eq("organization_id", orgId)
        .eq("status", "pendente")
        .order("created_at", { ascending: true });

      if (error) throw error;

      return new Response(JSON.stringify(data), {
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
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
