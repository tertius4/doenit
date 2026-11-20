<script>
  import InputText from "$display/comps/input/InputText.svelte";
  import InputSwitch from "$display/comps/input/InputSwitch.svelte";
  import DatePicker from "$display/features/edit-task/DatePicker.svelte";
  import { slide } from "svelte/transition";
  import t from "$display/translate";

  /**
   * The fields shared by the create and edit list modals. A list with an end is a project, and only a project has a
   * target date.
   *
   * @typedef {Object} Props
   * @prop {string} [name=""]
   * @prop {string} [description=""]
   * @prop {boolean} [completable=false]
   * @prop {string | null} [target_date=null] - YYYY-MM-DD.
   * @prop {string} [error] - Message to show under the fields.
   * @prop {boolean} [name_invalid=false] - Highlight the name field.
   * @prop {() => *} [onedit] - Called when the user focuses a field again (to clear the error).
   */

  /** @type {Props} */
  let {
    name = $bindable(""),
    description = $bindable(""),
    completable = $bindable(false),
    target_date = $bindable(null),
    error = "",
    name_invalid = false,
    onedit,
  } = $props();
</script>

<InputText
  value={name}
  onchange={(v) => (name = v)}
  maxlength="100"
  placeholder={t("list_name")}
  focus_on_mount
  onfocus={onedit}
  aria-invalid={name_invalid}
  class={{ "placeholder:text-error! border-error! bg-error/20!": name_invalid }}
/>

<textarea
  bind:value={description}
  maxlength="250"
  placeholder={t("list_description")}
  rows="3"
  onfocus={onedit}
  class="bg-card border border-default p-2 w-full rounded-lg placeholder:text-muted outline-none focus:ring-1 ring-primary resize-none"
></textarea>

<div class="flex items-center gap-3">
  <div class="flex-1 flex flex-col">
    <span class="font-semibold">{t("list_has_end")}</span>
    <span class="text-sm text-muted">{t("list_has_end_hint")}</span>
  </div>
  <InputSwitch
    value={completable}
    aria-label={t("list_has_end")}
    onchange={(value) => {
      completable = value;
      if (!value) target_date = null;
    }}
  />
</div>

{#if completable}
  <div class="space-y-1" transition:slide>
    <span class="font-semibold">{t("target_date")}</span>
    <span class="text-sm text-muted">({t("optional")})</span>
    <DatePicker single bind:start={() => target_date ?? "", (value) => (target_date = value || null)} />
  </div>
{/if}

{#if error}
  <p class="text-sm text-error" role="alert">{error}</p>
{/if}
