<script>
  import Button from "$lib/components/element/button/Button.svelte";
  import CardFriend from "$lib/components/element/card/CardFriend.svelte";
  import Modal from "$lib/components/modal/Modal.svelte";
  import { Alert } from "$lib/core/alert";
  import { Leave } from "$lib/icon";
  import { user as current_user } from "$lib/base/user.svelte";
  import { t } from "$lib/services/language.svelte";

  /**
   * @typedef {Object} Props
   * @property {User} user
   */

  /** @type {Props} */
  const { user } = $props();

  let is_open = $state(false);

  const is_me = $derived(current_user.email_address === user.email_address);

  /**
   * @param {User?} user
   */
  async function handleLeaveUser(user) {
    if (!user) return;

    try {
      const { DB } = await import("$lib/DB");
      await DB.User.delete(user);
      is_open = false;
    } catch (error) {
      const error_message = error instanceof Error ? error.message : String(error);
      Alert.error("Fout met vriend verwyder: " + error_message);
    }
  }
</script>

<CardFriend {user} onclick={() => (is_open = true)} />

<Modal bind:is_open class="flex flex-col items-center justify-center gap-2">
  <img src={user.avatar} alt={t("profile")} class="w-32 h-32 rounded-full mt-2" referrerpolicy="no-referrer" />
  <div class="font-medium mb-4 text-lg">
    {user.name}{is_me ? ` (${t("you")})` : ""}
  </div>

  {#if !is_me}
    {#if user.is_pending}
      <Button class="bg-card" onclick={() => handleLeaveUser(user)}>
        <span>Kanselleer uitnodiging</span>
      </Button>
    {:else}
      <Button class="bg-card" onclick={() => handleLeaveUser(user)}>
        <Leave class="h-full" />
        <span>Verlaat vriend</span>
      </Button>
      <span>Nota: U sal steeds bestaande kategorieë deel.</span>
    {/if}
  {/if}
</Modal>
