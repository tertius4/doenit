<script>
  import toast from "$display/toast/toast.svelte";
  import Icon from "$display/comps/Icon.svelte";
  import t from "$display/translate";
  import { VERSION } from "$lib";
  import Api from "$logic/api";

  // Hou Weergawe in lyn met:
  // - android/app/build.gradle – versionName
  // - package.json – version

  async function handleRateApp() {
    await Api.settings.openStorePage();
  }

  async function handleSendEmail() {
    const result = await Api.settings.email();
    if (!result.ok) return toast.error(result.error || "Failed to open email client");

    window.location.href = result.value;
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
        <Icon name="star" class="text-xl" />
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
        <Icon name="mail" class="text-xl" />
        {t("send_email")}
      </button>
    </div>
  </div>
</section>
