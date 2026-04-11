<script>
  import { goto } from "$app/navigation";
  import { BACK_BUTTON_FUNCTION } from "$lib";
  import { backHandler } from "$logic/navigation";
  import { onMount } from "svelte";

  onMount(() => {
    const token = backHandler.register(() => goto(`/`), -1);
    BACK_BUTTON_FUNCTION.value = token;
    return () => backHandler.unregister(token);
  });
</script>

Dit kom binnekort
