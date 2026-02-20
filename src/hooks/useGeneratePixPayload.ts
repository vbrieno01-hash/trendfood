import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useGeneratePixPayload() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<string | null>(null);

  const generate = useCallback(
    async (organizationId: string, amount: number): Promise<string | null> => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: fnError } = await supabase.functions.invoke(
          "generate-pix-payload",
          { body: { organization_id: organizationId, amount } }
        );

        if (fnError) throw new Error(fnError.message);
        if (data?.error) {
          if (data.error === "pix_key_not_configured") {
            setPayload(null);
            return null;
          }
          throw new Error(data.error);
        }

        setPayload(data.payload);
        return data.payload as string;
      } catch (err: any) {
        setError(err.message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { generate, loading, error, payload };
}
