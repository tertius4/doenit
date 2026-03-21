<script>
  import Icon from "$display/comps/Icon.svelte";
  import { t } from "$lib/services/language.svelte";

  const { onclose, ...rest } = $props();

  function handleClose() {
    if (onclose) onclose();
  }
</script>

<button
  {...rest}
  class={["p-2 rounded-full aspect-square flex items-center justify-center", rest.class]}
  type="button"
  aria-label={t("close_modal")}
  title={t("close")}
  onclick={handleClose}
>
  <Icon name="times" size={20} />
</button>
