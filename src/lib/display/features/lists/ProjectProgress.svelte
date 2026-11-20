<script>
  import Icon from "$display/comps/Icon.svelte";
  import DateUtil from "$display/date-util";
  import t from "$display/translate";

  /**
   * A project's progress bar, "2/5" and target date.
   *
   * @typedef {Object} Props
   * @prop {number} done - Completed tasks.
   * @prop {number} open - Open tasks.
   * @prop {string | null} [target_date] - YYYY-MM-DD.
   * @prop {string | null} [completed_at]
   */

  /** @type {Props} */
  const { done, open, target_date = null, completed_at = null } = $props();

  const total = $derived(done + open);
  const percent = $derived(total ? Math.round((done / total) * 100) : 0);
  const is_late = $derived(!!target_date && !completed_at && target_date < DateUtil.format(new Date(), "YYYY-MM-DD"));
</script>

<div class="space-y-1">
  <div class="flex items-center gap-2 text-sm">
    <span class="font-mono font-semibold">{done}/{total}</span>
    {#if completed_at}
      <span class="flex items-center gap-1 text-muted"><Icon name="check" size={14} />{t("project_completed")}</span>
    {:else if target_date}
      <span class={["flex items-center gap-1", is_late ? "text-error" : "text-muted"]}>
        <Icon name="clock" size={14} />
        {DateUtil.format(target_date, "D MMM YYYY")}
      </span>
    {/if}
  </div>
  <div
    class="h-1.5 w-full rounded-full bg-card overflow-hidden"
    role="progressbar"
    aria-valuemin="0"
    aria-valuemax={total}
    aria-valuenow={done}
    aria-label={t("progress")}
  >
    <div class="h-full rounded-full bg-secondary-500 transition-[width]" style="width: {percent}%"></div>
  </div>
</div>
