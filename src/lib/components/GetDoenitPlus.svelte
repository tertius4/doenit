<script>
  import { goto } from "$app/navigation";
  import { t } from "$lib/services/language.svelte";
  import Icon from "$lib/components/element/Icon.svelte";

  const { ...rest } = $props();

  const IS_PENDING = false;
  function navigateToPlus() {
    goto("/subscriptions");
  }
</script>

{#if !IS_PENDING}
  <div class="bg-surface rounded-lg p-4 border border-default">
    <div class="flex items-center gap-3 mb-3">
      <div class="bg-primary/20 rounded-full p-2 flex-shrink-0">
        <Icon name="crown" class="text-2xl text-primary" />
      </div>
      <div>
        <h3 class="font-semibold text-lg">{t("doenit_plus")}</h3>
        <p class="text-sm">{t("unlock_plus_features")}</p>
      </div>
    </div>

    <button
      type="button"
      onclick={navigateToPlus}
      class="w-full bg-primary text-alt py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
    >
      <Icon name="crown" class="text-xl" />
      {t("upgrade_to_plus")}
    </button>
  </div>
{:else}
  <div {...rest} class="rounded-lg p-6 h-full {rest.class || ''}">
    <div class="flex flex-col items-center text-center gap-4">
      <div class="bg-primary/10 rounded-full p-4">
        <Icon name="crown" class="text-4xl text-primary opacity-50" />
      </div>
      <div>
        <h3 class="font-semibold text-lg mb-1">Doenit</h3>
        <p class="text-sm">{t("coming_soon")}</p>
      </div>
      <div class="w-full max-w-xs">
        <div class="h-2 bg-card rounded-full overflow-hidden">
          <div class="h-full bg-primary/30 rounded-full animate-pulse" style="width: 60%"></div>
        </div>
        <p class="text-xs mt-2">{t("working_on_it")}</p>
      </div>
    </div>
  </div>
{/if}
