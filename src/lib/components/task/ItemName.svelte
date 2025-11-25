<script>
  import { More } from "$lib/icon";
  import { t } from "$lib/services/language.svelte";

  const { name, completed = false, tick_animation, description = "" } = $props();
</script>

<div
  class:opacity-50={!name}
  class="ml-10 mr-6 flex gap-1 items-center text-left font-semibold my-auto relative break-all"
>
  <span class="my-1" class:line-through={tick_animation || completed}>{name || t("no_description")}</span>
  {#if description && description.trim()}
    <More />
  {/if}
</div>
