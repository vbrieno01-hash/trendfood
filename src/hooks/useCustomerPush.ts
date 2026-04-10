import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const VAPID_PUBLIC_KEY = "BBATtReMYYfX0TzAWOBYZkVAZlvUZlQJGI-YRtlqpPRo3Y0enwYdArCVl4R1TzyoeJuPD8gbSlKippNGaim-6QM";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function useCustomerPush() {
  const registerForOrder = useCallback(async (orderId: string): Promise<boolean> => {
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        console.log("[CustomerPush] Not supported");
        return false;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        console.log("[CustomerPush] Permission denied");
        return false;
      }

      const reg = await navigator.serviceWorker.register("/sw-push.js", { scope: "/" });
      await navigator.serviceWorker.ready;

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      });

      const subJson = sub.toJSON();
      const endpoint = subJson.endpoint!;
      const p256dh = subJson.keys!.p256dh!;
      const auth = subJson.keys!.auth!;

      const { error } = await supabase.from("customer_push_subscriptions" as any).upsert(
        { order_id: orderId, endpoint, p256dh, auth },
        { onConflict: "endpoint,order_id" }
      );

      if (error) {
        console.error("[CustomerPush] Error saving:", error);
        return false;
      }

      console.log("[CustomerPush] Registered for order", orderId);
      return true;
    } catch (err) {
      console.error("[CustomerPush] Error:", err);
      return false;
    }
  }, []);

  return { registerForOrder };
}
