<script>
  import Icon from "$display/comps/Icon.svelte";
  import t from "$display/translate";

  /**
   * @typedef {Object} Props
   * @prop {AL.ApiKey} key - The key to show.
   * @prop {(key: AL.ApiKey) => *} onrevoke - Called when the user taps the trash button.
   */

  /** @type {Props} */
  const { key, onrevoke } = $props();

  const details = $derived.by(() => {
    const created = t("api_key_created_at", { date: formatDate(key.created_at) });
    const used = key.last_used_at
      ? t("api_key_last_used", { date: formatDate(key.last_used_at) })
      : t("api_key_never_used");
    return `${key.prefix} · ${created} · ${used}`;
  });

  /** @param {string} date */
  function formatDate(date) {
    return new Date(date).toLocaleDateString(undefined, { day: "numeric", month: "short" });
  }
</script>

<div class="flex items-center gap-2 bg-card rounded-lg">
  <div class="flex-1 min-w-0 p-3">
    <p class="font-medium truncate">{key.label}</p>
    <p class="text-muted text-xs">{details}</p>
  </div>
  <button
    type="button"
    class="p-3 shrink-0"
    aria-label={t("api_key_revoke_label", { label: key.label })}
    onclick={() => onrevoke(key)}
  >
    <Icon name="trash" class="text-error" size={18} />
  </button>
</div>
