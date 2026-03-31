import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

type ContentMap = Record<string, any>;

let cache: ContentMap | null = null;
let cacheTime = 0;
const CACHE_TTL = 60_000; // 1 min

export function usePlatformContent() {
  const [content, setContent] = useState<ContentMap>(cache ?? {});
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    if (cache && Date.now() - cacheTime < CACHE_TTL) {
      setContent(cache);
      setLoading(false);
      return;
    }
    (supabase.from("platform_content") as any)
      .select("key, value")
      .then(({ data }: any) => {
        if (data) {
          const map: ContentMap = {};
          data.forEach((r: any) => { map[r.key] = r.value; });
          cache = map;
          cacheTime = Date.now();
          setContent(map);
        }
        setLoading(false);
      });
  }, []);

  return { content, loading };
}

export function usePlatformContentAdmin() {
  const [rows, setRows] = useState<{ key: string; value: any }[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data } = await (supabase.from("platform_content") as any)
      .select("key, value")
      .order("key");
    setRows(data ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function upsert(key: string, value: any) {
    const { error } = await (supabase.from("platform_content") as any)
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
    if (error) throw error;
    cache = null;
    cacheTime = 0;
    await load();
  }

  async function remove(key: string) {
    await (supabase.from("platform_content") as any).delete().eq("key", key);
    cache = null;
    cacheTime = 0;
    await load();
  }

  return { rows, loading, upsert, remove, reload: load };
}
