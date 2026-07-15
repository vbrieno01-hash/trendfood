import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ADMIN_EMAIL = "brenojackson30@gmail.com";

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function slugify(v: string): string {
  return (v || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) return json(401, { error: "unauthorized" });

  // Verify caller is the admin
  const userClient = createClient(SUPABASE_URL, ANON, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) return json(401, { error: "unauthorized" });
  const callerEmail = (userData.user.email || "").toLowerCase();
  if (callerEmail !== ADMIN_EMAIL) return json(403, { error: "forbidden" });

  let body: any;
  try { body = await req.json(); } catch { return json(400, { error: "invalid_json" }); }

  const name = String(body?.name ?? "").trim();
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");
  const rawSlug = String(body?.slug ?? "").trim();
  const slug = slugify(rawSlug || name);
  const whatsapp = body?.whatsapp ? String(body.whatsapp).replace(/\D/g, "") : null;
  const plan = ["free", "pro", "enterprise", "lifetime"].includes(String(body?.plan))
    ? String(body.plan) : "free";
  const trialDays = Number.isFinite(Number(body?.trial_days)) ? Number(body.trial_days) : 0;
  const fullName = String(body?.full_name ?? name).trim();

  if (!name) return json(400, { error: "missing_name" });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(400, { error: "invalid_email" });
  if (password.length < 8) return json(400, { error: "weak_password" });
  if (!slug || slug.length < 2) return json(400, { error: "invalid_slug" });

  const admin = createClient(SUPABASE_URL, SERVICE, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Check slug availability
  {
    const { data: existing, error: e } = await admin
      .from("organizations").select("id").eq("slug", slug).maybeSingle();
    if (e) return json(500, { error: "db_error", detail: e.message });
    if (existing) return json(409, { error: "slug_in_use" });
  }

  // Create user (already confirmed)
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, created_by_admin: true },
  });

  if (createErr || !created?.user) {
    const msg = createErr?.message || "";
    if (/already been registered|already registered|duplicate/i.test(msg)) {
      return json(409, { error: "email_in_use" });
    }
    return json(500, { error: "auth_create_failed", detail: msg });
  }

  const userId = created.user.id;

  // Profile
  await admin.from("profiles").upsert(
    { user_id: userId, full_name: fullName },
    { onConflict: "user_id" },
  );

  // Organization
  const orgPayload: Record<string, unknown> = {
    user_id: userId,
    name,
    slug,
    emoji: "🍔",
    description: "Bem-vindo à nossa loja!",
    primary_color: "#f97316",
    whatsapp,
    subscription_plan: plan,
  };
  if (trialDays > 0) {
    orgPayload.trial_ends_at = new Date(Date.now() + trialDays * 86400000).toISOString();
  }

  const { data: org, error: orgErr } = await admin
    .from("organizations").insert(orgPayload).select("id, slug").maybeSingle();

  if (orgErr) {
    // rollback user to avoid orphan
    await admin.auth.admin.deleteUser(userId).catch(() => {});
    if ((orgErr as any).code === "23505") return json(409, { error: "slug_in_use" });
    return json(500, { error: "org_create_failed", detail: orgErr.message });
  }

  return json(200, {
    ok: true,
    user_id: userId,
    email,
    password,
    organization_id: org?.id,
    slug: org?.slug,
  });
});