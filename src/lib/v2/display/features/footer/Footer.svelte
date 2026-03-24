<script>
  import ButtonMainSubmit from "$display/features/footer/ButtonMainSubmit.svelte";
  import ButtonNavbar from "./ButtonNavbar.svelte";
  import CategoryFilter from "./CategoryFilter.svelte";
  import Hotbar from "$display/features/footer/Hotbar.svelte";
  import { page } from "$app/state";

</script>

<nav class="shadow-t-sm">
  {#if page.data.is_home}
    <Hotbar />
  {/if}

  {#if !page.data.is_task_page}
    <div class="relative bg-surface flex gap-2 p-4 z-10 border-t border-default justify-between">
      <ButtonNavbar />

      {#if page.data.is_home}
        <CategoryFilter />
      {/if}

      <ButtonMainSubmit />
    </div>
  {/if}
</nav>
