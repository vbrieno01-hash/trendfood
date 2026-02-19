import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface PixChargeResult {
  payment_id: string;
  qr_code: string | null;
  qr_code_base64: string | null;
  pix_copia_e_cola: string | null;
}

export function useCreatePixCharge() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PixChargeResult | null>(null);

  const createCharge = useCallback(
    async (organizationId: string, orderId: string, amount: number, description?: string) => {
      setLoading(true);
      setError(null);
      try {
        const { data: result, error: fnError } = await supabase.functions.invoke(
          "verify-pix-payment",
          {
            body: {
              organization_id: organizationId,
              order_id: orderId,
              amount,
              description,
            },
          }
        );

        if (fnError) throw new Error(fnError.message);
        if (result?.error) throw new Error(result.error);

        setData(result as PixChargeResult);
        return result as PixChargeResult;
      } catch (err: any) {
        setError(err.message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { createCharge, loading, error, data };
}

export function useCheckPixStatus(
  organizationId: string | undefined,
  paymentId: string | null,
  orderId: string | null,
  enabled: boolean = true
) {
  const [paid, setPaid] = useState(false);
  const [status, setStatus] = useState<string>("pending");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!enabled || !organizationId || !paymentId || !orderId || paid) {
      return;
    }

    const check = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("check-pix-status", {
          body: {
            organization_id: organizationId,
            payment_id: paymentId,
            order_id: orderId,
          },
        });

        if (!error && data) {
          setStatus(data.status);
          if (data.paid) {
            setPaid(true);
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
          }
        }
      } catch {
        // Silently retry on next interval
      }
    };

    // First check immediately
    check();
    // Then poll every 5 seconds
    intervalRef.current = setInterval(check, 5000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, organizationId, paymentId, orderId, paid]);

  return { paid, status };
}
