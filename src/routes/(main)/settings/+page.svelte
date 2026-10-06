<script>
  import About from "./About.svelte";
  import Backup from "./Backup.svelte";
  import Share from "./Share.svelte";
  import Notifications from "./Notifications.svelte";
  import ApiAccess from "./ApiAccess.svelte";
  // import DailySummary from "./DailySummary.svelte";
  // import DoenitPlus from "./DoenitPlus.svelte";
  // import AppSettings from "./AppSettings.svelte";
  import Appearance from "./Appearance.svelte";
  import UserDisplay from "./UserDisplay.svelte";
  import { onMount } from "svelte";
  import { backHandler, navHistory } from "$logic/navigation";
  import { context } from "$logic/context.svelte";

  onMount(() => {
    const token = backHandler.register(() => navHistory.back(`/`), -1);
    return () => backHandler.unregister(token);
  });
</script>

<div class="space-y-4">
  <UserDisplay />
  <Appearance />
  <Notifications />
  {#if context.user}
    <ApiAccess />
  {/if}
  <!-- <AppSettings /> -->
  <!-- <DoenitPlus /> -->
  <Backup />
  <About />
  <Share />
</div>
