<script>
  import Icon from "$lib/components/element/Icon.svelte";

  const { ...rest } = $props();
</script>

<button {...rest} type="button" class={["aspect-square h-11 flex items-center justify-center", rest.class || ""]}>
  <Icon name="times" />
</button>
