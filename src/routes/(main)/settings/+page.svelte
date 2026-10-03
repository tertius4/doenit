<script>
  import About from "./About.svelte";
  // import Backup from "./Backup.svelte";
  import Notifications from "./Notifications.svelte";
  // import DailySummary from "./DailySummary.svelte";
  // import DoenitPlus from "./DoenitPlus.svelte";
  // import AppSettings from "./AppSettings.svelte";
  import Appearance from "./Appearance.svelte";
  import UserDisplay from "./UserDisplay.svelte";
  import { onMount } from "svelte";
  import { backHandler, navHistory } from "$logic/navigation";

  onMount(() => {
    const token = backHandler.register(() => navHistory.back(`/`), -1);
    return () => backHandler.unregister(token);
  });
</script>

<div class="space-y-4">
  <UserDisplay />
  <Appearance />
  <Notifications />
  <!-- <AppSettings /> -->
  <!-- <DoenitPlus /> -->
  <!-- <Backup /> -->
  <About />
</div>
