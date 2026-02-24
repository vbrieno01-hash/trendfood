import { supabase } from "@/integrations/supabase/client";

interface ErrorLogParams {
  message: string;
  stack?: string;
  source: "error_boundary" | "unhandled_rejection" | "global_error";
  metadata?: Record<string, unknown>;
}

const ERROR_LIMIT = 5;
const WINDOW_MS = 60_000;
let timestamps: number[] = [];

export function logClientError(params: ErrorLogParams) {
  const now = Date.now();
  timestamps = timestamps.filter((t) => now - t < WINDOW_MS);
  if (timestamps.length >= ERROR_LIMIT) return;
  timestamps.push(now);

  let userId: string | undefined;
  let orgId: string | undefined;
  try {
    const raw = localStorage.getItem("sb-xrzudhylpphnzousilye-auth-token");
    if (raw) {
      const parsed = JSON.parse(raw);
      userId = parsed?.user?.id;
    }
  } catch {}

  supabase
    .from("client_error_logs" as never)
    .insert({
      error_message: params.message.slice(0, 2000),
      error_stack: params.stack?.slice(0, 5000) ?? null,
      url: window.location.href,
      user_agent: navigator.userAgent,
      user_id: userId ?? null,
      organization_id: orgId ?? null,
      source: params.source,
      metadata: params.metadata ?? null,
    } as never)
    .then(({ error }) => {
      if (error) console.warn("[errorLogger] insert failed:", error.message);
    });
}
