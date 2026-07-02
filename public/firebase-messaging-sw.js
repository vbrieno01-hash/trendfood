// Firebase Cloud Messaging service worker
// Handles push notifications when the web app is in background/closed.
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyDx-fVj-1eYzoBAB0FJfONHTPmm2VVBnzk",
  authDomain: "mcd-notificacoes.firebaseapp.com",
  projectId: "mcd-notificacoes",
  storageBucket: "mcd-notificacoes.firebasestorage.app",
  messagingSenderId: "463560340793",
  appId: "1:463560340793:web:8a7b32773393c94f06e4e8",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || payload.data?.title || "🔔 Novo Pedido!";
  const body = payload.notification?.body || payload.data?.body || "";
  const url = payload.data?.url || "/dashboard?tab=home";

  self.registration.showNotification(title, {
    body,
    icon: "/pwa-192.png",
    badge: "/pwa-192.png",
    vibrate: [200, 100, 200],
    tag: payload.data?.event_type || "fcm",
    renotify: true,
    data: { url },
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/dashboard?tab=home";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url.includes("/dashboard") && "focus" in c) return c.focus();
      }
      return clients.openWindow(url);
    })
  );
});