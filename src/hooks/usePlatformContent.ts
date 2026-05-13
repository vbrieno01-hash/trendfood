import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

type ContentMap = Record<string, any>;

let cache: ContentMap | null = null;
let cacheTime = 0;
const CACHE_TTL = 5_000; // 5s — alinhado ao padrão global

// Realtime: invalida cache em todas as abas quando admin edita
let realtimeStarted = false;
const subscribers = new Set<() => void>();
function startRealtime() {
  if (realtimeStarted) return;
  realtimeStarted = true;
  supabase
    .channel("platform_content_changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "platform_content" },
      () => {
        cache = null;
        cacheTime = 0;
        subscribers.forEach((fn) => fn());
      }
    )
    .subscribe();
}

export function usePlatformContent() {
  const [content, setContent] = useState<ContentMap>(cache ?? {});
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    startRealtime();
    let cancelled = false;
    const fetchNow = () => {
      if (cache && Date.now() - cacheTime < CACHE_TTL) {
        setContent(cache);
        setLoading(false);
        return;
      }
      (supabase.from("platform_content") as any)
        .select("key, value")
        .then(({ data }: any) => {
          if (cancelled) return;
          if (data) {
            const map: ContentMap = {};
            data.forEach((r: any) => { map[r.key] = r.value; });
            cache = map;
            cacheTime = Date.now();
            setContent(map);
          }
          setLoading(false);
        });
    };
    fetchNow();
    subscribers.add(fetchNow);
    return () => {
      cancelled = true;
      subscribers.delete(fetchNow);
    };
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
