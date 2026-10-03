<script>
  import InputText from "$display/comps/input/InputText.svelte";
  import t from "$display/translate";

  /**
   * Name + description fields shared by the create and edit group modals.
   *
   * @typedef {Object} Props
   * @prop {string} [name=""]
   * @prop {string} [description=""]
   * @prop {string} [error] - Message to show under the fields.
   * @prop {boolean} [name_invalid=false] - Highlight the name field.
   * @prop {() => *} [onedit] - Called when the user focuses a field again (to clear the error).
   */

  /** @type {Props} */
  let { name = $bindable(""), description = $bindable(""), error = "", name_invalid = false, onedit } = $props();
</script>

<InputText
  value={name}
  onchange={(v) => (name = v)}
  maxlength="100"
  placeholder={t("enter_group_name")}
  focus_on_mount
  onfocus={onedit}
  aria-invalid={name_invalid}
  class={{ "placeholder:text-error! border-error! bg-error/20!": name_invalid }}
/>

<textarea
  bind:value={description}
  maxlength="250"
  placeholder={t("enter_group_description")}
  rows="3"
  onfocus={onedit}
  class="bg-card border border-default p-2 w-full rounded-lg placeholder:text-muted outline-none focus:ring-1 ring-primary resize-none"
></textarea>

{#if error}
  <p class="text-sm text-error" role="alert">{error}</p>
{/if}
