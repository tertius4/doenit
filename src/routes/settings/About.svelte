<script>
  import { t } from "$lib/services/language.svelte";
  import { RateApp } from "$lib/services/rateApp.js";
  import { Star, Mail } from "$lib/icon";
  import { Device } from "@capacitor/device";

  // Hou Weergawe in lyn met:
  // - android/app/build.gradle – versionName
  // - package.json – version
  const SUPPORT_EMAIL = "doenitapp@gmail.com";
  const VERSION = "1.3.0";

  async function handleRateApp() {
    await RateApp.openStorePage();
  }

  async function handleSendEmail() {
    const deviceInfo = await Device.getInfo();
    const device = `${deviceInfo.manufacturer} ${deviceInfo.model} - ${deviceInfo.operatingSystem} ${deviceInfo.osVersion}`;
    const subject = encodeURIComponent(`Fout in Doenit ${VERSION} - ${device}`);
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${subject}`;
  }
</script>

<section class="rounded-md p-4 bg-surface space-y-3">
  <h3 class="font-semibold text-lg mb-2">{t("about_doenit")}</h3>

  <div class="flex justify-between">
    <p>{t("version")}:</p>
    <pre>{VERSION}</pre>
  </div>

  <div class="pt-2 border-t border-default">
    <p class="mb-2">{t("havent_rated_yet")}</p>
    <div class="w-full flex justify-end">
      <button
        type="button"
        aria-label={t("rate_doenit")}
        onclick={handleRateApp}
        class="w-full justify-center h-12 bg-card border-default border rounded-md flex items-center gap-2"
      >
        <Star class="text-xl" />
        {t("rate_doenit")}
      </button>
    </div>
  </div>

  <div class="pt-2 border-t border-default">
    <p class="mb-2">{t("contact_support")}</p>
    <div class="w-full flex justify-end">
      <button
        type="button"
        aria-label={t("send_email")}
        onclick={handleSendEmail}
        class="w-full justify-center h-12 bg-card border-default border rounded-md items-center flex gap-2"
      >
        <Mail class="text-xl" />
        {t("send_email")}
      </button>
    </div>
  </div>
</section>
