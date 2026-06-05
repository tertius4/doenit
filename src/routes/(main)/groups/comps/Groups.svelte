<script>
  import Icon from "$display/comps/Icon.svelte";
  import CardGroup from "$display/features/groups/CardGroup.svelte";
  import t from "$display/translate";
  import View from "$display/view";
  import { onMount } from "svelte";

  /** @type {AL.GroupListItem[]} */
  let groups = $state([]);

  onMount(View.groups.getList(groups));
</script>

<div class="flex flex-col space-y-2 pt-2">
  {#each groups as group (group.id)}
    <CardGroup
      id={group.id}
      name={group.name}
      description={group.description}
      owner_id={group.owner_id}
      task_count={group.task_count}
      members={group.members}
    />
  {:else}
    <div class="flex flex-col items-center justify-center gap-4 pt-16 text-center">
      <Icon name="users" size={48} class="text-muted opacity-40" />
      <p class="text-muted">{t("no_groups_yet")}</p>
    </div>
  {/each}
</div>
