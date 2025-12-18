<script>
  import { slide } from "svelte/transition";
  import { LongPress } from "$lib/services/long_press.svelte";

  const { children, tick_animation, onlongpress, ...rest } = $props();
</script>

<div
  class="relative min-h-10 rounded-lg duration-600! delay-100"
  class:translate-x-[80%]={tick_animation}
  class:opacity-0={tick_animation}
  in:slide={{ delay: 200 }}
  
>
  <button
    type="button"
    {...rest}
    {onlongpress}
    use:LongPress.create
    class={["rounded-lg flex flex-col items-start py-4 px-2 w-full h-full", rest.class || ""]}
  >
    {@render children()}
  </button>
</div>
