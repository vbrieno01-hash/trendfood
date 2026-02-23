import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export function usePushNotifications(orgId?: string, userId?: string) {
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !orgId || !userId) return;

    let mounted = true;

    const setup = async () => {
      try {
        const permResult = await PushNotifications.requestPermissions();
        if (permResult.receive !== "granted") {
          console.warn("[Push] Permissão negada");
          return;
        }

        await PushNotifications.register();

        await PushNotifications.addListener("registration", async (token) => {
          if (!mounted) return;
          console.info("[Push] Token FCM:", token.value);

          const { error } = await supabase
            .from("device_tokens" as any)
            .upsert(
              {
                org_id: orgId,
                user_id: userId,
                token: token.value,
                platform: "android",
              },
              { onConflict: "token" }
            );

          if (error) {
            console.error("[Push] Erro ao salvar token:", error.message);
          }
        });

        await PushNotifications.addListener("registrationError", (err) => {
          console.error("[Push] Erro no registro:", err.error);
        });

        await PushNotifications.addListener("pushNotificationReceived", (notification) => {
          toast.info(notification.title || "Nova notificação", {
            description: notification.body,
          });
        });

        await PushNotifications.addListener("pushNotificationActionPerformed", () => {
          navigate("/dashboard");
        });
      } catch (err) {
        console.error("[Push] Erro geral:", err);
      }
    };

    setup();

    return () => {
      mounted = false;
      PushNotifications.removeAllListeners();
    };
  }, [orgId, userId, navigate]);
}
