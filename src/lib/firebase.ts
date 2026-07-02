// Firebase Web SDK config
// Note: apiKey e demais campos são identificadores públicos do projeto,
// não são secrets. Segurança real vem das regras do Firebase.
import { initializeApp, type FirebaseApp } from "firebase/app";

export const firebaseConfig = {
  apiKey: "AIzaSyBtdi414REXN9kAkRypejagIQ-c7Kv09f0",
  authDomain: "mcd-notificacoes.firebaseapp.com",
  projectId: "mcd-notificacoes",
  storageBucket: "mcd-notificacoes.firebasestorage.app",
  messagingSenderId: "463560340793",
  appId: "1:463560340793:web:8a7b32773393c94f06e4e8",
  measurementId: "G-DLMJCY0PZ6",
};

// VAPID pública gerada em Firebase Console → Cloud Messaging → Configuração da Web
// Usada para inscrever navegadores no FCM Web Push.
// (é pública por design — vai no bundle)
export const FIREBASE_VAPID_PUBLIC_KEY =
  "REPLACE_WITH_FIREBASE_VAPID_PUBLIC_KEY";

let cachedApp: FirebaseApp | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (!cachedApp) cachedApp = initializeApp(firebaseConfig);
  return cachedApp;
}