<script>
  import { displayDateShort } from "$lib";
  import { slide } from "svelte/transition";
  import t from "$display/translate";

  let { date = $bindable() } = $props();
</script>

{#if !date}
  {@const today = new Date()}
  {@const tomorrow = new Date(new Date().setDate(new Date().getDate() + 1))}
  {@const in_a_week = new Date(new Date().setDate(new Date().getDate() + 7))}
  {@const in_a_month = new Date(new Date().setMonth(new Date().getMonth() + 1))}

  <div class="flex gap-2 mt-2" transition:slide>
    <button
      type="button"
      class="bg-card p-1 rounded-lg border border-default w-full text-sm"
      onclick={() => {
        date = today.toLocaleDateString("en-CA");
      }}
    >
      <span>{t("today")}</span>
      <div class="text-muted text-xs">{displayDateShort(today)}</div>
    </button>
    <button
      type="button"
      class="bg-card p-1 rounded-lg border border-default w-full text-sm"
      onclick={() => {
        date = tomorrow.toLocaleDateString("en-CA");
      }}
    >
      {t("tomorrow")}
      <div class="text-muted text-xs">{displayDateShort(tomorrow)}</div>
    </button>
    <button
      type="button"
      class="bg-card p-1 rounded-lg border border-default w-full text-sm"
      onclick={() => {
        date = in_a_week.toLocaleDateString("en-CA");
      }}
    >
      {t("in_a_week")}
      <div class="text-muted text-xs">{displayDateShort(in_a_week)}</div>
    </button>
    <button
      type="button"
      class="bg-card p-1 rounded-lg border border-default w-full text-sm"
      onclick={() => {
        date = in_a_month.toLocaleDateString("en-CA");
      }}
    >
      {t("in_a_month")}
      <div class="text-muted text-xs">{displayDateShort(in_a_month)}</div>
    </button>
  </div>
{/if}
