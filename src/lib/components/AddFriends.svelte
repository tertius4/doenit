<script>
  import { t } from "$lib/services/language.svelte";
  import InputText from "./element/input/InputText.svelte";
  import { slide } from "svelte/transition";
  import Button from "./element/button/Button.svelte";
  import { Plus, UserPlus } from "$lib/icon";
  import { isValidEmail, normalize } from "$lib";
  import user from "$lib/core/user.svelte";
  import Loading from "$lib/icon/Loading.svelte";
  import { OnlineDB } from "$lib/OnlineDB";
  import { DB } from "$lib/DB";
  import { Alert } from "$lib/core/alert";
  import { Notify } from "$lib/services/notifications/notifications";

  let open = $state(false);
  let friend_email = $state("");
  let error_message = $state("");
  let success_message = $state("");
  let is_loading = $state(false);

  async function sendInvite() {
    if (!user.value) {
      error_message = t("log_in_first");
      return;
    }

    if (!friend_email.trim()) {
      error_message = t("required_field");
      return;
    }

    // Moet nie invoer verander nie.
    let email = normalize(friend_email);
    if (!email.includes("@")) {
      email += "@gmail.com";
    }

    if (!isValidEmail(email)) {
      error_message = t("invalid_email");
      return;
    }

    // Check if user is trying to invite themselves
    // if (user.value.email === friend_email) {
    //   error_message = t("cannot_invite_yourself");
    //   return;
    // }

    is_loading = true;
    error_message = "";
    success_message = "";

    try {
      const room = await DB.Room.create({
        name: email,
        pending: true,
        users: [
          { email: user.value.email, pending: false },
          { email, pending: true },
        ],
      });
      const result = await OnlineDB.Invite.create({
        sender_name: user.value.name,
        from_email_address: user.value.email,
        to_email_address: email,
        status: "pending",
        room_id: room.id,
      });

      await Notify.Push.sendTemplate({
        type: "friend_request",
        data: {
          sender_name: user.value.name,
        },
        email_address: [email],
      });

      if (!result.success) {
        Alert.error(result.error_message);
      }
    } catch (error) {
      console.error("Error sending invite:", error);
      error_message = t("add_friend_error");
    }

    is_loading = false;
    handleClose();
  }

  function handleClose() {
    open = false;
    friend_email = "";
    error_message = "";
    success_message = "";
  }

  /**
   * Handle keyboard events
   * @param {KeyboardEvent} event
   */
  function handleKeydown(event) {
    if (event.key === "Escape") {
      handleClose();
    } else if (event.key === "Enter" && !is_loading && friend_email.trim()) {
      sendInvite();
    }
  }
</script>

{#if !!user}
  <button
    class={{
      "flex gap-1 w-15 rounded-full h-15 justify-center items-center px-4 py-2": true,
      "bg-primary text-alt": !open,
      "opacity-70 bg-card": open,
    }}
    type="button"
    disabled={open}
    onclick={() => (open = true)}
  >
    <UserPlus class="text-xl" />
  </button>
{/if}

{#if open}
  <div
    class="absolute bottom-[92px] left-0 bg-page border-y border-default rounded-t-lg p-4 flex gap-2 w-full"
    transition:slide
    onkeydown={handleKeydown}
    role="dialog"
    aria-modal="true"
    aria-label={t("connect_with_friend")}
    tabindex="-1"
  >
    <div class="flex flex-col w-full gap-2">
      <div class="flex justify-between items-center">
        <span class="font-medium">{t("connect_with_friend")}</span>
        <button type="button" onclick={handleClose} aria-label={t("close")} class="p-2">
          <Plus class="rotate-45 text-lg" />
        </button>
      </div>

      <div class="relative">
        <InputText
          bind:value={friend_email}
          placeholder={t("enter_friend_email")}
          type="email"
          oninput={() => {
            friend_email = normalize(friend_email);
            error_message = "";
          }}
          class={"pr-31" + (error_message ? " border-error! bg-error/20! placeholder:text-error" : "")}
          focus_on_mount
        />
        <div
          class="bg-surface border border-default m-0.5 absolute bottom-1 right-1 flex items-center px-3 top-1 pointer-events-none rounded-lg"
        >
          <span>@gmail.com</span>
        </div>
      </div>

      {#if error_message && !!friend_email?.length}
        <div class="text-error text-sm mt-1 text-right w-full" transition:slide>
          <span>{error_message}</span>
        </div>
      {/if}

      {#if success_message}
        <div class="text-success text-sm mt-1 text-right w-full" transition:slide>
          <span>{success_message}</span>
        </div>
      {/if}

      <Button
        class="bg-primary border-none text-alt disabled:opacity-70"
        type="button"
        onclick={sendInvite}
        disabled={is_loading}
      >
        {#if is_loading}
          <Loading />
          <span class="font-semibold">{t("sending")}</span>
        {:else}
          <UserPlus class="text-lg mr-1" />
          <span class="font-semibold">{t("send_invite")}</span>
        {/if}
      </Button>

      {#if !user}
        <div class="text-orange-500 text-xs text-center">
          {t("log_in_first")}
        </div>
      {/if}
    </div>
  </div>
{/if}
