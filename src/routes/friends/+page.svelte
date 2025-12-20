<script>
  import { Notify } from "$lib/services/notifications/notifications";
  import { getUsersContext } from "$lib/contexts/users.svelte";
  import { CardInvite } from "$lib/components/element/card";
  import { backHandler } from "$lib/BackHandler.svelte";
  import { t } from "$lib/services/language.svelte";
  import CardFriend from "./CardFriend.svelte";
  import { user } from "$lib/base/user.svelte";
  import { BACK_BUTTON_FUNCTION } from "$lib";
  import { Offline, Check, Loading } from "$lib/icon";
  import { onMount, untrack } from "svelte";
  import { OnlineDB } from "$lib/OnlineDB";
  import { Alert } from "$lib/core/alert";
  import { goto } from "$app/navigation";
  import { DB } from "$lib/DB";

  const usersContext = getUsersContext();
  let has_checked = false;

  const invites = $derived(DB.Invite.invites);
  const me = $derived(user.email_address ? usersContext.getUserByEmail(user.email_address) : null);
  const is_offline = $derived(typeof navigator !== "undefined" && !navigator.onLine);

  $effect(() => {
    // Verban toegang as Vriende funksie nie geaktiveer is nie.
    if (user.is_loading) return;

    untrack(async () => {
      if (has_checked) return;
      has_checked = true;

      if (user.is_logged_in) {
        if (!user.is_friends_enabled) goto(`/plus`);
        return;
      }

      const result = await user.signIn();
      if (!result.success) {
        if (result.error_message === "USER_CANCELED") {
          return goto(`/plus`);
        }

        if (result.error_message !== "U is vanlyn") {
          Alert.error(result.error_message || t("something_went_wrong"));
          return goto(`/plus`);
        }
      }
    });
  });

  onMount(() => {
    const token = (BACK_BUTTON_FUNCTION.value = backHandler.register(async () => {
      await goto(`/`);
    }, -1));

    return () => backHandler.unregister(token);
  });

  /**
   * @param {Invite} invite
   */
  async function acceptInvite(invite) {
    try {
      const email_address = user.email_address;
      if (!email_address) return;

      DB.Invite.remove(invite.id);
      const promises = [
        // Skep die Vriend
        OnlineDB.User.readMany({
          filters: [{ field: "email_address", operator: "==", value: invite.from_email_address }],
        }).then(async (result) => {
          if (!result?.length) throw new Error("Fout met gebruiker lees");

          const online_user = result[0];
          await DB.User.create({
            email_address: online_user.email_address,
            avatar: online_user.avatar,
            name: online_user.name,
            uid: online_user.id,
            is_pending: false,
          });
        }),
        // Aanvaar die uitnodiging aanlyn
        updateAcceptedInvite(invite),
        // Stuur kennisgewing aan die uitnodiger
        Notify.Push.sendTemplate({
          type: "friend_request_accepted",
          data: {
            sender_name: user.name,
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

{#if !user.is_logged_in}
  {#if is_offline}
    <!-- A nice offline message or UI can be placed here -->
    <div class="text-center py-8">
      <!-- Offline icon here -->
       <Offline class="text-4xl mx-auto mb-2 opacity-50" />
      <p>{t("offline")}</p>
    </div>
  {:else}
    <div class="text-center py-8">
      <Loading class="text-4xl mx-auto mb-2 opacity-50" />
      <p>{t("loading")}</p>
    </div>
  {/if}
{:else if user.is_friends_enabled}
  <div class="space-y-2">
    {#each invites as invite (invite.id)}
      {#if invite.to_email_address === user.email_address}
        <CardInvite {invite} onaccept={() => acceptInvite(invite)} ondecline={() => declineInvite(invite)} />
      {/if}
    {/each}

    {#if me}
      <CardFriend user={me} />
    {/if}

    {#each usersContext.users as _user}
      {#if user.email_address !== _user.email_address}
        <CardFriend user={_user} />
      {/if}
    {:else}
      <div class="text-center py-8">
        <Check class="text-4xl mx-auto mb-2 opacity-50" />
        <p>{t("no_friends_yet")}</p>
        <p class="text-sm mt-1">{t("accepted_friends_appear_here")}</p>
      </div>
    {/each}
  </div>
{:else if typeof navigator !== "undefined" && !navigator.onLine}
  <div class="text-center py-8">
    <Loading class="text-4xl mx-auto mb-2 opacity-50" />
    <p>{t("offline")}</p>
  </div>
{/if}
