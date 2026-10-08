import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { Toast } from "@capacitor/toast";
import { backHandler } from "./BackHandler.svelte";
import { navHistory } from "./NavHistory";
import { pathOf } from "$lib";

const EXIT_WINDOW_MS = 2000;

/**
 * Wire the Android hardware back button to the backHandler.
 * When nothing handles it: go back, or on the home page require a double press to exit.
 *
 * @param {() => string} getExitMessage - Translated "press again to exit" text
 * @returns {() => void} cleanup
 */
export function installHardwareBack(getExitMessage) {
  if (!Capacitor.isNativePlatform()) return () => {};

  let last_press = 0;

  const listener = App.addListener("backButton", async () => {
    if (await backHandler.handle()) return;

    if (pathOf(window.location) !== "/") {
      navHistory.back("/");
      return;
    }

    const now = Date.now();
    if (now - last_press < EXIT_WINDOW_MS) return App.exitApp();

    last_press = now;
    await Toast.show({ text: getExitMessage(), duration: "short" });
  });

  return () => {
    listener.then((l) => l.remove());
  };
}
