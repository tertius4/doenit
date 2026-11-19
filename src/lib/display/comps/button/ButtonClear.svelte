<script>
  import Icon from "$display/comps/Icon.svelte";
  import t from "$display/translate";

  const { ...rest } = $props();
</script>

<button
  aria-label={t("clear")}
  {...rest}
  type="button"
  class={["aspect-square h-12 flex items-center justify-center", rest.class || ""]}
>
  <Icon name="times" size={20} />
</button>
