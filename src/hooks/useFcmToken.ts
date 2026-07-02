import { useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";
import { getFirebaseApp, FIREBASE_VAPID_PUBLIC_KEY } from "@/lib/firebase";

/**
 * Registra o dispositivo do lojista logado no FCM e faz upsert em `fcm_tokens`.
 * - No APK Android (Capacitor): usa @capacitor/push-notifications
 * - No navegador: usa firebase/messaging + service worker
 */
export function useFcmToken(organizationId: string | undefined, userId: string | undefined) {
  const registeredRef = useRef(false);

  useEffect(() => {
    if (!organizationId || !userId) return;
    if (registeredRef.current) return;
    registeredRef.current = true;

    const isNative = Capacitor.isNativePlatform();

    if (isNative) {
      registerNative(organizationId, userId).catch((e) =>
        console.warn("[FCM native] register failed:", e)
      );
    } else {
      // Web push já é 100% coberto por usePushSubscription (VAPID próprio + sw-push.js).
      // Não registrar Firebase Messaging no navegador evita conflito entre dois service
      // workers e é o único caminho suportado para o web push do lojista.
      console.info("[FCM] web ignorado — usePushSubscription cuida do web push");
    }
  }, [organizationId, userId]);
}

async function upsertToken(
  organizationId: string,
  userId: string,
  token: string,
  platform: "android" | "ios" | "web"
) {
  const { error } = await supabase
    .from("fcm_tokens" as any)
    .upsert(
      { organization_id: organizationId, user_id: userId, token, platform },
      { onConflict: "token" }
    );
  if (error) console.warn("[FCM] upsert error:", error);
  else console.log("[FCM] token saved (", platform, ")");
}

async function registerNative(organizationId: string, userId: string) {
  const { PushNotifications } = await import("@capacitor/push-notifications");

  const perm = await PushNotifications.checkPermissions();
  if (perm.receive !== "granted") {
    const req = await PushNotifications.requestPermissions();
    if (req.receive !== "granted") {
      console.log("[FCM native] permission denied");
      return;
    }
  }

  PushNotifications.addListener("registration", (t) => {
    void upsertToken(organizationId, userId, t.value, "android");
  });
  PushNotifications.addListener("registrationError", (err) => {
    console.warn("[FCM native] registration error", err);
  });

  await PushNotifications.register();
}

async function registerWeb(organizationId: string, userId: string) {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator) || !("Notification" in window)) return;
  if (FIREBASE_VAPID_PUBLIC_KEY.startsWith("REPLACE_")) {
    console.warn("[FCM web] VAPID key not configured; skipping");
    return;
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return;

  const swReg = await navigator.serviceWorker.register("/firebase-messaging-sw.js", {
    scope: "/firebase-cloud-messaging-push-scope",
  });

  const { getMessaging, getToken } = await import("firebase/messaging");
  const messaging = getMessaging(getFirebaseApp());

  const token = await getToken(messaging, {
    vapidKey: FIREBASE_VAPID_PUBLIC_KEY,
    serviceWorkerRegistration: swReg,
  });

  if (token) void upsertToken(organizationId, userId, token, "web");
}