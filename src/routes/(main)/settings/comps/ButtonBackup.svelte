<script>
  import { mount, unmount } from "svelte";
  import t from "$display/translate";
  import Icon from "$display/comps/Icon.svelte";
  import ModalBackup from "./ModalBackup.svelte";

  /**
   * @typedef {Object} Props
   * @prop {boolean} [is_loading=false] - Indicates if a backup is being created.
   * @prop {(photos: boolean) => Promise<void>} onclick - Called with whether photos should be included.
   */

  /** @type {Props & Record<string, any>} */
  let { is_loading = false, onclick, ...rest } = $props();

  function openModal() {
    const component = mount(ModalBackup, {
      target: document.body,
      props: { onconfirm: onclick, onclose: () => unmount(component) },
    });
  }
</script>

<button
  {...rest}
  class={[
    "p-2 rounded-lg text-alt grid grid-cols-[min-content_auto] gap-2 items-center min-h-12 w-full text-start",
    is_loading && "bg-secondary-700",
    !is_loading && "bg-secondary-500 hover:bg-secondary-600",
    rest.class || "",
  ]}
  type="button"
  disabled={is_loading}
  onclick={openModal}
>
  <Icon name={is_loading ? "loading" : "download-cloud"} class="text-3xl mx-1 my-auto" />
  <p class="font-medium">{is_loading ? t("backup_in_progress") : t("backup_now")}</p>
</button>
