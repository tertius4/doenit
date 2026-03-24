<script>
  import Icon from "$display/comps/Icon.svelte";

  const { ...rest } = $props();
</script>

<button {...rest} type="button" class={["aspect-square h-12 flex items-center justify-center", rest.class || ""]}>
  <Icon name="times" size={20} />
</button>
