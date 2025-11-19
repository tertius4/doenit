<script>
  import { Notify } from "$lib/services/notifications/notifications";
  import { CardInvite } from "$lib/components/element/card";
  import { backHandler } from "$lib/BackHandler.svelte";
  import { onDestroy, onMount, untrack } from "svelte";
  import user, { signIn } from "$lib/core/user.svelte";
  import { Check, Leave, Loading } from "$lib/icon";
  import { t } from "$lib/services/language.svelte";
  import { BACK_BUTTON_FUNCTION } from "$lib";
  import { OnlineDB } from "$lib/OnlineDB";
  import { Alert } from "$lib/core/alert";
  import { goto } from "$app/navigation";
  import { DB } from "$lib/DB";
  import CardFriend from "./CardFriend.svelte";

  /** @type {User[]} */
  let users = $state([]);
  let is_open = $state(false);

  /** @type {Subscription?} */
  let usersSubscription = null;
  /** @type {User?} */
  let selected_user = $state(null);

  const invites = $derived(DB.Invite.invites);

  $effect(() => {
    if (!user.value?.is_friends_enabled) return;

    untrack(() => {
      usersSubscription = DB.User.subscribe((result) => (users = result), {
        sort: [{ name: "asc" }],
      });
    });
  });

  $effect(() => {
    // Verban toegang as Vriende funksie nie geaktiveer is nie.

    if (user.is_loading) return;
    if (!user.value?.is_logged_in) {
      untrack(async () => {
        const result = await signIn();
        if (!result.success) {
          if (result.error_message === "USER_CANCELED") {
            return;
          }

          Alert.error(result.error_message || t("something_went_wrong"));
        }

        if (user.value?.is_friends_enabled) return;
        goto(`/plus`);
      });

      return;
    }

    if (user.value?.is_friends_enabled) return;
    goto(`/plus`);
  });

  onMount(() => {
    const token = (BACK_BUTTON_FUNCTION.value = backHandler.register(async () => {
      await goto(`/`);
    }, -1));

    return () => backHandler.unregister(token);
  });

  onDestroy(() => {
    usersSubscription?.unsubscribe();
  });

  /**
   * @param {Invite} invite
   */
  async function acceptInvite(invite) {
    try {
      const email_address = user.value?.email;
      if (!email_address) return;

      DB.Invite.remove(invite.id);
      const promises = [
        // Skep die Vriend
        DB.User.create({
          name: invite.sender_name,
          email_address: invite.from_email_address,
          is_pending: false,
        }),
        // Aanvaar die uitnodiging aanlyn
        updateAcceptedInvite(invite),
        // Stuur kennisgewing aan die uitnodiger
        Notify.Push.sendTemplate({
          type: "friend_request_accepted",
          data: {
            sender_name: user.value?.name,
          },
          email_address: [invite.from_email_address],
        }),
      ];

      await Promise.all(
        promises.map((p) =>
          p.catch((e) => {
            throw e;
          })
        )
      );
    } catch (error) {
      Alert.error("Fout met uitnodiging aanvaar: " + error);
    }
  }

  /**
   * @param {Invite} invite
   */
  async function declineInvite(invite) {
    try {
      DB.Invite.remove(invite.id);
      await OnlineDB.Invite.updateById(invite.id, {
        ...invite,
        status: "declined",
      });
    } catch (error) {
      Alert.error("Fout met uitnodiging verwerp: " + error);
    }
  }

  /**
   *
   * @param {Invite} invite
   */
  async function updateAcceptedInvite(invite) {
    try {
      invite.status = "accepted";
      const result = await OnlineDB.Invite.updateById(invite.id, invite);
      if (!result.success) {
        Alert.error("Fout met uitnodiging opdateer: " + result.error_message);
      }
    } catch (error) {
      Alert.error("Fout met uitnodiging opdateer: " + error);
    }
  }
</script>

{#if !!user.is_loading}
  <div class="text-center py-8">
    <Loading class="text-4xl mx-auto mb-2 opacity-50" />
    <p>{t("loading")}</p>
  </div>
{:else if user.value?.is_friends_enabled}
  <div class="space-y-2">
    {#each invites as invite (invite.id)}
      {#if invite.to_email_address === user.value.email}
        <CardInvite {invite} onaccept={() => acceptInvite(invite)} ondecline={() => declineInvite(invite)} />
      {/if}
    {/each}

    {#each users as user}
      <CardFriend {user} />
    {:else}
      <div class="text-center py-8">
        <Check class="text-4xl mx-auto mb-2 opacity-50" />
        <p>{t("no_friends_yet")}</p>
        <p class="text-sm mt-1">{t("accepted_friends_appear_here")}</p>
      </div>
    {/each}
  </div>
{/if}
