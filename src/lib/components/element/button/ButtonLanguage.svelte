<script>
  let { selected = false, flagSrc, languageName, onclick, ...rest } = $props();
</script>

<button
  class={[
    {
      "flex items-center gap-2 h-12 p-2 rounded-lg border": true,
      "bg-primary/40 border-primary": selected,
      "bg-card": !selected,
    },
    rest.class || "",
  ]}
  aria-pressed={selected}
  {onclick}
>
  <img src={flagSrc} alt="{languageName} flag" class="w-fit h-full object-cover rounded-sm" />
  <span
    class={{
      "text-sm": true,
      "font-semibold": selected,
      "font-medium": !selected,
    }}
  >
    {languageName}
  </span>
</button>
