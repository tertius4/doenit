<script>
  const { children, ...rest } = $props();
</script>

<button
  {...rest}
  class={[
    "h-12 my-auto flex gap-1 border border-default rounded-lg px-4 w-full items-center justify-center",
    rest.class || "",
  ]}
>
  {@render children()}
</button>
