import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

// Flag de controle: só habilitar quando o google-services.json estiver configurado
const FIREBASE_CONFIGURED = false;

export function usePushNotifications(orgId?: string, userId?: string) {
  const navigate = useNavigate();

  useEffect(() => {
    if (!FIREBASE_CONFIGURED) {
      console.info("[Push] Firebase não configurado — push notifications desabilitadas");
      return;
    }

    if (!Capacitor.isNativePlatform() || !orgId || !userId) return;

    let mounted = true;

    const setup = async () => {
      try {
        // Import dinâmico para evitar carregar o módulo nativo quando Firebase não está pronto
        const { PushNotifications } = await import("@capacitor/push-notifications");

        if (!Capacitor.isPluginAvailable("PushNotifications")) {
          console.warn("[Push] Plugin não disponível");
          return;
        }

        // Registrar listener de erro ANTES de register()
        await PushNotifications.addListener("registrationError", (err) => {
          console.error("[Push] Erro no registro:", err.error);
        });

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
      import("@capacitor/push-notifications")
        .then(({ PushNotifications }) => PushNotifications.removeAllListeners())
        .catch(() => {});
    };
  }, [orgId, userId, navigate]);
}
