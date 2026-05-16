<script>
  import { fly, slide } from "svelte/transition";
  import Icon from "$display/comps/Icon.svelte";
  import Api from "$logic/api";
  import toast from "$display/toast/toast.svelte";
  import t from "$display/translate";

  /**
   * @typedef {Object} Props
   * @property {string} id
   * @property {string} other_email
   * @property {"pending" | "accepted" | "rejected" | "cancelled"} status
   * @property {boolean} is_incoming
   */

  /** @type {Props} */
  const { id, other_email, status, is_incoming } = $props();

  let is_loading = $state(false);

  /** @param {"accept" | "reject" | "cancel"} action */
  async function handleAction(action) {
    is_loading = true;

    let result;
    if (action === "accept") result = await Api.invites.accept(id);
    else if (action === "reject") result = await Api.invites.reject(id);
    else result = await Api.invites.cancel(id);

    is_loading = false;
    if (!result.ok) toast.error(result.error);
  }

  const status_label = {
    pending: t("pending"),
    accepted: t("accepted"),
    rejected: t("rejected"),
    cancelled: t("cancelled"),
  };

  const status_class = {
    pending: "text-warning",
    accepted: "text-success",
    rejected: "text-error",
    cancelled: "text-muted",
  };
</script>

<div in:slide out:fly={{ x: 100 }} class="bg-surface rounded-lg px-4 py-3 flex flex-col gap-2">
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-3 min-w-0">
      <div class="rounded-full p-2 bg-card shrink-0">
        <Icon name="user" class="w-5 h-5" />
      </div>
      <div class="min-w-0">
        <p class="font-semibold truncate text-sm">{other_email}</p>
        <p class="text-xs {status_class[status]}">
          {is_incoming ? t("invite_received") : t("invite_sent")} · {status_label[status]}
        </p>
      </div>
    </div>

    {#if status === "pending"}
      {#if is_incoming}
        <div class="flex gap-2 shrink-0">
          <button
            type="button"
            disabled={is_loading}
            onclick={() => handleAction("accept")}
            class="rounded-md bg-primary px-3 py-1.5 text-sm text-white font-medium disabled:opacity-50"
          >
            {t("accept")}
          </button>
          <button
            type="button"
            disabled={is_loading}
            onclick={() => handleAction("reject")}
            class="rounded-md border border-default px-3 py-1.5 text-sm font-medium disabled:opacity-50"
          >
            {t("reject")}
          </button>
        </div>
      {:else}
        <button
          type="button"
          disabled={is_loading}
          onclick={() => handleAction("cancel")}
          class="rounded-md border border-default px-3 py-1.5 text-sm font-medium disabled:opacity-50"
        >
          {t("cancel")}
        </button>
      {/if}
    {/if}
  </div>
</div>
