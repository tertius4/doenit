<script>
  import { mount, unmount } from "svelte";
  import t from "$display/translate";
  import Icon from "$display/comps/Icon.svelte";
  import ModalRestoreConfirm from "./ModalRestoreConfirm.svelte";
  import toast from "$display/toast/toast.svelte";
  import { FilePicker } from "@capawesome/capacitor-file-picker";

  /**
   * @typedef {Object} Props
   * @prop {boolean} [is_loading=false] - Indicates if a restore is running.
   * @prop {(base64: string) => Promise<void>} onclick - Called with the base64 contents of the chosen backup file once confirmed.
   */

  /** @type {Props & Record<string, any>} */
  let { is_loading = false, onclick, ...rest } = $props();

  async function pickFile() {
    try {
      // Native picker: the WebView cannot reliably read files chosen with <input type="file"> on Android.
      const { files } = await FilePicker.pickFiles({
        types: ["application/zip", "application/x-zip-compressed", "application/octet-stream"],
        limit: 1,
        readData: true,
      });
      const file = files[0];
      const data = file?.data;
      if (!file || !data) return;

      const component = mount(ModalRestoreConfirm, {
        target: document.body,
        props: {
          filename: file.name,
          onconfirm: () => onclick(data),
          onclose: () => unmount(component),
        },
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : JSON.stringify(e);
      if (message.toLowerCase().includes("cancel")) return;
      toast.error(message);
    }
  }
</script>

<button
  {...rest}
  class={[
    "p-2 rounded-lg text-alt grid grid-cols-[min-content_auto] gap-2 items-center min-h-12 w-full text-start",
    is_loading ? "bg-primary/80" : "bg-primary",
    rest.class || "",
  ]}
  type="button"
  disabled={is_loading}
  onclick={pickFile}
>
  <Icon
    name={is_loading ? "loading" : "restore"}
    class={is_loading ? "text-3xl mx-1 my-auto animate-spin" : "text-3xl mx-1 my-auto"}
  />
  <p class="font-medium">{is_loading ? t("restore_in_progress") : t("restore_from_backup")}</p>
</button>
