<script>
  import Switch from "$display/comps/input/Switch.svelte";
  import { context } from "$logic/context.svelte";
  import toast from "$display/toast/toast.svelte";
  import t from "$display/translate";
  import Api from "$logic/api";

  /**
   * @typedef {Object} Props
   * @prop {number} count - How many of the tasks are applicable right now.
   */

  /** @type {Props} */
  const { count } = $props();

  const options = $derived([
    { value: "now", label: t("do_now_count", { count }) },
    { value: "all", label: t("all") },
  ]);

  /** @param {string} mode */
  async function handleChange(mode) {
    const result = await Api.settings.setHomeMode(/** @type {DB.HomeMode} */ (mode));
    if (!result.ok) toast.error(result.error);
  }
</script>

<Switch {options} value={context.home_mode} onchange={handleChange} />
