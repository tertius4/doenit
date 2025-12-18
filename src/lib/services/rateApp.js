import { PUBLIC_GOOGLE_PLAY_STORE_URL } from "$env/static/public";
import { InAppReview } from "@capacitor-community/in-app-review";
import { Alert } from "$lib/core/alert.js";
import { t } from "$lib/services/language.svelte";
import { DateUtil } from "$lib/core/date_util";
import { Cached } from "$lib/core/cache.svelte";
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";

class RateAppService {
  constructor() {
    this.TASK_COMPLETION_THRESHOLD = 3;
    this.DAYS_OF_USE_THRESHOLD = 7;
    this.DISMISS_COOLDOWN_DAYS = 15;
  }

  init() {
    // Initialize tracking data if not exists
    const settings = Cached.rateUs.value;

    if (!settings) {
      Cached.rateUs.value = {
        task_completions: 0,
        first_use_date: DateUtil.format(new Date(), "YYYY-MM-DD HH:mm:ss"),
        last_dismissed_date: null,
      };
    }
  }

  async showRatingPrompt() {
    if (!Cached.rateUs.value) return;

    try {
      const tracking = Cached.rateUs.value;
      if (!tracking.last_dismissed_date) {
        tracking.last_dismissed_date = DateUtil.format(new Date(), "YYYY-MM-DD HH:mm:ss");
        Cached.rateUs.value = tracking;
        return;
      }

      const dismissed_date = new Date(tracking.last_dismissed_date);
      const days_since_dismissed = Math.floor((Date.now() - dismissed_date.getTime()) / (1000 * 60 * 60 * 24));
      if (days_since_dismissed < this.DISMISS_COOLDOWN_DAYS) {
        return;
      }

      tracking.last_dismissed_date = DateUtil.format(new Date(), "YYYY-MM-DD HH:mm:ss");
      Cached.rateUs.value = tracking;

      await InAppReview.requestReview();
    } catch (error) {
      console.error("Failed to show in-app review:", error);
    }
  }

  async openStorePage() {
    try {
      if (Capacitor.isNativePlatform()) {
        Browser.open({ url: PUBLIC_GOOGLE_PLAY_STORE_URL });
      } else {
        window.open(PUBLIC_GOOGLE_PLAY_STORE_URL, "_blank");
      }
    } catch (e) {
      Alert.error(t("rate_app_error"));
    }
  }
}

export const RateApp = new RateAppService();
