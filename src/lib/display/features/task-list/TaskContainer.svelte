<script>
  import { longpress } from "$logic/long-press";
  import { taskIn, taskOut } from "./task-transitions";

  const { children, onlongpress, ...rest } = $props();
</script>

<div class="relative min-h-10 rounded-lg" out:taskOut|global in:taskIn|global>
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

