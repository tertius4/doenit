import { Capacitor } from "@capacitor/core";

/** True in a browser (doenit.org), false in the Android and iOS apps. */
export const is_web = !Capacitor.isNativePlatform();

/** Registers the service worker that makes doenit.org work offline. Only on the web, and not while developing. */
export function registerServiceWorker(): void {
  if (!is_web || import.meta.env.DEV || !("serviceWorker" in navigator)) return;

  navigator.serviceWorker.register("/service-worker.js").catch((error) => {
    console.warn("[platform] service worker registration failed:", error);
  });
}
