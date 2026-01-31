<script>
  import { t } from "$lib/services/language.svelte";
  import InputText from "./element/input/InputText.svelte";
  import { slide } from "svelte/transition";
  import Button from "./element/button/Button.svelte";
  import Icon from "$lib/components/element/Icon.svelte";
  import { isValidEmail, normalize } from "$lib";
  import { user } from "$lib/base/user.svelte";
  import { OnlineDB } from "$lib/OnlineDB";
  import { DB } from "$lib/DB";
  import { Alert } from "$lib/core/alert";
  import { Notify } from "$lib/services/notifications/notifications";
  import Drawer from "./element/Drawer.svelte";
  import { Share as CapacitorShare } from "@capacitor/share";

  let open = $state(false);
  let friend_email = $state("");
  let error_message = $state("");
  let success_message = $state("");
  let is_loading = $state(false);
  let user_not_found = $state(false);
  let searched_email = $state("");

  async function sendInvite() {
    try {
      is_loading = true;
      error_message = "";
      success_message = "";
      user_not_found = false;

      if (!user.is_logged_in) throw t("log_in_first");
      if (!friend_email.trim()) throw t("required_field");

      // Moet nie invoer verander nie.
      let email = normalize(friend_email);
      if (!email.includes("@")) {
        email += "@gmail.com";
      }
      if (!isValidEmail(email)) throw t("invalid_email");

      // Check if user is trying to invite themselves
      // if (user.email_address === email) {
      //   error_message = t("cannot_invite_yourself");
      //   return;
      // }

      const [searched_user] = await OnlineDB.User.readMany({
        filters: [{ field: "email_address", operator: "==", value: email }],
        limit: 1,
      });

      if (!searched_user) {
        user_not_found = true;
        searched_email = email;
        is_loading = false;
        return;
      }

      await DB.User.create({
        name: searched_user.name,
        is_pending: true,
        email_address: searched_user.email_address,
        avatar: searched_user.avatar,
        uid: searched_user.id,
      });
      const result = await OnlineDB.Invite.create({
        sender_name: user.name ?? "",
        from_email_address: user.email_address ?? "",
        to_email_address: email,
        status: "pending",
      });

      await Notify.Push.sendTemplate({
        type: "friend_request",
        data: {
          sender_name: user.name,
        },
        email_address: [email],
      });

      if (!result.success) {
        Alert.error(result.error_message);
      }

      is_loading = false;
      handleClose();
    } catch (error) {
      is_loading = false;
      error_message = error instanceof Error ? error.message : String(error);
    }
  }

  async function shareApp() {
    const appUrl = "https://tertius4.github.io/doenit";
    const shareText = t("share_app_message", { name: user.name || t("someone") });

    try {
      // TODO: Make the share generic
      await CapacitorShare.share({
        title: "Doenit",
        text: shareText,
        url: appUrl,
        dialogTitle: t("share_app"),
      });

      success_message = t("shared_successfully");
      user_not_found = false;
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (error) {
      console.error("Error sharing:", error);
      // Try clipboard as fallback
      try {
        await navigator.clipboard.writeText(appUrl);
        success_message = t("link_copied");
        setTimeout(() => {
          handleClose();
        }, 1500);
      } catch (clipboardError) {
        error_message = t("share_failed");
      }
    }
  }

  function handleClose() {
    open = false;
    friend_email = "";
    error_message = "";
    success_message = "";
    user_not_found = false;
    searched_email = "";
  }
</script>

{#if !!user.is_friends_enabled}
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
    <Icon name="user-plus" class="text-xl" />
  </button>
{/if}

<Drawer bind:is_open={open} onclose={handleClose}>
  <div class="flex flex-col w-full gap-2 p-4">
    <div class="flex justify-between items-center">
      <span class="font-medium">{t("connect_with_friend")}</span>
      <button type="button" onclick={handleClose} aria-label={t("close")} class="p-2">
        <Icon name="plus" class="rotate-45 text-lg" />
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
      <div class="text-error text-sm text-right w-full" transition:slide>
        <span>{error_message}</span>
      </div>
    {/if}

    {#if success_message}
      <div class="text-success text-sm text-right w-full" transition:slide>
        <span>{success_message}</span>
      </div>
    {/if}

    {#if user_not_found}
      <div class="bg-surface border border-default rounded-lg p-4 flex flex-col gap-3" transition:slide>
        <div class="text-sm text-center">
          <p class="font-medium mb-1">{t("user_not_found")}</p>
          <p class="text-muted text-xs">
            {searched_email}
            {t("is_not_using_app")}
          </p>
        </div>

        <Button class="bg-primary border-none text-alt" type="button" onclick={shareApp}>
          <Icon name="share" class="text-lg mr-1" />
          <span class="font-semibold">{t("share_app")}</span>
        </Button>
      </div>
    {/if}

    <Button
      class="bg-primary border-none text-alt disabled:opacity-70"
      type="button"
      onclick={sendInvite}
      disabled={is_loading || user_not_found}
    >
      {#if is_loading}
        <Icon name="loading" class="animate-spin text-lg mr-1" />
        <span class="font-semibold">{t("sending")}</span>
      {:else}
        <Icon name="user-plus" class="text-lg mr-1" />
        <span class="font-semibold">{t("send_invite")}</span>
      {/if}
    </Button>
  </div>
</Drawer>
