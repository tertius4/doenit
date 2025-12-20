<script>
  const { color: stroke = "currentColor", ...rest } = $props();
</script>

<svg {...rest} fill="none" {stroke} viewBox="0 0 24 24" style="width: 1em; height: 1em;">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4-4 4M3 12h18" />
</svg>
