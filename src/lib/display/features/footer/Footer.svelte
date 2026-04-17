<script>
  import ButtonMainSubmit from "$display/features/footer/ButtonMainSubmit.svelte";
  import ButtonNavbar from "./ButtonNavbar.svelte";
  import CategoryFilter from "./CategoryFilter.svelte";
  import Hotbar from "$display/features/footer/Hotbar.svelte";
  import { page } from "$app/state";
  import Icon from "$display/comps/Icon.svelte";
  import t from "$display/translate";
</script>

<ButtonMainSubmit class="mb-4 mr-4" />

<nav class="shadow-t-sm">
  {#if page.data.is_home}
    <Hotbar />
  {/if}

  {#if !page.data.is_task_page}
    <div
      class="relative bg-surface grid grid-cols-3 gap-2 z-10 py-1 border-t border-default justify-between"
      style="padding-bottom: env(safe-area-inset-bottom);"
    >
      <a
        href="/"
        draggable="false"
        class="flex flex-col font-medium justify-center items-center h-full w-fit mx-auto group px-2"
      >
        <div class:bg-card={page.url.pathname === "/"} class="py-1 px-4 my-1 rounded-2xl group-hover:bg-card transition-colors">
          <Icon name="users" class="w-5 h-5 mb-1" />
        </div>
        <span>{t('all_tasks')}</span>
      </a>

      <a
        href="/groups"
        draggable="false"
        class="flex flex-col font-medium justify-center items-center h-full w-fit mx-auto group px-2"
      >
        <div class:bg-card={page.url.pathname === "/groups"} class="py-1 px-4 my-1 rounded-2xl group-hover:bg-card transition-colors">
          <Icon name="users" class="w-5 h-5 mb-1" />
        </div>
        <span>{t('groups')}</span>
      </a>

      <a
        href="/contacts"
        draggable="false"
        class="flex flex-col font-medium justify-center items-center h-full w-fit mx-auto group px-2"
      >
        <div class:bg-card={page.url.pathname === "/contacts"} class="py-1 px-4 my-1 rounded-2xl group-hover:bg-card transition-colors">
          <Icon name="users" class="w-5 h-5 mb-1" />
        </div>
        <span>{t('contact_list')}</span>
      </a>
    </div>
  {/if}
</nav>
