<script>
  import InputText from "$lib/components/element/input/InputText.svelte";
  import { CardInvite, CardRoom } from "$lib/components/element/card";
  import { Notify } from "$lib/services/notifications/notifications";
  import Button from "$lib/components/element/button/Button.svelte";
  import Modal from "$lib/components/modal/Modal.svelte";
  import { backHandler } from "$lib/BackHandler.svelte";
  import { Check, Leave, Loading } from "$lib/icon";
  import { t } from "$lib/services/language.svelte";
  import { BACK_BUTTON_FUNCTION } from "$lib";
  import { OnlineDB } from "$lib/OnlineDB";
  import user, { signIn } from "$lib/core/user.svelte";
  import { Alert } from "$lib/core/alert";
  import { goto } from "$app/navigation";
  import { onDestroy, onMount, untrack } from "svelte";
  import { DB } from "$lib/DB";

  /** @type {Room[]} */
  let rooms = $state([]);
  /** @type {Room?} */
  let selected_room = null;

  /** @type {Subscription?} */
  let roomsSubscription = null;

  let open = $state(false);
  let room_name = $state("");
  let edit_room_loading = $state(false);

  const invites = $derived(DB.Invite.invites);
  const user_count = $derived(selected_room?.users?.length || 0);

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

  $effect(() => {
    if (!user.value?.is_friends_enabled) return;

    untrack(() => {
      roomsSubscription = DB.Room.subscribe((result) => (rooms = result.sort(sortByPendingAndAlphabetical)), {
        selector: {},
        sort: [{ name: "asc" }],
      });
    });
  });

  onMount(() => {
    const token = (BACK_BUTTON_FUNCTION.value = backHandler.register(async () => {
      await goto(`/`);
    }, -1));

    return () => backHandler.unregister(token);
  });

  onDestroy(() => {
    roomsSubscription?.unsubscribe();
  });

  async function saveRoom() {
    if (!selected_room) return;
    if (!room_name) return;

    selected_room.name = room_name.trim();
    await DB.Room.update(selected_room?.id, selected_room);

    room_name = "";
    open = false;
  }

  /**
   * @param {Room} a
   * @param {Room} b
   */
  function sortByPendingAndAlphabetical(a, b) {
    const a_pending = a.users.some((user) => user.pending);
    const b_pending = b.users.some((user) => user.pending);
    if (a_pending && !b_pending) return -1;
    if (!a_pending && b_pending) return 1;
    return a.name.localeCompare(b.name);
  }

  /**
   * @param {Room} room
   */
  function handleEdit(room) {
    room_name = room.name;
    edit_room_loading = false;
    selected_room = room;
    open = true;
  }

  function handleClose() {
    open = false;
    edit_room_loading = false;
    room_name = "";
  }

  /**
   * @param {Room?} room
   */
  async function handleLeaveRoom(room) {
    try {
      const email_address = user.value?.email;
      if (!email_address) return;

      if (!room) return;
      edit_room_loading = true;

      const email_addresses = [];
      for (const { email, pending } of room.users) {
        if (email && email !== email_address && !pending) {
          email_addresses.push(email);
        }
      }

      const promises = [
        // Verwyder alle uitnodigings aanlyn wat verband hou met hierdie kamer
        OnlineDB.Invite.deleteMany({
          filters: [
            { field: "from_email_address", operator: "==", value: email_address },
            { field: "room_id", operator: "==", value: room.id },
            { field: "status", operator: "==", value: "pending" },
          ],
        }),
        // Ontkoppel take van die kamer
        DB.Task.updateMany({
          filters: { room_id: { $eq: room.id } },
          updates: { room_id: null },
        }),
        // Skrap die kamer
        DB.Room.delete(room.id),
        // Stuur kennisgewing aan oorblywende gebruikers
        Notify.Push.sendTemplate({
          type: "user_left_group",
          data: {
            user_name: user.value?.name,
            room_id: room.id,
          },
          email_address: email_addresses,
        }),
      ];

      await Promise.all(promises);

      // Hierdie invite kan nie geskep word totdat al die ander invites verwyder is nie
      const promises_1 = email_addresses.map(async (email) => {
        await OnlineDB.Invite.create({
          sender_name: user.value?.name ?? "",
          from_email_address: email_address,
          to_email_address: email,
          room_id: room.id,
          status: "left",
        });
      });

      await Promise.all(promises_1);

      handleClose();
    } catch (error) {
      const error_message = error instanceof Error ? error.message : String(error);
      Alert.error("Fout met group verlaat: " + error_message);
    }
  }

  /**
   * @param {Invite} invite
   */
  async function acceptInvite(invite) {
    try {
      const email_address = user.value?.email;
      if (!email_address) return;

      DB.Invite.remove(invite.id);
      const promises = [
        // Skep die Vriend-kamer
        DB.Room.create({
          id: invite.room_id,
          name: invite.sender_name,
          users: [
            { email: email_address, pending: false },
            { email: invite.from_email_address, pending: false },
          ],
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

    {#each rooms as room}
      <CardRoom {...room} onedit={() => handleEdit(room)} />
    {:else}
      <div class="text-center py-8">
        <Check class="text-4xl mx-auto mb-2 opacity-50" />
        <p>{t("no_friends_yet")}</p>
        <p class="text-sm mt-1">{t("accepted_friends_appear_here")}</p>
      </div>
    {/each}
  </div>
{/if}

<Modal bind:is_open={open} onclose={handleClose} onsubmit={saveRoom}>
  <span class="pb-1">{t("choose_room_name")}</span>
  <InputText bind:value={room_name} focus_on_mount placeholder={t("choose_room_name")} disabled={edit_room_loading} />

  <div class="flex gap-2 mt-4">
    <Button
      class="border-0 bg-error! text-alt"
      onclick={() => handleLeaveRoom(selected_room)}
      type="button"
      disabled={edit_room_loading}
    >
      {#if !edit_room_loading}
        {t("leave_friend")}{user_count > 2 ? t("s") : ""}
        <Leave class="h-full" />
      {:else}
        <Loading />
        {t("leave_friend")}{user_count > 2 ? t("s") : ""}
      {/if}
    </Button>

    <button
      class="bg-primary w-full flex gap-1 items-center text-alt px-4 py-2 rounded-lg justify-center"
      type="submit"
      disabled={edit_room_loading}
    >
      <Check class="h-full" />
      <span>{t("save")}</span>
    </button>
  </div>
</Modal>
