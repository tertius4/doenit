<script>
  import { longpress } from "$logic/long-press";
  import { slide } from "svelte/transition";

  const { children, onlongpress, ...rest } = $props();
</script>

<div class="relative min-h-10 rounded-lg duration-600! delay-100" out:slide in:slide={{ delay: 200 }}>
  <button
    type="button"
    {...rest}
    {onlongpress}
    use:longpress
    class={["rounded-lg flex flex-col items-start py-4 px-2 w-full h-full", rest.class || ""]}
  >
    {@render children()}
  </button>
</div>
