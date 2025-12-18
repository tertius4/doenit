<script>
  import { DateUtil } from "$lib/core/date_util";
  import { Check, Times } from "$lib/icon";
  import { t } from "$lib/services/language.svelte";
  import { slide } from "svelte/transition";

  /**
   * @typedef {Object} Props
   * @property {Invite} invite
   * @property {function(string): void} onaccept
   * @property {function(string): void} ondecline
   */

  /** @type {Props} */
  const { invite, onaccept, ondecline } = $props();

  let processing = $state(false);

  const expires_at = new Date(invite.created_at);
  expires_at.setHours(expires_at.getDate() + 7); // Set expiration to 7 hours from creation

  /**
   * @param {string} created_at
   */
  function formatTimeRemaining(created_at) {
    const expires_at = new Date(created_at);
    expires_at.setDate(expires_at.getDate() + 7); // Expires in 7 Days

    const diffMs = expires_at.getTime() - Date.now();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (diffDays > 0) {
      return t("expires_in_days", { days: diffDays });
    } else if (diffHours > 0) {
      return t("expires_in_hours", { hours: diffHours });
    } else {
      return t("expires_soon");
    }
  }
</script>

<div class="bg-surface rounded-lg flex w-full" transition:slide>
  <button
    class="bg-success text-alt px-4 rounded-l-lg"
    type="button"
    onclick={(e) => onaccept(e)}
    disabled={processing}
    title={t("accept_invite")}
  >
    <Check class="text-lg" />
  </button>

  <div class="flex items-start justify-between w-full p-2">
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2 justify-between mb-1">
        <span class="font-medium">
          {t("from")}: {invite.sender_name}
        </span>
      </div>

      <p class="text-sm mb-1">
        {invite.sender_name}
      </p>

      <p class="text-sm mb-2">
        {t("received_on")}: {DateUtil.format(new Date(invite.created_at), "DD MMM YYYY")}
      </p>

      <p class="text-xs text-muted">
        {formatTimeRemaining(invite.created_at)}
      </p>
    </div>
  </div>

  <button
    class="bg-error text-alt text-lg rounded-r-lg px-4"
    type="button"
    onclick={(e) => ondecline(e)}
    disabled={processing}
    title={t("decline_invite")}
  >
    <Times class="text-xl" />
  </button>
</div>
