<script>
  import Accordion from "$display/comps/button/Accordion.svelte";
  import InputSwitch from "$display/comps/input/InputSwitch.svelte";
  import toast from "$display/toast/toast.svelte";
  import t from "$display/translate";
  import Api from "$logic/api";
  import { context } from "$logic/context.svelte";
  import { mount, unmount } from "svelte";
  import ModalPersonalSync from "$display/comps/modal/ModalPersonalSync.svelte";

  const enabled = $derived(Api.personal_sync.isEnabled());

  /** @param {boolean} value */
  function toggle(value) {
    if (!value) return save(Api.personal_sync.disable());

    // Turning it on gives up some privacy, so the user has to confirm first.
    const component = mount(ModalPersonalSync, {
      target: document.body,
      props: { onconfirm: () => save(Api.personal_sync.enable()), onclose: () => unmount(component) },
    });
  }

  /** @param {AsyncResult} request */
  async function save(request) {
    const result = await request;
    if (!result.ok) toast.error(result.error);
  }
</script>

<Accordion
  label={t("sync_devices")}
  disabled={!context.user}
  disabled_message={t("sign_in_to_use")}
>
  <div class="space-y-2">
    <div class="flex items-center gap-2">
      <InputSwitch value={enabled} onchange={toggle} />
      <span class="text-sm font-medium">{t("sync_personal_tasks")}</span>
    </div>
    <p class="text-sm text-muted">{t("sync_personal_tasks_info")}</p>
  </div>
</Accordion>
