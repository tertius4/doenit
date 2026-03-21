<script>
  import Slider from "$lib/components/Slider.svelte";
  import { t } from "$lib/services/language.svelte";
  import { untrack } from "svelte";

  /**
   * @typedef {Object} Props
   * @property {Task['repeat_interval']} interval - The current value of the repeat option
   */

  /** @type {Props} */
  let { interval = $bindable() } = $props();

  let temp_interval = $state(
    {
      daily: t("days"),
      weekly: t("weeks"),
      monthly: t("months"),
      yearly: t("years"),
    }[interval],
  );

  /** @type {Record<string, string>} */
  const REVERSE_INTERVAL_MAP = $derived({
    [t("days")]: "daily",
    [t("weeks")]: "weekly",
    [t("months")]: "monthly",
    [t("years")]: "yearly",
  });

  /** @type {string[]} */
  const interval_options = $derived([t("days"), t("weeks"), t("months"), t("years")]);

  $effect(() => {
    temp_interval;

    untrack(() => {
      interval = REVERSE_INTERVAL_MAP[temp_interval] || "";
    });
  });
</script>

<Slider options={interval_options} bind:value={temp_interval} />
