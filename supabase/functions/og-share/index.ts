import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BASE_URL = "https://trendfood.lovable.app";
const FALLBACK_IMAGE = `${BASE_URL}/placeholder.svg`;

Deno.serve(async (req) => {
  const url = new URL(req.url);
  // Extract slug from path: /og-share/my-slug
  const parts = url.pathname.split("/").filter(Boolean);
  // parts = ["og-share", "my-slug"] or ["v1", "og-share", "my-slug"]
  const slug = parts[parts.length - 1];

  if (!slug || slug === "og-share") {
    return new Response("Not found", { status: 404 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: org } = await supabase
    .from("organizations")
    .select("name, slug, description, logo_url, emoji")
    .eq("slug", slug)
    .maybeSingle();

  if (!org) {
    // Redirect to home if store not found
    return new Response(null, {
      status: 302,
      headers: { Location: BASE_URL },
    });
  }

  const title = `${org.emoji} ${org.name} — Cardápio Digital`;
  const description =
    org.description || `Peça online no ${org.name}! Cardápio digital TrendFood.`;
  const image = org.logo_url || FALLBACK_IMAGE;
  const storeUrl = `${BASE_URL}/unidade/${org.slug}`;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${escapeHtml(title)}</title>
  <meta property="og:type" content="website"/>
  <meta property="og:title" content="${escapeHtml(title)}"/>
  <meta property="og:description" content="${escapeHtml(description)}"/>
  <meta property="og:image" content="${escapeHtml(image)}"/>
  <meta property="og:url" content="${escapeHtml(storeUrl)}"/>
  <meta property="og:site_name" content="TrendFood"/>
  <meta name="twitter:card" content="summary_large_image"/>
  <meta name="twitter:title" content="${escapeHtml(title)}"/>
  <meta name="twitter:description" content="${escapeHtml(description)}"/>
  <meta name="twitter:image" content="${escapeHtml(image)}"/>
  <meta http-equiv="refresh" content="0;url=${escapeHtml(storeUrl)}"/>
</head>
<body>
  <p>Redirecionando para <a href="${escapeHtml(storeUrl)}">${escapeHtml(org.name)}</a>…</p>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
});

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
