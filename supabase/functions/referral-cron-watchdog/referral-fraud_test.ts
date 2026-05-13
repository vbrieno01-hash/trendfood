import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assertExists, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL") || Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

if (!SUPABASE_URL || !SERVICE_KEY) {
  throw new Error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY);

let counter = 0;
function uniq(prefix: string) {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}-${Math.random().toString(36).slice(2, 7)}`;
}

async function createOrg(opts: {
  user_id?: string | null;
  cnpj?: string | null;
  whatsapp?: string | null;
}) {
  const slug = uniq("test-fraud");
  const { data, error } = await sb
    .from("organizations")
    .insert({
      name: slug,
      slug,
      emoji: "🧪",
      primary_color: "#000000",
      user_id: opts.user_id ?? crypto.randomUUID(),
      cnpj: opts.cnpj ?? null,
      whatsapp: opts.whatsapp ?? null,
      subscription_plan: "free",
      subscription_status: "active",
    })
    .select("id, user_id, cnpj, whatsapp, trial_ends_at")
    .single();
  if (error) throw error;
  return data!;
}

async function cleanup(ids: string[]) {
  if (ids.length === 0) return;
  await sb.from("referral_bonuses").delete().in("referrer_org_id", ids);
  await sb.from("referral_bonuses").delete().in("referred_org_id", ids);
  await sb.from("referral_block_logs").delete().in("referrer_org_id", ids);
  await sb.from("organizations").delete().in("id", ids);
}

Deno.test("trigger blocks self-referral (referrer = referred)", async () => {
  const org = await createOrg({});
  try {
    const { error } = await sb.from("referral_bonuses").insert({
      referrer_org_id: org.id,
      referred_org_id: org.id,
      bonus_days: 30,
    });
    assertExists(error);
    assert(error!.message.toLowerCase().includes("auto-indica"));
  } finally {
    await cleanup([org.id]);
  }
});

Deno.test("trigger blocks same user_id across two orgs", async () => {
  const sharedUser = crypto.randomUUID();
  const a = await createOrg({ user_id: sharedUser });
  const b = await createOrg({ user_id: sharedUser });
  try {
    const { error } = await sb.from("referral_bonuses").insert({
      referrer_org_id: a.id,
      referred_org_id: b.id,
      bonus_days: 30,
    });
    assertExists(error);
    assert(error!.message.toLowerCase().includes("mesmo dono"));
  } finally {
    await cleanup([a.id, b.id]);
  }
});

Deno.test("trigger blocks same CNPJ", async () => {
  const cnpj = "12345678000199";
  const a = await createOrg({ cnpj });
  const b = await createOrg({ cnpj: "12.345.678/0001-99" }); // mesma raiz, formato diferente
  try {
    const { error } = await sb.from("referral_bonuses").insert({
      referrer_org_id: a.id,
      referred_org_id: b.id,
      bonus_days: 30,
    });
    assertExists(error);
    assert(error!.message.toLowerCase().includes("cnpj"));
  } finally {
    await cleanup([a.id, b.id]);
  }
});

Deno.test("trigger blocks same WhatsApp", async () => {
  const a = await createOrg({ whatsapp: "5511999998888" });
  const b = await createOrg({ whatsapp: "(11) 99999-8888" });
  try {
    const { error } = await sb.from("referral_bonuses").insert({
      referrer_org_id: a.id,
      referred_org_id: b.id,
      bonus_days: 30,
    });
    assertExists(error);
    assert(error!.message.toLowerCase().includes("whatsapp"));
  } finally {
    await cleanup([a.id, b.id]);
  }
});

Deno.test("monthly limit > 180d flags for review (does not credit)", async () => {
  const referrer = await createOrg({});
  const referredIds: string[] = [];
  try {
    // Cria 6 indicações de 30d (180d) — todas valem
    for (let i = 0; i < 6; i++) {
      const r = await createOrg({});
      referredIds.push(r.id);
      const { error } = await sb.from("referral_bonuses").insert({
        referrer_org_id: referrer.id,
        referred_org_id: r.id,
        bonus_days: 30,
      });
      assertEquals(error, null);
    }
    // 7ª deve passar do limite e ficar flagged
    const extra = await createOrg({});
    referredIds.push(extra.id);
    const { data, error } = await sb.from("referral_bonuses").insert({
      referrer_org_id: referrer.id,
      referred_org_id: extra.id,
      bonus_days: 30,
    }).select("flagged_reason, released_at").single();
    assertEquals(error, null);
    assertEquals(data!.flagged_reason, "monthly_limit_exceeded");
    assertEquals(data!.released_at, null);
  } finally {
    await cleanup([referrer.id, ...referredIds]);
  }
});

Deno.test("revert_referral_bonus_by_payment subtracts days from trial_ends_at", async () => {
  const referrer = await createOrg({});
  const referred = await createOrg({});
  const paymentId = uniq("test-pay");
  try {
    const { error: insErr } = await sb.from("referral_bonuses").insert({
      referrer_org_id: referrer.id,
      referred_org_id: referred.id,
      bonus_days: 30,
      source_payment_id: paymentId,
    });
    assertEquals(insErr, null);

    // Simula bônus já aplicado: define applied_at e trial_ends_at = now + 30d
    const future = new Date(Date.now() + 30 * 86400_000).toISOString();
    await sb.from("organizations").update({ trial_ends_at: future }).eq("id", referrer.id);
    await sb.from("referral_bonuses").update({ applied_at: new Date().toISOString() })
      .eq("source_payment_id", paymentId);

    const { data: count, error: rpcErr } = await sb.rpc("revert_referral_bonus_by_payment", {
      _payment_id: paymentId,
    });
    assertEquals(rpcErr, null);
    assert(Number(count) >= 1);

    const { data: org } = await sb.from("organizations").select("trial_ends_at").eq("id", referrer.id).single();
    const newEnd = new Date(org!.trial_ends_at!).getTime();
    const expected = new Date(future).getTime() - 30 * 86400_000;
    // tolerância de 5s
    assert(Math.abs(newEnd - expected) < 5000, `Expected ${expected}, got ${newEnd}`);

    const { data: bonus } = await sb.from("referral_bonuses").select("reverted_at, flagged_reason")
      .eq("source_payment_id", paymentId).single();
    assertExists(bonus!.reverted_at);
  } finally {
    await cleanup([referrer.id, referred.id]);
  }
});