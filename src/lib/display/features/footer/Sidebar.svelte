<script>
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import Icon from "$display/comps/Icon.svelte";
  import t from "$display/translate";
  import { selected_lists, selected_tasks } from "$display/selected.svelte";
  import { hotbar_lists, startHotbarLists } from "$display/view/hotbar.svelte";

  /**
   * Web desktop navigation. Replaces the footer's hotbar and bottom nav on wide screens: the links on
   * top, the hotbar's lists (with task counts) below them.
   */

  onMount(startHotbarLists);

  const NAV_ITEMS = $derived([
    { icon: "tasks", label: t("all_tasks"), href: "/", active: page.url.pathname === "/" },
    { icon: "categories", label: t("lists"), href: "/lists", active: page.url.pathname.startsWith("/lists") },
    { icon: "contacts", label: t("contact_list"), href: "/contacts", active: page.url.pathname === "/contacts" },
    { icon: "check", label: t("completed_tasks"), href: "/complete", active: page.url.pathname === "/complete" },
  ]);

  /**
   * Toggles a list filter, like a hotbar tag. Lists filter the home list, so go there first.
   * @param {string} id
   */
  function toggle(id) {
    selected_tasks.clear();
    if (selected_lists.has(id)) {
      selected_lists.delete(id);
    } else {
      selected_lists.add(id);
    }
    if (!page.data.is_home) goto("/");
  }
</script>

<aside
  class="hidden lg:flex flex-col gap-0.5 w-64 shrink-0 sticky z-20 top-14 self-start h-[calc(100dvh-3.5rem)] overflow-y-auto bg-surface border-r border-default p-3"
>
  <nav class="flex flex-col gap-0.5">
    {#each NAV_ITEMS as { icon, label, href, active } (href)}
      <a
        {href}
        draggable="false"
        class={{
          "flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors": true,
          "bg-card": active,
          "hover:bg-card": !active,
        }}
      >
        <Icon name={icon} size={20} class="shrink-0" />
        <span class="truncate">{label}</span>
      </a>
    {/each}
  </nav>

  {#if hotbar_lists.length}
    <div class="flex items-center justify-between px-3 pt-5 pb-1">
      <h2 class="text-sm font-semibold text-muted">{t("lists")}</h2>
      <a href="/lists" draggable="false" class="p-1 rounded-md hover:bg-card" aria-label={t("lists")}>
        <Icon name="categories" size={16} />
      </a>
    </div>

    <ul class="flex flex-col gap-0.5">
      {#each hotbar_lists as list (list.id)}
        {@const is_selected = selected_lists.has(list.id)}
        <li>
          <button
            type="button"
            aria-pressed={is_selected}
            class={{
              "w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-left transition-colors": true,
              "bg-secondary-500 text-alt": is_selected,
              "hover:bg-card": !is_selected,
            }}
            onclick={() => toggle(list.id)}
          >
            <span class="truncate min-w-0">{list.name}</span>
            {#if list.task_count != null}
              <span class={{ "shrink-0 text-sm font-mono": true, "text-muted": !is_selected }}>
                {list.task_count}
              </span>
            {/if}
          </button>
        </li>
      {/each}
    </ul>
  {/if}

  <a
    href="/settings"
    draggable="false"
    class={{
      "mt-auto flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors": true,
      "bg-card": page.url.pathname === "/settings",
      "hover:bg-card": page.url.pathname !== "/settings",
    }}
  >
    <Icon name="settings" size={20} class="shrink-0" />
    <span class="truncate">{t("settings")}</span>
  </a>
</aside>
