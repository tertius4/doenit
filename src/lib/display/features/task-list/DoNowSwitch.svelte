<script lang="ts">
  import Switch from "$display/comps/input/Switch.svelte";
  import { context } from "$logic/context.svelte";
  import toast from "$display/toast/toast.svelte";
  import t from "$display/translate";
  import Api from "$logic/api";

  interface Props {
    count: number;
  }

  const { count }: Props = $props();

  const options = $derived([
    { value: "now", label: t("do_now_count", { count }) },
    { value: "all", label: t("all") },
  ]);

  async function handleChange(mode: string) {
    const isHomeMode = (mode: string): mode is HomeMode => ["now", "all"].includes(mode);
    if (!isHomeMode(mode)) return;

    const result = await Api.settings.setHomeMode(mode);
    if (!result.ok) toast.error(result.error);
  }
</script>

<Switch {options} value={context.home_mode} onchange={handleChange} />
