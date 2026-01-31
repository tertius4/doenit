<script>
  const { name, class: className = "" } = $props();
</script>

<svg aria-hidden="true" width={28} height={28} class={className}>
  <use href="#{name}" />
</svg>

<svg style="display: none;">
  <symbol id="arrow-left" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
  </symbol>
  <symbol id="arrow-right" viewBox="0 0 24 24" fill="currentColor">
    <path d="M4 13h12.17l-5.59 5.59L12 20l8-8-8-8-1.41 1.41L16.17 11H4v2z" />
  </symbol>
</svg>
