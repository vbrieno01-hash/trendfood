import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const IMAGE_BUCKETS = ["menu-images", "logos", "site-images", "guide-images"];
const MIN_AGE_DAYS = 7;

/** Extract a storage object path from a public URL like
 *  https://<ref>.supabase.co/storage/v1/object/public/<bucket>/<path>
 */
function extractPath(url: string, bucket: string): string | null {
  if (!url) return null;
  const marker = `/storage/v1/object/public/${bucket}/`;
  const i = url.indexOf(marker);
  if (i === -1) return null;
  return decodeURIComponent(url.slice(i + marker.length).split("?")[0]);
}

function collectStringsFromJson(value: unknown, out: Set<string>) {
  if (typeof value === "string") {
    out.add(value);
  } else if (Array.isArray(value)) {
    for (const v of value) collectStringsFromJson(v, out);
  } else if (value && typeof value === "object") {
    for (const v of Object.values(value)) collectStringsFromJson(v, out);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Auth: shared secret
    const url = new URL(req.url);
    const secret = url.searchParams.get("secret") ?? req.headers.get("x-cleanup-secret");
    const expected = Deno.env.get("UNIVERSAL_WEBHOOK_SECRET");
    if (!expected || secret !== expected) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Read config
    const { data: cfg } = await supabase
      .from("cleanup_config")
      .select("dry_run, enabled")
      .eq("id", 1)
      .maybeSingle();
    if (!cfg || !cfg.enabled) {
      return new Response(JSON.stringify({ skipped: true, reason: "disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const isDryRun = cfg.dry_run !== false;

    // ── Build the set of referenced paths per bucket ──
    const referenced: Record<string, Set<string>> = {};
    for (const b of IMAGE_BUCKETS) referenced[b] = new Set();

    // menu_items.image_url → menu-images
    {
      const { data } = await supabase.from("menu_items").select("image_url");
      for (const r of data ?? []) {
        const p = extractPath(r.image_url ?? "", "menu-images");
        if (p) referenced["menu-images"].add(p);
      }
    }
    // organizations.logo_url + banner_url → logos
    {
      const { data } = await supabase.from("organizations").select("logo_url, banner_url");
      for (const r of data ?? []) {
        for (const u of [r.logo_url, r.banner_url]) {
          const p = extractPath(u ?? "", "logos");
          if (p) referenced["logos"].add(p);
        }
      }
    }
    // platform_content (JSONB) → site-images + guide-images
    {
      const { data } = await supabase.from("platform_content").select("value");
      const allStrings = new Set<string>();
      for (const r of data ?? []) collectStringsFromJson(r.value, allStrings);
      for (const s of allStrings) {
        for (const b of ["site-images", "guide-images"]) {
          const p = extractPath(s, b);
          if (p) referenced[b].add(p);
        }
      }
    }

    // ── For each bucket, list files and identify orphans ──
    const cutoff = Date.now() - MIN_AGE_DAYS * 24 * 60 * 60 * 1000;
    let totalIdentified = 0;
    let totalBytes = 0;
    let totalDeleted = 0;
    const perBucket: Record<string, { identified: number; bytes: number; deleted: number }> = {};

    for (const bucket of IMAGE_BUCKETS) {
      const refs = referenced[bucket];
      perBucket[bucket] = { identified: 0, bytes: 0, deleted: 0 };

      // Recursively list files (one level of folders is enough for our buckets,
      // but iterate to be safe).
      const orphans: { path: string; size: number }[] = [];
      const stack: string[] = [""]; // start at root

      while (stack.length) {
        const folder = stack.pop()!;
        let offset = 0;
        const PAGE = 1000;
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { data: files, error } = await supabase.storage
            .from(bucket)
            .list(folder || undefined, {
              limit: PAGE,
              offset,
              sortBy: { column: "name", order: "asc" },
            });
          if (error) {
            console.error(`[cleanup] list error in ${bucket}/${folder}:`, error.message);
            break;
          }
          if (!files || files.length === 0) break;

          for (const f of files) {
            const fullPath = folder ? `${folder}/${f.name}` : f.name;
            // Folder (no metadata)
            if (!f.metadata) {
              stack.push(fullPath);
              continue;
            }
            const size = (f.metadata?.size as number) ?? 0;
            const created = f.created_at ? new Date(f.created_at).getTime() : 0;
            if (created > cutoff) continue; // too recent
            if (refs.has(fullPath)) continue; // referenced
            orphans.push({ path: fullPath, size });
          }

          if (files.length < PAGE) break;
          offset += PAGE;
        }
      }

      // Log + (optionally) delete in batches of 100
      for (let i = 0; i < orphans.length; i += 100) {
        const chunk = orphans.slice(i, i + 100);

        // Log every orphan
        const logRows = chunk.map((o) => ({
          kind: "orphan_image",
          target: o.path,
          bucket,
          size_bytes: o.size,
          reason: "Sem referência no banco e arquivo com mais de 7 dias",
          dry_run: isDryRun,
        }));
        const { error: logErr } = await supabase.from("cleanup_logs").insert(logRows);
        if (logErr) console.error("[cleanup] log insert error:", logErr.message);

        if (!isDryRun) {
          const { error: delErr } = await supabase.storage
            .from(bucket)
            .remove(chunk.map((o) => o.path));
          if (delErr) {
            console.error(`[cleanup] delete error in ${bucket}:`, delErr.message);
          } else {
            perBucket[bucket].deleted += chunk.length;
            totalDeleted += chunk.length;
          }
        }

        perBucket[bucket].identified += chunk.length;
        perBucket[bucket].bytes += chunk.reduce((a, b) => a + (b.size ?? 0), 0);
        totalIdentified += chunk.length;
        totalBytes += chunk.reduce((a, b) => a + (b.size ?? 0), 0);
      }
    }

    return new Response(
      JSON.stringify({
        dry_run: isDryRun,
        total_identified: totalIdentified,
        total_bytes: totalBytes,
        total_deleted: totalDeleted,
        per_bucket: perBucket,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[cleanup-orphan-storage] error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});